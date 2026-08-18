# Makefile
# High School Management System - Backend

.PHONY: run build test clean swagger migrate

# Default target
run:
	@echo "--- Starting NJUASES Backend Server ---"
	go run main.go

# Build the binary
build:
	@echo "--- Building NJUASES Backend Server ---"
	go build -v -o njuases-backend.exe main.go

# Run tests
test:
	@echo "--- Running Backend Tests ---"
	go test -v ./...

# Clean build artifacts
clean:
	@echo "--- Cleaning Build Artifacts ---"
	rm -f njuases-backend.exe

# Regenerate Swagger Documentation
swagger:
	@echo "--- Generating Swagger Documentation ---"
	go run github.com/swaggo/swag/cmd/swag init -g main.go

# Database Migrations
migrate-up:
	@echo "--- Running Migrations (UP) ---"
	go run ./cmd/migrate up

migrate-down:
	@echo "--- Running Migrations (DOWN 1) ---"
	go run ./cmd/migrate down

migrate-version:
	@echo "--- Checking Migration Version ---"
	go run ./cmd/migrate version
