package logger

import (
	"io"
	"os"
	"time"

	"github.com/rs/zerolog"
)

var Log zerolog.Logger

func Init(mode string) {
	var output io.Writer

	if mode == "debug" {
		// Pretty console output for development
		output = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
	} else {
		// JSON output for production (structured, parseable by ELK/Loki/Datadog)
		output = os.Stdout
	}

	zerolog.TimeFieldFormat = time.RFC3339Nano
	zerolog.DurationFieldInteger = true

	Log = zerolog.New(output).
		With().
		Timestamp().
		Str("service", "upay-gateway").
		Logger().
		Level(parseLevel(mode))
}

func parseLevel(mode string) zerolog.Level {
	switch mode {
	case "debug":
		return zerolog.DebugLevel
	case "test":
		return zerolog.WarnLevel
	default:
		return zerolog.InfoLevel
	}
}

// Convenience shortcuts
func Info() *zerolog.Event  { return Log.Info() }
func Warn() *zerolog.Event  { return Log.Warn() }
func Error() *zerolog.Event { return Log.Error() }
func Debug() *zerolog.Event { return Log.Debug() }
func Fatal() *zerolog.Event { return Log.Fatal() }
