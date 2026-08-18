package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type client struct {
	count    int
	lastSeen time.Time
}

// IPRateLimiter is a basic in-memory rate limiter based on client IP
type IPRateLimiter struct {
	mu       sync.Mutex
	clients  map[string]*client
	limit    int
	window   time.Duration
}

func NewIPRateLimiter(limit int, window time.Duration) *IPRateLimiter {
	rl := &IPRateLimiter{
		clients: make(map[string]*client),
		limit:   limit,
		window:  window,
	}

	// Background cleanup goroutine
	go func() {
		for {
			time.Sleep(window)
			rl.cleanup()
		}
	}()

	return rl
}

func (rl *IPRateLimiter) cleanup() {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	for ip, c := range rl.clients {
		if time.Since(c.lastSeen) > rl.window {
			delete(rl.clients, ip)
		}
	}
}

func (rl *IPRateLimiter) Middleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		rl.mu.Lock()

		cl, exists := rl.clients[ip]
		if !exists {
			rl.clients[ip] = &client{count: 1, lastSeen: time.Now()}
			rl.mu.Unlock()
			c.Next()
			return
		}

		if time.Since(cl.lastSeen) > rl.window {
			cl.count = 0
		}

		cl.lastSeen = time.Now()
		cl.count++

		if cl.count > rl.limit {
			rl.mu.Unlock()
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please try again later."})
			return
		}

		rl.mu.Unlock()
		c.Next()
	}
}
