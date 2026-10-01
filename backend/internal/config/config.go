package config

import "os"

// Config holds all runtime configuration, sourced from environment variables.
type Config struct {
	DatabaseURL string
	JWTSecret   string
	GRPCPort    string
	HTTPPort    string
}

// Load reads configuration from the environment, applying sensible defaults.
func Load() Config {
	return Config{
		DatabaseURL: getenv("DATABASE_URL", "postgres://komitty:komitty@localhost:5432/komitty?sslmode=disable"),
		JWTSecret:   getenv("JWT_SECRET", "dev-insecure-secret-change-me"),
		GRPCPort:    getenv("GRPC_PORT", "50051"),
		HTTPPort:    getenv("HTTP_PORT", "8080"),
	}
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
