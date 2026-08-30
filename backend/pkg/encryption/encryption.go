package encryption

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"database/sql/driver"
	"encoding/base64"
	"fmt"
	"io"
	"os"
)

const DefaultKey = "njuases_32_byte_secret_key_fixed"

// getEncryptionKey retrieves the key from environment or returns the default.
func getEncryptionKey() string {
	key := os.Getenv("ENCRYPTION_KEY")
	if key == "" {
		if os.Getenv("ENV") == "production" {
			panic("ENCRYPTION_KEY environment variable is required in production")
		}
		key = DefaultKey
	}
	// Ensure key is ALWAYS exactly 32 bytes for AES-256
	if len(key) < 32 {
		return fmt.Sprintf("%-32s", key)[:32]
	}
	return key[:32]
}

// Encrypt transparently handles AES-GCM encryption of a string.
func Encrypt(plainText string, keyString string) (string, error) {
	if keyString == "" {
		keyString = getEncryptionKey()
	}
	key := []byte(keyString)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	cipherText := gcm.Seal(nonce, nonce, []byte(plainText), nil)
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// Decrypt transparently handles AES-GCM decryption.
func Decrypt(cryptoText string, keyString string) (string, error) {
	if cryptoText == "" {
		return "", nil
	}
	if keyString == "" {
		keyString = getEncryptionKey()
	}
	key := []byte(keyString)

	data, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}

	nonce, cipherText := data[:nonceSize], data[nonceSize:]
	plainText, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		if keyString == getEncryptionKey() && keyString != DefaultKey {
			return Decrypt(cryptoText, DefaultKey)
		}
		return "", err
	}

	return string(plainText), nil
}

// EncryptedString is a custom type for GORM that encrypts/decrypts strings on the fly (non-deterministic).
type EncryptedString string

// DeterministicEncryptedString is for fields that need exact-match searching (like Email/Username).
type DeterministicEncryptedString string

// EncryptDeterministic uses a derived nonce for searchable fields.
func EncryptDeterministic(plainText string, keyString string) (string, error) {
	if keyString == "" {
		keyString = getEncryptionKey()
	}
	key := []byte(keyString)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	// Derive nonce from plaintext to maintain searchability
	hash := sha256.Sum256([]byte(plainText))
	nonce := hash[:gcm.NonceSize()]
	
	// Prepend nonce to ciphertext
	cipherText := gcm.Seal(nonce, nonce, []byte(plainText), nil)
	return base64.StdEncoding.EncodeToString(cipherText), nil
}

// DecryptDeterministic reverses the deterministic encryption for searchable fields.
func DecryptDeterministic(cryptoText string, keyString string) (string, error) {
	if cryptoText == "" {
		return "", nil
	}
	if keyString == "" {
		keyString = getEncryptionKey()
	}
	key := []byte(keyString)
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	data, err := base64.StdEncoding.DecodeString(cryptoText)
	if err != nil {
		return "", err
	}
	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", fmt.Errorf("ciphertext too short")
	}
	nonce, cipherText := data[:nonceSize], data[nonceSize:]
	plainText, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		return "", err
	}
	return string(plainText), nil
}

// DeterministicDecryptedString is a helper that uses the default key to decrypt a deterministic string.
func DeterministicDecryptedString(val string) string {
	decrypted, err := DecryptDeterministic(val, "")
	if err != nil {
		return val // Return original if not a valid encrypted string
	}
	return decrypted
}

func (des *DeterministicEncryptedString) Scan(value interface{}) error {
	if value == nil {
		*des = ""
		return nil
	}
	s, ok := value.(string)
	if !ok {
		// Try byte slice
		b, ok := value.([]byte)
		if !ok {
			return fmt.Errorf("failed to scan DeterministicEncryptedString: invalid type")
		}
		s = string(b)
	}

	if s == "" {
		*des = ""
		return nil
	}

	data, err := base64.StdEncoding.DecodeString(s)
	if err != nil {
		// Fallback for unencrypted data (legacy migration)
		*des = DeterministicEncryptedString(s)
		return nil
	}

	key := getEncryptionKey()
	block, err := aes.NewCipher([]byte(key))
	if err != nil {
		return err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		*des = DeterministicEncryptedString(s)
		return nil
	}
	nonce, cipherText := data[:nonceSize], data[nonceSize:]
	plainText, err := gcm.Open(nil, nonce, cipherText, nil)
	if err != nil {
		// Fallback for non-deterministic or legacy plain text that happened to be valid base64
		*des = DeterministicEncryptedString(s)
		return nil
	}
	*des = DeterministicEncryptedString(plainText)
	return nil
}

func (des DeterministicEncryptedString) Value() (driver.Value, error) {
	if des == "" {
		return nil, nil
	}
	key := getEncryptionKey()
	encrypted, err := EncryptDeterministic(string(des), key)
	if err != nil {
		return nil, err
	}
	return encrypted, nil
}

func (es *EncryptedString) Scan(value interface{}) error {
	if value == nil {
		*es = ""
		return nil
	}
	s, ok := value.(string)
	if !ok {
		// Try byte slice for drivers that return []byte
		b, ok := value.([]byte)
		if !ok {
			return fmt.Errorf("failed to scan EncryptedString: invalid type")
		}
		s = string(b)
	}

	if s == "" {
		*es = ""
		return nil
	}

	key := getEncryptionKey()
	decrypted, err := Decrypt(s, key)
	if err != nil {
		// If decryption fails, it might be unencrypted data (legacy)
		*es = EncryptedString(s)
		return nil
	}
	*es = EncryptedString(decrypted)
	return nil
}

func (es EncryptedString) Value() (driver.Value, error) {
	if es == "" {
		return nil, nil
	}
	key := getEncryptionKey()
	encrypted, err := Encrypt(string(es), key)
	if err != nil {
		return nil, err
	}
	return encrypted, nil
}
