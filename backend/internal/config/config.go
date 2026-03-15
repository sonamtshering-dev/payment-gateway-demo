package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

type Config struct {
	Server   ServerConfig
	Database DatabaseConfig
	Redis    RedisConfig
	JWT      JWTConfig
	Security SecurityConfig
}

type ServerConfig struct {
	Host string
	Port string
	Mode string // debug, release, test
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
	MaxConns int
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
	DB       int
}

type JWTConfig struct {
	AccessSecret    string
	RefreshSecret   string
	AccessExpiry    time.Duration
	RefreshExpiry   time.Duration
}

type SecurityConfig struct {
	EncryptionKey       string
	HMACSecret          string
	TimestampTolerance  time.Duration
	RateLimitPerMinute  int
	PaymentSessionTTL   time.Duration
	MaxTransactionsDay  int
	WebhookTimeout      time.Duration
	WebhookMaxRetries   int
}

func Load() (*Config, error) {
	accessExpiry, _ := strconv.Atoi(getEnv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
	refreshExpiry, _ := strconv.Atoi(getEnv("JWT_REFRESH_EXPIRY_DAYS", "7"))
	rateLimitPerMin, _ := strconv.Atoi(getEnv("RATE_LIMIT_PER_MINUTE", "60"))
	sessionTTL, _ := strconv.Atoi(getEnv("PAYMENT_SESSION_TTL_MINUTES", "15"))
	maxTxnDay, _ := strconv.Atoi(getEnv("MAX_TRANSACTIONS_PER_DAY", "10000"))
	webhookTimeout, _ := strconv.Atoi(getEnv("WEBHOOK_TIMEOUT_SECONDS", "10"))
	webhookRetries, _ := strconv.Atoi(getEnv("WEBHOOK_MAX_RETRIES", "5"))
	timestampTolerance, _ := strconv.Atoi(getEnv("TIMESTAMP_TOLERANCE_SECONDS", "300"))
	redisDB, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))
	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "25"))

	cfg := &Config{
		Server: ServerConfig{
			Host: getEnv("SERVER_HOST", "0.0.0.0"),
			Port: getEnv("SERVER_PORT", "8080"),
			Mode: getEnv("GIN_MODE", "debug"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "upay"),
			Password: getEnv("DB_PASSWORD", ""),
			DBName:   getEnv("DB_NAME", "upay_gateway"),
			SSLMode:  getEnv("DB_SSL_MODE", "require"),
			MaxConns: maxConns,
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
			DB:       redisDB,
		},
		JWT: JWTConfig{
			AccessSecret:  getEnv("JWT_ACCESS_SECRET", ""),
			RefreshSecret: getEnv("JWT_REFRESH_SECRET", ""),
			AccessExpiry:  time.Duration(accessExpiry) * time.Minute,
			RefreshExpiry: time.Duration(refreshExpiry) * 24 * time.Hour,
		},
		Security: SecurityConfig{
			EncryptionKey:      getEnv("ENCRYPTION_KEY", ""),
			HMACSecret:         getEnv("HMAC_SECRET", ""),
			TimestampTolerance: time.Duration(timestampTolerance) * time.Second,
			RateLimitPerMinute: rateLimitPerMin,
			PaymentSessionTTL:  time.Duration(sessionTTL) * time.Minute,
			MaxTransactionsDay: maxTxnDay,
			WebhookTimeout:     time.Duration(webhookTimeout) * time.Second,
			WebhookMaxRetries:  webhookRetries,
		},
	}

	if err := cfg.validate(); err != nil {
		return nil, err
	}

	return cfg, nil
}

func (c *Config) validate() error {
	if c.JWT.AccessSecret == "" {
		return fmt.Errorf("JWT_ACCESS_SECRET is required")
	}
	if c.JWT.RefreshSecret == "" {
		return fmt.Errorf("JWT_REFRESH_SECRET is required")
	}
	if c.Security.EncryptionKey == "" {
		return fmt.Errorf("ENCRYPTION_KEY is required (32 bytes hex)")
	}
	if c.Database.Password == "" {
		return fmt.Errorf("DB_PASSWORD is required")
	}
	return nil
}

func (c *DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%s/%s?sslmode=%s",
		c.User, c.Password, c.Host, c.Port, c.DBName, c.SSLMode,
	)
}

func (c *RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%s", c.Host, c.Port)
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
