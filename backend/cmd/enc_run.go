package main

import (
	"fmt"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

func main() {
	key := "ghtesrefkrksitesfwsjruwhrkwkraeq"
	encrypted, _ := encryption.EncryptDeterministic("admin@schoollinx.com", key)
	fmt.Println(encrypted)
}
