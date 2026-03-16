package utils

import (
	"github.com/flexstack/uuid"
	googleuuid "github.com/google/uuid"
)

// NewID generates a new UUID v7 (time-ordered, PostgreSQL compatible)
func NewID() googleuuid.UUID {
	id := uuid.Must(uuid.NewV7())
	// Convert to google/uuid format for compatibility
	parsed, err := googleuuid.Parse(id.String())
	if err != nil {
		// Fallback to v4 if v7 fails
		return googleuuid.New()
	}
	return parsed
}
