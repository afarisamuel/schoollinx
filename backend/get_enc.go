package main

import (
	"fmt"
	"os"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

func main() {
	os.Setenv("ENCRYPTION_KEY", "ghtesrefkrksitesfwsjruwhrkwkraeq")
	fmt.Println(encryption.EncryptDeterministic("admin@schoollinx.com", ""))
}
