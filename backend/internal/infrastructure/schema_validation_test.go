package infrastructure

import (
	"testing"
)

func TestValidateSchemaName(t *testing.T) {
	tests := []struct {
		name    string
		schema  string
		wantErr bool
	}{
		{"Valid plain name", "tenant_school", false},
		{"Valid with numbers", "tenant_school_123", false},
		{"Valid short", "t", false},
		{"Valid max length", "tenant_school_name_that_is_long_but_under_limit_1234567890123", false},
		{"Invalid empty", "", true},
		{"Invalid uppercase", "Tenant_school", true},
		{"Invalid spaces", "tenant school", true},
		{"Invalid dashes", "tenant-school", true},
		{"Invalid SQL injection 1", "public; DROP TABLE users;", true},
		{"Invalid SQL injection 2", "tenant_school\" OR 1=1 --", true},
		{"Invalid starts with number", "1_tenant", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSchemaName(tt.schema)
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateSchemaName(%q) error = %v, wantErr %v", tt.schema, err, tt.wantErr)
			}
		})
	}
}
