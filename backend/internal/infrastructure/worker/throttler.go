package worker

import (
	"context"
	"time"
)

// IsWithinNotificationWindow returns true if the current local time is within acceptable parent communication hours (07:00 to 21:00).
func IsWithinNotificationWindow(now time.Time) bool {
	hour := now.Hour()
	return hour >= 7 && hour < 21
}

// RateLimiter controls outbound message throughput to avoid carrier/gateway 429 throttling.
type RateLimiter struct {
	ticker *time.Ticker
}

// NewRateLimiter creates a rate limiter allowing at most maxOpsPerSec calls.
func NewRateLimiter(maxOpsPerSec int) *RateLimiter {
	if maxOpsPerSec <= 0 {
		maxOpsPerSec = 30 // Safe default for SMS gateways
	}
	interval := time.Second / time.Duration(maxOpsPerSec)
	return &RateLimiter{
		ticker: time.NewTicker(interval),
	}
}

// Wait blocks until the rate limiter allows the next operation or the context is cancelled.
func (r *RateLimiter) Wait(ctx context.Context) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-r.ticker.C:
		return nil
	}
}

// Stop stops the rate limiter ticker.
func (r *RateLimiter) Stop() {
	if r.ticker != nil {
		r.ticker.Stop()
	}
}
