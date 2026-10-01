SHELL := /bin/bash
export PATH := $(HOME)/tools/node/bin:$(HOME)/tools/go/bin:$(HOME)/tools/bin:$(PATH)

.DEFAULT_GOAL := help

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Code generation -----------------------------------------------------
generate: ## Regenerate Go + TypeScript code from proto files
	buf generate

# --- Backend -------------------------------------------------------------
backend-build: ## Compile the Go backend
	cd backend && go build ./...

backend-run: ## Run the Go backend (requires DATABASE_URL + migrations applied)
	cd backend && go run ./cmd/server

# --- Database / migrations ----------------------------------------------
db-up: ## Start PostgreSQL via Docker Compose
	docker compose up -d db

db-down: ## Stop PostgreSQL
	docker compose down

migrate: ## Apply Atlas migrations (requires DATABASE_URL and a running DB)
	atlas migrate apply --env local

migrate-new: ## Create a new migration from a diff (args: name=...)
	atlas migrate diff $(name) --env local --dev-url docker://postgres/16/dev

# --- Frontend ------------------------------------------------------------
frontend-install: ## Install frontend dependencies
	cd frontend && npm install

frontend-dev: ## Run the Next.js dev server on http://localhost:3000
	cd frontend && npm run dev

frontend-build: ## Build the frontend for production
	cd frontend && npm run build
