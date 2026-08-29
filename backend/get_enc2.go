package main

import (
	"fmt"
	"os"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

func main() {
	os.Setenv("ENCRYPTION_KEY", "njuases_32_byte_secret_key_fixed")
	fmt.Println(encryption.EncryptDeterministic("admin@schoollinx.com", ""))
}
