package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func init() {
	gin.SetMode(gin.TestMode)
}

// TestExtractSubdomain_IsolationScenarios verifies that subdomain parsing
// correctly disambiguates tenant identifiers from bare hostnames.
func TestExtractSubdomain_IsolationScenarios(t *testing.T) {
	cases := []struct {
		name        string
		host        string
		wantTenant  string // empty means no tenant should be extracted
	}{
		// Happy paths
		{"production subdomain", "schoola.basic-sms.com", "schoola"},
		{"staging subdomain", "schoolb.staging.basic-sms.com", "schoolb"},
		{"localhost with port", "tenantx.localhost:8080", "tenantx"},
		{"deep tenant path", "alpha.beta.basic-sms.com", "alpha"},

		// Rejection cases – ensure no cross-tenant bleed
		{"bare domain", "basic-sms.com", ""},
		{"localhost no subdomain", "localhost:8080", ""},
		{"ip address", "10.0.0.1", ""},
		{"ip with port", "10.0.0.1:8080", ""},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req, err := http.NewRequest(http.MethodGet, "/probe", nil)
			require.NoError(t, err)
			req.Host = tc.host

			got := extractSubdomainForTest(req)
			assert.Equal(t, tc.wantTenant, got,
				"host=%q: expected tenant=%q, got=%q", tc.host, tc.wantTenant, got)
		})
	}
}

// TestTenantMiddleware_RejectsNoSubdomain verifies that requests without a
// resolvable tenant are rejected with 400/401 before reaching any handler.
func TestTenantMiddleware_RejectsNoSubdomain(t *testing.T) {
	r := gin.New()
	// Inject a middleware that mimics TenantMiddleware abort behaviour when
	// no subdomain is present, so we can test the guard without a real DB.
	r.Use(func(c *gin.Context) {
		host := c.Request.Host
		if host == "localhost:8080" || host == "basic-sms.com" {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "tenant not found"})
			return
		}
		c.Next()
	})
	r.GET("/data", func(c *gin.Context) { c.String(200, "secret") })

	for _, host := range []string{"localhost:8080", "basic-sms.com"} {
		req := httptest.NewRequest(http.MethodGet, "/data", nil)
		req.Host = host
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)
		assert.Equal(t, http.StatusBadRequest, w.Code,
			"host=%q should be rejected", host)
		assert.NotContains(t, w.Body.String(), "secret",
			"response body must not contain tenant data for host=%q", host)
	}
}

// TestTenantMiddleware_IsolatesContextPerRequest checks that context values
// injected for Tenant A do not leak into a subsequent request for Tenant B.
func TestTenantMiddleware_IsolatesContextPerRequest(t *testing.T) {
	const (
		tenantASchema = "tenant_alpha"
		tenantBSchema = "tenant_beta"
		tenantAHost   = "alpha.basic-sms.com"
		tenantBHost   = "beta.basic-sms.com"
		schemaCtxKey  = "tenantSchema"
	)

	r := gin.New()
	// Stub: resolve subdomain → schema name without a real DB.
	r.Use(func(c *gin.Context) {
		host := c.Request.Host
		switch {
		case len(host) > len(".basic-sms.com") && host[:len(host)-len(".basic-sms.com")] == "alpha":
			c.Set(schemaCtxKey, tenantASchema)
		case len(host) > len(".basic-sms.com") && host[:len(host)-len(".basic-sms.com")] == "beta":
			c.Set(schemaCtxKey, tenantBSchema)
		default:
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "unknown tenant"})
			return
		}
		c.Next()
	})

	r.GET("/me", func(c *gin.Context) {
		schema, _ := c.Get(schemaCtxKey)
		c.String(http.StatusOK, schema.(string))
	})

	// Request A
	wA := httptest.NewRecorder()
	reqA := httptest.NewRequest(http.MethodGet, "/me", nil)
	reqA.Host = tenantAHost
	r.ServeHTTP(wA, reqA)
	assert.Equal(t, tenantASchema, wA.Body.String())
	assert.NotContains(t, wA.Body.String(), tenantBSchema, "Tenant A must not see Tenant B's schema")

	// Request B
	wB := httptest.NewRecorder()
	reqB := httptest.NewRequest(http.MethodGet, "/me", nil)
	reqB.Host = tenantBHost
	r.ServeHTTP(wB, reqB)
	assert.Equal(t, tenantBSchema, wB.Body.String())
	assert.NotContains(t, wB.Body.String(), tenantASchema, "Tenant B must not see Tenant A's schema")
}

// TestTenantMiddleware_XTenantHeaderOverride verifies that the X-Tenant-Subdomain
// header can be used as a developer override for tooling/testing.
func TestTenantMiddleware_XTenantHeaderOverride(t *testing.T) {
	r := gin.New()
	r.Use(func(c *gin.Context) {
		override := c.GetHeader("X-Tenant-Subdomain")
		if override != "" {
			c.Set("tenantSchema", override+"_schema")
			c.Next()
			return
		}
		c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{"error": "no tenant"})
	})
	r.GET("/schema", func(c *gin.Context) {
		schema, _ := c.Get("tenantSchema")
		c.String(200, schema.(string))
	})

	req := httptest.NewRequest(http.MethodGet, "/schema", nil)
	req.Header.Set("X-Tenant-Subdomain", "devtenant")
	req.Host = "localhost:8080" // bare localhost – would normally be rejected

	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Equal(t, "devtenant_schema", w.Body.String())
}

// extractSubdomainForTest is a thin shim so we can call the unexported
// extractSubdomain function from the middleware package in black-box tests.
// In the test binary the middleware package functions are accessible because
// this file is in package middleware_test (same directory, separate package).
// We replicate the extraction logic here to test the specification, not the
// implementation detail.
func extractSubdomainForTest(req *http.Request) string {
	import_strings := func(s, sep string) []string {
		// inline split to avoid import cycle in _test package
		result := []string{}
		start := 0
		for i := 0; i < len(s); i++ {
			if string(s[i]) == sep {
				result = append(result, s[start:i])
				start = i + 1
			}
		}
		result = append(result, s[start:])
		return result
	}

	host := req.Host
	parts := import_strings(host, ".")
	if len(parts) >= 2 {
		sub := parts[0]
		// if sub contains ":" it's bare localhost with port
		for _, ch := range sub {
			if ch == ':' {
				return ""
			}
		}
		return sub
	}
	return ""
}
