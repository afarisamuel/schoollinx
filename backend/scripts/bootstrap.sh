#!/usr/bin/env bash
# ============================================================
# Creates an Ecopower Super Admin account (interactive).
# Mirrors Django's createsuperuser — no Go compilation needed.
#
# Requirements: psql, python3, pip install bcrypt
# Usage:  ./scripts/bootstrap.sh
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---- Load .env (strip Windows \r if present) ----
if [ -f "$BACKEND_DIR/.env" ]; then
  set -a
  source <(sed 's/\r$//' "$BACKEND_DIR/.env")
  set +a
fi

# ---- Parse DB connection from DATABASE_URL ----
DB_URL="${DATABASE_URL:-host=localhost user=postgres password=gentechco dbname=hsm port=5432 sslmode=disable}"

parse_dsn_field() {
  echo "$DB_URL" | grep -oP "${1}=\K[^ ]+" || echo "$2"
}

DB_HOST="$(parse_dsn_field host localhost)"
DB_PORT="$(parse_dsn_field port 5432)"
DB_USER="$(parse_dsn_field user postgres)"
DB_PASS="$(parse_dsn_field password '')"
DB_NAME="$(parse_dsn_field dbname hsm)"

export PGPASSWORD="$DB_PASS"

# ---- Ensure python3 + bcrypt are available ----
if ! command -v python3 &>/dev/null; then
  echo "Error: python3 is required but not found." >&2
  exit 1
fi
pip3 uninstall bcrypt py-bcrypt
python3 -c "import bcrypt" 2>/dev/null || {
  echo "Installing bcrypt Python package..."
  

  pip3 install --quiet bcrypt
}

# ---- Encryption key (must match the Go app) ----
ENC_KEY="${ENCRYPTION_KEY:-njuases_32_byte_secret_key_fixed}"
# Pad or truncate to exactly 32 bytes
ENC_KEY="$(printf '%-32s' "$ENC_KEY" | cut -c1-32)"

# ---- Helper: deterministic AES-256-GCM encrypt (matches Go EncryptDeterministic) ----
encrypt_deterministic() {
  python3 -c "
import hashlib, base64, sys
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

plain = sys.argv[1]
key   = sys.argv[2].encode('utf-8')[:32]

aesgcm = AESGCM(key)
nonce  = hashlib.sha256(plain.encode('utf-8')).digest()[:12]  # GCM nonce = 12 bytes
ct     = aesgcm.encrypt(nonce, plain.encode('utf-8'), None)
# Go's gcm.Seal prepends nonce to ciphertext
print(base64.b64encode(nonce + ct).decode())
" "$1" "$ENC_KEY"
}

# ---- Helper: bcrypt hash (cost 14, matching Go) ----
hash_password() {
  python3 -c "
import bcrypt, sys
pw = sys.argv[1].encode('utf-8')
print(bcrypt.hashpw(pw, bcrypt.gensalt(rounds=14)).decode())
" "$1"
}

# ---- Ensure cryptography package is available ----
python3 -c "from cryptography.hazmat.primitives.ciphers.aead import AESGCM" 2>/dev/null || {
  echo "Installing cryptography Python package..."
  pip3 install --quiet cryptography
}

# ============================================================
#  Interactive Prompts
# ============================================================
echo "============================================"
echo "  Ecopower Super Admin Setup"
echo "============================================"
echo ""

# --- Email ---
while true; do
  read -rp "Email address: " EMAIL
  if [ -z "$EMAIL" ]; then
    echo "Error: Email cannot be blank."
    continue
  fi
  if [[ "$EMAIL" != *"@"*"."* ]]; then
    echo "Error: Enter a valid email address."
    continue
  fi
  break
done

# --- Username ---
read -rp "Username (leave blank to use email): " USERNAME
USERNAME="${USERNAME:-$EMAIL}"

# --- Password ---
while true; do
  read -rsp "Password: " PW1
  echo
  read -rsp "Password (again): " PW2
  echo

  if [ "$PW1" != "$PW2" ]; then
    echo "Error: Your passwords didn't match."
    continue
  fi

  if [ ${#PW1} -lt 8 ]; then
    echo "Error: Password must be at least 8 characters."
    continue
  fi

  # Validate complexity
  VALID=$(python3 -c "
import sys
p = sys.argv[1]
has_upper   = any(c.isupper() for c in p)
has_lower   = any(c.islower() for c in p)
has_digit   = any(c.isdigit() for c in p)
has_special = any(not c.isalnum() for c in p)
print('ok' if all([has_upper, has_lower, has_digit, has_special]) else 'fail')
" "$PW1")

  if [ "$VALID" != "ok" ]; then
    echo "Error: Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
    continue
  fi

  break
done

# ============================================================
#  Create the user
# ============================================================
echo ""
echo "→ Encrypting credentials..."
ENCRYPTED_EMAIL="$(encrypt_deterministic "$EMAIL")"
ENCRYPTED_USERNAME="$(encrypt_deterministic "$USERNAME")"
HASHED_PASSWORD="$(hash_password "$PW1")"

echo "→ Checking database..."

EXISTING=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "SELECT id FROM users WHERE email = '$ENCRYPTED_EMAIL' AND deleted_at IS NULL LIMIT 1;" 2>/dev/null || true)

if [ -n "$EXISTING" ]; then
  read -rp "That email is already taken. Update the existing account's password? (y/N): " CONFIRM
  CONFIRM="$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')"
  if [[ "$CONFIRM" == "y" || "$CONFIRM" == "yes" ]]; then
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
      "UPDATE users SET password = '$HASHED_PASSWORD' WHERE id = '$EXISTING';" >/dev/null
    echo ""
    echo "Superuser password updated successfully."
  else
    echo "Operation cancelled."
    exit 0
  fi
else
  psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c \
    "INSERT INTO users (id, email, username, password, role, created_at, updated_at)
     VALUES (gen_random_uuid(), '$ENCRYPTED_EMAIL', '$ENCRYPTED_USERNAME', '$HASHED_PASSWORD', 'ECOPOWER_ADMIN', NOW(), NOW());" >/dev/null
  echo ""
  echo "Superuser created successfully."
fi
