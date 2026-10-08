package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/user/high-school-management/backend/config"
	"github.com/user/high-school-management/backend/internal/api/handler"
	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/usecase"
)

func setupUSSDTestRouter() (*gin.Engine, domain.USSDUseCase) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	public := r.Group("/api/public")

	cfg := &config.Config{}
	uc := usecase.NewUSSDUseCase(nil, nil, nil, nil, cfg)
	handler.NewUSSDHandler(public, uc)

	return r, uc
}

func TestUSSDHandler_ArkeselJSON(t *testing.T) {
	router, _ := setupUSSDTestRouter()

	payload := map[string]interface{}{
		"sessionID":  "ark-sess-001",
		"userID":     "233244111222",
		"newSession": true,
		"userData":   "",
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/public/ussd/arkesel", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp domain.USSDResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "ark-sess-001", resp.SessionID)
	assert.True(t, resp.ContinueSession)
	assert.Contains(t, resp.Message, "Welcome to SchoolLinx")
}

func TestUSSDHandler_ArkeselFormEncoded(t *testing.T) {
	router, _ := setupUSSDTestRouter()

	formData := url.Values{}
	formData.Set("sessionID", "ark-form-002")
	formData.Set("userID", "0244111222")
	formData.Set("newSession", "true")

	req, _ := http.NewRequest(http.MethodPost, "/api/public/ussd/arkesel", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)

	var resp domain.USSDResponse
	err := json.Unmarshal(w.Body.Bytes(), &resp)
	assert.NoError(t, err)
	assert.Equal(t, "ark-form-002", resp.SessionID)
	assert.True(t, resp.ContinueSession)
	assert.Contains(t, resp.Message, "Welcome to SchoolLinx")
}

func TestUSSDHandler_Simulate(t *testing.T) {
	router, _ := setupUSSDTestRouter()

	payload := domain.USSDRequest{
		SessionID:  "sim-sess-003",
		UserID:     "233501234567",
		NewSession: true,
	}
	body, _ := json.Marshal(payload)

	req, _ := http.NewRequest(http.MethodPost, "/api/public/ussd/simulate", bytes.NewBuffer(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	assert.Equal(t, http.StatusOK, w.Code)
	assert.Contains(t, w.Body.String(), "Welcome to SchoolLinx")
}
