package worker

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/user/high-school-management/backend/internal/infrastructure/cache"
)

// Locker provides distributed locking to prevent duplicate execution across clustered backend nodes.
type Locker interface {
	Acquire(ctx context.Context, lockKey string, ttl time.Duration) (bool, func())
}

type distributedLocker struct {
	cacheSvc   cache.CacheService
	instanceID string
	localLocks sync.Map
}

type localLockEntry struct {
	ownerID   string
	expiresAt time.Time
}

// NewLocker creates a distributed locker using Redis CacheService with in-memory fallback.
func NewLocker(cacheSvc cache.CacheService) Locker {
	return &distributedLocker{
		cacheSvc:   cacheSvc,
		instanceID: uuid.New().String(),
	}
}

func (l *distributedLocker) Acquire(ctx context.Context, lockKey string, ttl time.Duration) (bool, func()) {
	fullKey := fmt.Sprintf("worker:lock:%s", lockKey)

	// 1. Try Redis Distributed Lock if cache is available
	if l.cacheSvc != nil {
		var existingOwner string
		found := l.cacheSvc.Get(ctx, "global", fullKey, &existingOwner)
		if !found {
			// Key doesn't exist, try setting with TTL
			err := l.cacheSvc.Set(ctx, "global", fullKey, l.instanceID, ttl)
			if err == nil {
				releaseFunc := func() {
					bgCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
					defer cancel()
					var currentOwner string
					if l.cacheSvc.Get(bgCtx, "global", fullKey, &currentOwner) && currentOwner == l.instanceID {
						_ = l.cacheSvc.Delete(bgCtx, "global", fullKey)
					}
				}
				return true, releaseFunc
			}
		}
	}

	// 2. In-Memory fallback locking for single-instance or dev mode
	now := time.Now()
	val, loaded := l.localLocks.Load(lockKey)
	if loaded {
		if entry, ok := val.(localLockEntry); ok {
			if now.Before(entry.expiresAt) {
				// Lock is actively held
				return false, func() {}
			}
		}
	}

	// Claim lock
	l.localLocks.Store(lockKey, localLockEntry{
		ownerID:   l.instanceID,
		expiresAt: now.Add(ttl),
	})

	releaseLocal := func() {
		l.localLocks.Delete(lockKey)
	}

	return true, releaseLocal
}
