.PHONY: build run test lint migrate docker-up docker-down seed-admin gen-keys

# ============================================================================
# BUILD & RUN
# ============================================================================
build:
	cd backend && go build -o bin/server ./cmd/server

run: build
	cd backend && ./bin/server

dev:
	cd backend && GIN_MODE=debug go run ./cmd/server

# ============================================================================
# TESTING
# ============================================================================
test:
	cd backend && go test ./... -v -count=1

test-coverage:
	cd backend && go test ./... -coverprofile=coverage.out
	cd backend && go tool cover -html=coverage.out -o coverage.html
	@echo "Coverage report: backend/coverage.html"

# ============================================================================
# DATABASE
# ============================================================================
migrate:
	@echo "Running migrations..."
	PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -U $(DB_USER) -d $(DB_NAME) -f backend/migrations/001_init.sql
	PGPASSWORD=$(DB_PASSWORD) psql -h $(DB_HOST) -U $(DB_USER) -d $(DB_NAME) -f backend/migrations/002_indexes_admin.sql
	@echo "Migrations complete"

migrate-docker:
	docker compose exec postgres psql -U upay -d upay_gateway -f /docker-entrypoint-initdb.d/001_init.sql

# ============================================================================
# DOCKER
# ============================================================================
docker-up:
	docker compose up -d --build

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f gateway

docker-restart:
	docker compose restart gateway

# ============================================================================
# UTILITIES
# ============================================================================
gen-keys:
	@echo "=== JWT Access Secret ==="
	@openssl rand -hex 64
	@echo ""
	@echo "=== JWT Refresh Secret ==="
	@openssl rand -hex 64
	@echo ""
	@echo "=== Encryption Key (AES-256) ==="
	@openssl rand -hex 32
	@echo ""
	@echo "=== HMAC Secret ==="
	@openssl rand -hex 32

seed-admin:
	@echo "Creating admin user..."
	cd backend && go run ./cmd/seed-admin

lint:
	cd backend && golangci-lint run ./...

clean:
	rm -rf backend/bin backend/coverage.out backend/coverage.html
