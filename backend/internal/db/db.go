package db

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a PostgreSQL connection pool.
//
// Database migrations are managed with Atlas (see /migrations). Apply them
// before starting the server, e.g.:
//
//	atlas migrate apply --url "$DATABASE_URL" --dir file://migrations
func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}

	// Keep pool sizing conservative for local development.
	cfg.MaxConns = 10
	cfg.MaxConnLifetime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, err
	}

	return pool, nil
}
