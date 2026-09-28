package domain_test

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/pkg/encryption"
)

func TestCapitalizeName(t *testing.T) {
	tests := []struct {
		input    string
		expected string
	}{
		{"", ""},
		{"   ", ""},
		{"john", "John"},
		{"JOHN", "John"},
		{"jOhN", "John"},
		{"john doe", "John Doe"},
		{"JOHN DOE", "John Doe"},
		{"  kwame   mensah-boateng  ", "Kwame Mensah-Boateng"},
		{"mary-jane watson", "Mary-Jane Watson"},
		{"anne-marie", "Anne-Marie"},
		{"jean-luc picard", "Jean-Luc Picard"},
	}

	for _, tt := range tests {
		t.Run(tt.input, func(t *testing.T) {
			res := domain.CapitalizeName(tt.input)
			assert.Equal(t, tt.expected, res)
		})
	}
}

func TestStudent_CapitalizeNames(t *testing.T) {
	s := &domain.Student{
		FirstName:            encryption.EncryptedString("john"),
		LastName:             encryption.EncryptedString("DOE"),
		OtherName:            encryption.EncryptedString("kwame-kofi"),
		FatherName:           encryption.EncryptedString("samuel doe"),
		MotherName:           encryption.EncryptedString("MARY DOE"),
		GuardianName:         encryption.EncryptedString("uncle bob"),
		EmergencyContactName: encryption.EncryptedString("dr. jane smith"),
		Guardians: []*domain.Guardian{
			{
				FirstName: encryption.EncryptedString("uncle"),
				LastName:  encryption.EncryptedString("bob"),
			},
		},
	}

	s.CapitalizeNames()

	assert.Equal(t, encryption.EncryptedString("John"), s.FirstName)
	assert.Equal(t, encryption.EncryptedString("Doe"), s.LastName)
	assert.Equal(t, encryption.EncryptedString("Kwame-Kofi"), s.OtherName)
	assert.Equal(t, encryption.EncryptedString("Samuel Doe"), s.FatherName)
	assert.Equal(t, encryption.EncryptedString("Mary Doe"), s.MotherName)
	assert.Equal(t, encryption.EncryptedString("Uncle Bob"), s.GuardianName)
	assert.Equal(t, encryption.EncryptedString("Dr. Jane Smith"), s.EmergencyContactName)
	assert.Equal(t, encryption.EncryptedString("Uncle"), s.Guardians[0].FirstName)
	assert.Equal(t, encryption.EncryptedString("Bob"), s.Guardians[0].LastName)
}
