package ws

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/user/high-school-management/backend/internal/api/middleware"
	"github.com/user/high-school-management/backend/internal/domain"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 4096
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")

		// Always allow explicitly trusted admin origins
		if origin == "https://admin.schoollinx.com" || origin == "https://schoollinx.com" {
			return true
		}

		// Allow localhost for development (exact and subdomains like thinkce.localhost:4200)
		if origin == "http://localhost:4200" || origin == "http://localhost:6222" {
			return true
		}
		if strings.Contains(origin, ".localhost:") && strings.HasPrefix(origin, "http://") {
			return true
		}

		// Strict subdomain checking for schoollinx.com (e.g. https://tenant.schoollinx.com)
		if strings.HasSuffix(origin, ".schoollinx.com") {
			// Ensure it starts with https:// to prevent spoofing like http://evil.schoollinx.com
			if strings.HasPrefix(origin, "https://") {
				return true
			}
		}

		return false
	},
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	// Tenant Schema for persisting messages in the correct schema
	TenantSchema string
	Hub          *Hub
	// The websocket connection.
	Conn *websocket.Conn
	// Buffered channel of outbound messages.
	send chan WSMessage
	// MessageUseCase for persisting chat messages (optional, injected at serve time)
	msgUseCase domain.MessageUseCase
	// User ID for targeted notifications
	UserID uuid.UUID
}

// IncomingWSMessage is the expected shape of a JSON frame sent by the frontend
type IncomingWSMessage struct {
	Type string          `json:"type"` // "direct_message"
	Data json.RawMessage `json:"data"`
}

// IncomingDM is the payload within an incoming direct_message frame
type IncomingDM struct {
	RecipientID    string `json:"recipient_id"`
	ConversationID string `json:"conversation_id"`
	Content        string `json:"content"`
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		c.Conn.Close()
	}()
	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error { c.Conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, raw, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("ws read error: %v", err)
			}
			break
		}

		// Parse the incoming frame
		var incoming IncomingWSMessage
		if err := json.Unmarshal(raw, &incoming); err != nil {
			log.Printf("ws invalid json: %v", err)
			continue
		}

		switch incoming.Type {
		case "direct_message":
			c.handleDirectMessage(incoming.Data)
		default:
			// Unknown type, ignore
			log.Printf("ws unknown message type: %s", incoming.Type)
		}
	}
}

func (c *Client) handleDirectMessage(data json.RawMessage) {
	var dm IncomingDM
	if err := json.Unmarshal(data, &dm); err != nil {
		log.Printf("ws invalid DM payload: %v", err)
		return
	}

	recipientID, err := uuid.Parse(dm.RecipientID)
	if err != nil {
		log.Printf("ws invalid recipient ID: %v", err)
		return
	}

	conversationID, err := uuid.Parse(dm.ConversationID)
	if err != nil {
		log.Printf("ws invalid conversation ID: %v", err)
		return
	}

	msg := domain.Message{
		ConversationID: conversationID,
		SenderID:       c.UserID,
		Content:        dm.Content,
	}

	// Persist the message if we have a usecase
	if c.msgUseCase != nil && c.TenantSchema != "" {
		ctx := context.WithValue(context.Background(), middleware.TenantSchemaKey, c.TenantSchema)
		if err := c.msgUseCase.SendMessage(ctx, &msg); err != nil {
			log.Printf("ws failed to persist DM: %v", err)
			// Still route it in real-time even if persistence fails
		}
	}

	// Route to recipient via the hub
	c.Hub.SendDirectMessage(recipientID, msg)

	// Echo back to sender so they see their own message in real-time
	echo := WSMessage{Type: "direct_message", Payload: msg}
	select {
	case c.send <- echo:
	default:
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			if err := c.Conn.WriteJSON(message); err != nil {
				return
			}

		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request, userID uuid.UUID, tenantSchema string, msgUseCase domain.MessageUseCase) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{Hub: hub, Conn: conn, send: make(chan WSMessage, 256), UserID: userID, TenantSchema: tenantSchema, msgUseCase: msgUseCase}
	client.Hub.register <- client

	// Start goroutines for read/write pumps
	go client.writePump()
	go client.readPump()
}
