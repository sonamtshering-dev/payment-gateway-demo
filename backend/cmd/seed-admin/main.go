package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
	"github.com/upay/gateway/internal/config"
	"github.com/upay/gateway/internal/models"
	"github.com/upay/gateway/internal/repository"
	"github.com/upay/gateway/internal/utils"
)

func main() {
	godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	ctx := context.Background()
	db, err := pgxpool.New(ctx, cfg.Database.DSN())
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	repo := repository.New(db)

	email := os.Getenv("ADMIN_EMAIL")
	if email == "" {
		email = "admin@upay.dev"
	}
	password := os.Getenv("ADMIN_PASSWORD")
	if password == "" {
		password = "admin-change-me-immediately"
	}

	// Check if admin already exists
	existing, _ := repo.GetMerchantByEmail(ctx, email)
	if existing != nil {
		fmt.Printf("Admin already exists: %s\n", email)
		return
	}

	passwordHash, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("Failed to hash password: %v", err)
	}

	apiKey, _ := utils.GenerateAPIKey()
	apiSecret, _ := utils.GenerateAPISecret()
	webhookSecret, _ := utils.GenerateWebhookSecret()

	encryptedSecret, err := utils.Encrypt(apiSecret, cfg.Security.EncryptionKey)
	if err != nil {
		log.Fatalf("Failed to encrypt secret: %v", err)
	}

	admin := &models.Merchant{
		ID:            uuid.New(),
		Name:          "System Admin",
		Email:         email,
		PasswordHash:  passwordHash,
		APIKey:        apiKey,
		APISecret:     encryptedSecret,
		WebhookSecret: webhookSecret,
		IsActive:      true,
		IsAdmin:       true,
		DailyLimit:    999999999999, // effectively unlimited
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	if err := repo.CreateMerchant(ctx, admin); err != nil {
		log.Fatalf("Failed to create admin: %v", err)
	}

	fmt.Println("╔══════════════════════════════════════════╗")
	fmt.Println("║         Admin Created Successfully       ║")
	fmt.Println("╠══════════════════════════════════════════╣")
	fmt.Printf("  Email:      %s\n", email)
	fmt.Printf("  Password:   %s\n", password)
	fmt.Printf("  API Key:    %s\n", apiKey)
	fmt.Printf("  API Secret: %s\n", apiSecret)
	fmt.Println("╠══════════════════════════════════════════╣")
	fmt.Println("  ⚠️  CHANGE THE PASSWORD IMMEDIATELY")
	fmt.Println("  ⚠️  STORE API SECRET SECURELY")
	fmt.Println("╚══════════════════════════════════════════╝")
}
