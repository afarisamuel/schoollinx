# ============================================================
# Creates an Ecopower Super Admin account (interactive).
# Mirrors Django's createsuperuser — no Go compilation needed.
#
# Requirements: psql, python3, pip install bcrypt cryptography
# Usage:  .\scripts\bootstrap.ps1
# ============================================================

$ErrorActionPreference = "Stop"

$ScriptDir  = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendDir = Split-Path -Parent $ScriptDir

# ---- Load .env ----
$EnvFile = Join-Path $BackendDir ".env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.TrimEnd("`r")
        if ($line -match '^\s*([^#][^=]*)=(.*)$') {
            $name  = $Matches[1].Trim()
            $value = $Matches[2].Trim().Trim('"').Trim("'")
            [System.Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# ---- Parse DB connection from DATABASE_URL ----
$DB_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { "host=localhost user=postgres password=gentechco dbname=hsm port=5432 sslmode=disable" }

# Supports both DSN key=value format AND postgres(ql)://user:pass@host:port/dbname URI
if ($DB_URL -match '^postgres(?:ql)?://([^:@]*)(?::([^@]*))?@([^:/]+)(?::(\d+))?/([^?]+)') {
    $DB_USER = if ($Matches[1]) { $Matches[1] } else { "postgres" }
    $DB_PASS = if ($Matches[2]) { $Matches[2] } else { "" }
    $DB_HOST = if ($Matches[3]) { $Matches[3] } else { "localhost" }
    $DB_PORT = if ($Matches[4]) { $Matches[4] } else { "5432" }
    $DB_NAME = if ($Matches[5]) { $Matches[5] } else { "hsm" }
} else {
    # DSN key=value format
    function Get-DSNField([string]$Field, [string]$Default) {
        if ($DB_URL -match "(?:^|\s)${Field}=(\S+)") { return $Matches[1] }
        return $Default
    }
    $DB_HOST = Get-DSNField "host" "localhost"
    $DB_PORT = Get-DSNField "port" "5432"
    $DB_USER = Get-DSNField "user" "postgres"
    $DB_PASS = Get-DSNField "password" ""
    $DB_NAME = Get-DSNField "dbname" "hsm"
}

# If password is still empty, prompt the user
if ([string]::IsNullOrWhiteSpace($DB_PASS)) {
    Write-Host "[DB] Could not read database password from DATABASE_URL."
    $dbSecure = Read-Host "Enter PostgreSQL password for user '$DB_USER'" -AsSecureString
    $DB_PASS  = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
                    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbSecure))
}

$env:PGPASSWORD = $DB_PASS

# ---- Locate psql (searches common Windows install paths) ----
function Find-Psql {
    # Check PATH first
    if (Get-Command psql -ErrorAction SilentlyContinue) { return "psql" }

    # Search common PostgreSQL installation directories
    $pgRoots = @(
        "$env:ProgramFiles\PostgreSQL",
        "${env:ProgramFiles(x86)}\PostgreSQL",
        "C:\PostgreSQL",
        "D:\PostgreSQL"
    )
    foreach ($root in $pgRoots) {
        if (-not (Test-Path $root)) { continue }
        # Iterate versions (e.g. 14, 15, 16, 17) newest first
        $versions = Get-ChildItem $root -Directory | Sort-Object Name -Descending
        foreach ($ver in $versions) {
            $candidate = Join-Path $ver.FullName "bin\psql.exe"
            if (Test-Path $candidate) { return $candidate }
        }
    }
    return $null
}

$Psql = Find-Psql
if (-not $Psql) {
    Write-Error "Error: psql was not found. Install PostgreSQL or add its bin directory to your PATH."
    exit 1
}
Write-Host "Using psql: $Psql"

# ---- Ensure python3 is available (skip Windows Store stubs) ----
function Find-Python {
    foreach ($candidate in @("python", "python3", "py")) {
        $cmd = Get-Command $candidate -ErrorAction SilentlyContinue
        if (-not $cmd) { continue }
        # Actually run it to confirm it's a real interpreter, not a Store stub
        $result = & $candidate -c "import sys; print(sys.version)" 2>&1
        if ($LASTEXITCODE -eq 0 -and $result -notmatch 'not found|Store') {
            return $candidate
        }
    }
    return $null
}

$Python = Find-Python
if (-not $Python) {
    Write-Error "Error: A working Python installation is required but was not found. Please install Python from https://www.python.org/downloads/"
    exit 1
}
Write-Host "Using Python: $Python"

# ---- Ensure bcrypt is installed ----
$null = & $Python -c "import bcrypt" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing bcrypt Python package..."
    & $Python -m pip install --quiet bcrypt
}

# ---- Ensure cryptography is installed ----
$null = & $Python -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing cryptography Python package..."
    & $Python -m pip install --quiet cryptography
}

# ---- Encryption key (must match the Go app) ----
$RawKey = if ($env:ENCRYPTION_KEY) { $env:ENCRYPTION_KEY } else { "njuases_32_byte_secret_key_fixed" }
# Pad or truncate to exactly 32 bytes
$ENC_KEY = $RawKey.PadRight(32).Substring(0, 32)

# ---- Helper: deterministic AES-256-GCM encrypt (matches Go EncryptDeterministic) ----
function Invoke-EncryptDeterministic([string]$PlainText) {
    $pyScript = @"
import hashlib, base64, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

plain = sys.argv[1]
key   = sys.argv[2].encode('utf-8')[:32]

aesgcm = AESGCM(key)
nonce  = hashlib.sha256(plain.encode('utf-8')).digest()[:12]
ct     = aesgcm.encrypt(nonce, plain.encode('utf-8'), None)
print(base64.b64encode(nonce + ct).decode())
"@
    $out = (& $Python -c $pyScript $PlainText $ENC_KEY 2>&1)
    if ($LASTEXITCODE -ne 0) { Write-Error "Encryption failed: $out"; exit 1 }
    return ("$out").Trim()
}

# ---- Helper: bcrypt hash (cost 14, matching Go) ----
function Invoke-HashPassword([string]$Password) {
    $pyScript = @"
import bcrypt, sys
pw = sys.argv[1].encode('utf-8')
print(bcrypt.hashpw(pw, bcrypt.gensalt(rounds=14)).decode())
"@
    $out = (& $Python -c $pyScript $Password 2>&1)
    if ($LASTEXITCODE -ne 0) { Write-Error "Password hashing failed: $out"; exit 1 }
    return ("$out").Trim()
}

# ============================================================
#  Interactive Prompts
# ============================================================
Write-Host "============================================"
Write-Host "  Ecopower Super Admin Setup"
Write-Host "============================================"
Write-Host ""

# --- Email ---
while ($true) {
    $EMAIL = Read-Host "Email address"
    if ([string]::IsNullOrWhiteSpace($EMAIL)) {
        Write-Host "Error: Email cannot be blank."
        continue
    }
    if ($EMAIL -notmatch '^[^@]+@[^@]+\.[^@]+$') {
        Write-Host "Error: Enter a valid email address."
        continue
    }
    break
}

# --- Username ---
$USERNAME = Read-Host "Username (leave blank to use email)"
if ([string]::IsNullOrWhiteSpace($USERNAME)) { $USERNAME = $EMAIL }

# --- Password ---
while ($true) {
    $PW1 = Read-Host "Password" -AsSecureString
    $PW2 = Read-Host "Password (again)" -AsSecureString

    $PW1Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PW1))
    $PW2Plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [Runtime.InteropServices.Marshal]::SecureStringToBSTR($PW2))

    if ($PW1Plain -ne $PW2Plain) {
        Write-Host "Error: Your passwords didn't match."
        continue
    }

    if ($PW1Plain.Length -lt 8) {
        Write-Host "Error: Password must be at least 8 characters."
        continue
    }

    # Validate complexity
    $pyValidate = @"
import sys
p = sys.argv[1]
has_upper   = any(c.isupper() for c in p)
has_lower   = any(c.islower() for c in p)
has_digit   = any(c.isdigit() for c in p)
has_special = any(not c.isalnum() for c in p)
print('ok' if all([has_upper, has_lower, has_digit, has_special]) else 'fail')
"@
    $out = (& $Python -c $pyValidate $PW1Plain 2>&1)
    $VALID = ("$out").Trim()
    if ($VALID -ne "ok") {
        Write-Host "Error: Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        continue
    }

    break
}

# ============================================================
#  Create the user
# ============================================================
Write-Host ""
Write-Host "-> Encrypting credentials..."
$ENCRYPTED_EMAIL    = Invoke-EncryptDeterministic $EMAIL
$ENCRYPTED_USERNAME = Invoke-EncryptDeterministic $USERNAME
$HASHED_PASSWORD    = Invoke-HashPassword $PW1Plain

Write-Host "-> Checking database..."

# Build shared psql connection args (-w = never prompt for password; rely on PGPASSWORD env var)
$psqlConn = @("-h", $DB_HOST, "-p", $DB_PORT, "-U", $DB_USER, "-d", $DB_NAME, "-w")

# Helper: run psql and return output safely (never throws on null)
function Invoke-Psql([string[]]$ExtraArgs) {
    $out = & $Psql @psqlConn @ExtraArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        $errMsg = ("$out").Trim()
        Write-Error "psql failed: $errMsg"
        exit 1
    }
    return ("$out").Trim()
}

$EXISTING = Invoke-Psql @("-tAc", "SELECT id FROM users WHERE email = '$ENCRYPTED_EMAIL' AND deleted_at IS NULL LIMIT 1;")

if (-not [string]::IsNullOrWhiteSpace($EXISTING)) {
    $CONFIRM = Read-Host "That email is already taken. Update the existing account's password? (y/N)"
    if ($CONFIRM -match '^[Yy](es)?$') {
        Invoke-Psql @("-c", "UPDATE users SET password = '$HASHED_PASSWORD' WHERE id = '$EXISTING';") | Out-Null
        Write-Host ""
        Write-Host "Superuser password updated successfully."
    } else {
        Write-Host "Operation cancelled."
        exit 0
    }
} else {
    Invoke-Psql @("-c", "INSERT INTO users (id, email, username, password, role, created_at, updated_at) VALUES (gen_random_uuid(), '$ENCRYPTED_EMAIL', '$ENCRYPTED_USERNAME', '$HASHED_PASSWORD', 'ECOPOWER_ADMIN', NOW(), NOW());") | Out-Null
    Write-Host ""
    Write-Host "Superuser created successfully."
}
