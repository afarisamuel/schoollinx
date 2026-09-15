package ws

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/user/high-school-management/backend/internal/domain"
)

func TestHub_TenantIsolation_Broadcast(t *testing.T) {
	hub := NewHub("")
	go hub.Run()

	userA := uuid.New()
	userB := uuid.New()

	sendA := make(chan WSMessage, 10)
	sendB := make(chan WSMessage, 10)

	clientA := &Client{
		Hub:          hub,
		TenantSchema: "tenant_a",
		UserID:       userA,
		send:         sendA,
	}

	clientB := &Client{
		Hub:          hub,
		TenantSchema: "tenant_b",
		UserID:       userB,
		send:         sendB,
	}

	hub.register <- clientA
	hub.register <- clientB

	// Give time for registration
	time.Sleep(50 * time.Millisecond)

	// Broadcast notification strictly for tenant_a
	notifA := domain.Notification{
		ID:      uuid.New(),
		Title:   "School A Assembly",
		Message: "Mandatory assembly at 9 AM",
	}
	hub.BroadcastWithTenant("tenant_a", notifA)

	// Give time to process
	time.Sleep(50 * time.Millisecond)

	// Client A should receive the notification
	assert.Equal(t, 1, len(sendA), "Client in tenant_a should receive tenant_a broadcast")
	msgA := <-sendA
	assert.Equal(t, "notification", msgA.Type)
	assert.Equal(t, notifA.ID, msgA.Payload.(domain.Notification).ID)

	// Client B MUST NOT receive the notification
	assert.Equal(t, 0, len(sendB), "Client in tenant_b MUST NOT receive tenant_a broadcast")
}

func TestHub_TenantIsolation_DirectMessage(t *testing.T) {
	hub := NewHub("")
	go hub.Run()

	targetUserID := uuid.New()

	sendA := make(chan WSMessage, 10)
	sendB := make(chan WSMessage, 10)

	// Two sessions with same user ID in different tenant schemas
	clientA := &Client{
		Hub:          hub,
		TenantSchema: "tenant_a",
		UserID:       targetUserID,
		send:         sendA,
	}

	clientB := &Client{
		Hub:          hub,
		TenantSchema: "tenant_b",
		UserID:       targetUserID,
		send:         sendB,
	}

	hub.register <- clientA
	hub.register <- clientB
	time.Sleep(50 * time.Millisecond)

	// Send direct message targeted at tenant_a
	dm := domain.Message{
		ID:      uuid.New(),
		Content: "Confidential message for School A",
	}
	hub.SendDirectMessage(targetUserID, dm, "tenant_a")
	time.Sleep(50 * time.Millisecond)

	assert.Equal(t, 1, len(sendA), "Tenant A session should receive the message")
	assert.Equal(t, 0, len(sendB), "Tenant B session MUST NOT receive the message")
}
