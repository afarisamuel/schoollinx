package ws

import (
	"context"
	"encoding/json"
	"log"
	"sync"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"github.com/user/high-school-management/backend/internal/domain"
)

// WSMessage is a generic envelope sent over WebSocket connections.
type WSMessage struct {
	Type    string      `json:"type"` // "notification" | "direct_message"
	Payload interface{} `json:"payload"`
}

// Hub maintains the set of active clients and broadcasts messages to the clients.
type Hub struct {
	clients       map[uuid.UUID][]*Client // Map userID to list of active clients (sessions)
	broadcast     chan domain.Notification
	directMessage chan *DirectMessage
	register      chan *Client
	unregister    chan *Client
	mu            sync.RWMutex
	
	redisClient   *redis.Client
	ctx           context.Context
}

// DirectMessage wraps a domain.Message with a target user for routing
type DirectMessage struct {
	Message     domain.Message `json:"message"`
	RecipientID uuid.UUID      `json:"recipient_id"`
}

func NewHub(redisURL string) *Hub {
	h := &Hub{
		broadcast:     make(chan domain.Notification),
		directMessage: make(chan *DirectMessage, 256),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		clients:       make(map[uuid.UUID][]*Client),
		ctx:           context.Background(),
	}

	if redisURL != "" {
		opt, err := redis.ParseURL(redisURL)
		if err == nil {
			h.redisClient = redis.NewClient(opt)
			go h.listenRedis()
		} else {
			log.Printf("Failed to parse Redis URL: %v", err)
		}
	}

	return h
}

func (h *Hub) listenRedis() {
	pubsub := h.redisClient.Subscribe(h.ctx, "ws_notifications", "ws_direct_messages")
	defer pubsub.Close()

	ch := pubsub.Channel()
	for msg := range ch {
		if msg.Channel == "ws_notifications" {
			var n domain.Notification
			if err := json.Unmarshal([]byte(msg.Payload), &n); err == nil {
				h.broadcast <- n
			}
		} else if msg.Channel == "ws_direct_messages" {
			var dm DirectMessage
			if err := json.Unmarshal([]byte(msg.Payload), &dm); err == nil {
				h.directMessage <- &dm
			}
		}
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client.UserID] = append(h.clients[client.UserID], client)
			h.mu.Unlock()
		case client := <-h.unregister:
			h.mu.Lock()
			if sessions, ok := h.clients[client.UserID]; ok {
				for i, session := range sessions {
					if session == client {
						h.clients[client.UserID] = append(sessions[:i], sessions[i+1:]...)
						break
					}
				}
				if len(h.clients[client.UserID]) == 0 {
					delete(h.clients, client.UserID)
				}
				close(client.send)
			}
			h.mu.Unlock()
		case notification := <-h.broadcast:
			h.mu.RLock()
			// Handle user-specific notifications
			if notification.UserID != uuid.Nil {
				if sessions, ok := h.clients[notification.UserID]; ok {
					msg := WSMessage{Type: "notification", Payload: notification}
					for _, client := range sessions {
						select {
						case client.send <- msg:
						default:
							// Handle full buffer if necessary
						}
					}
				}
			} else {
				// Broadcast to all
				msg := WSMessage{Type: "notification", Payload: notification}
				for _, sessions := range h.clients {
					for _, client := range sessions {
						select {
						case client.send <- msg:
						default:
						}
					}
				}
			}
			h.mu.RUnlock()
		case dm := <-h.directMessage:
			h.mu.RLock()
			if sessions, ok := h.clients[dm.RecipientID]; ok {
				msg := WSMessage{Type: "direct_message", Payload: dm.Message}
				for _, client := range sessions {
					select {
					case client.send <- msg:
					default:
					}
				}
			}
			h.mu.RUnlock()
		}
	}
}

func (h *Hub) Broadcast(n domain.Notification) {
	if h.redisClient != nil {
		if data, err := json.Marshal(n); err == nil {
			h.redisClient.Publish(h.ctx, "ws_notifications", string(data))
		}
	} else {
		h.broadcast <- n
	}
}

// SendDirectMessage routes a chat message to a specific user's active sessions
func (h *Hub) SendDirectMessage(recipientID uuid.UUID, msg domain.Message) {
	dm := DirectMessage{
		RecipientID: recipientID,
		Message:     msg,
	}
	if h.redisClient != nil {
		if data, err := json.Marshal(dm); err == nil {
			h.redisClient.Publish(h.ctx, "ws_direct_messages", string(data))
		}
	} else {
		h.directMessage <- &dm
	}
}
