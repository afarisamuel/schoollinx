# run.ps1
# High School Management System - Backend Startup Script

function Start-Server {
    Write-Host "--- Initializing NJUASES Backend Server ---" -ForegroundColor Cyan
    
    # Check for .env file
    if (-not (Test-Path ".env")) {
        Write-Warning "No .env file found. Falling back to default environment variables."
    }

    # Run the server
    Write-Host "Starting server..." -ForegroundColor Green
    go run main.go
}

Start-Server
