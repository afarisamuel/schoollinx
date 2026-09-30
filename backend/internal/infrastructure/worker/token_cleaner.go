package worker

import (
	"context"
	"time"

	"github.com/user/high-school-management/backend/internal/domain"
	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
)

// TokenCleanerWorker periodically purges expired revoked tokens and blacklisted JWTs from the database.
type TokenCleanerWorker struct {
	blacklistRepo domain.TokenBlacklistRepository
	interval      time.Duration
}

// NewTokenCleanerWorker initializes a new TokenCleanerWorker.
func NewTokenCleanerWorker(blacklistRepo domain.TokenBlacklistRepository, interval time.Duration) *TokenCleanerWorker {
	if interval <= 0 {
		interval = 1 * time.Hour
	}
	return &TokenCleanerWorker{
		blacklistRepo: blacklistRepo,
		interval:      interval,
	}
}

func (w *TokenCleanerWorker) Name() string {
	return "TokenCleanerWorker"
}

func (w *TokenCleanerWorker) Start(ctx context.Context) {
	// Execute immediately on startup
	w.cleanup(ctx)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.cleanup(ctx)
		}
	}
}

func (w *TokenCleanerWorker) cleanup(ctx context.Context) {
	reqCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	start := time.Now()
	if err := w.blacklistRepo.CleanupExpired(reqCtx); err != nil {
		logger.Error("TokenCleanerWorker: failed to clean expired tokens", err)
		return
	}
	logger.Info("TokenCleanerWorker: successfully purged expired tokens",
		zap.Duration("duration", time.Since(start)),
	)
}
