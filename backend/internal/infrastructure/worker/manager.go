package worker

import (
	"context"
	"sync"
	"time"

	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
)

// Worker represents a runnable background worker job or queue consumer.
type Worker interface {
	Name() string
	Start(ctx context.Context)
}

// Manager orchestrates the lifecycle, execution, and graceful termination of all background workers.
type Manager struct {
	workers []Worker
	wg      sync.WaitGroup
	cancel  context.CancelFunc
}

// NewManager creates a new background worker manager.
func NewManager() *Manager {
	return &Manager{
		workers: make([]Worker, 0),
	}
}

// Register adds one or more workers to the manager.
func (m *Manager) Register(workers ...Worker) {
	m.workers = append(m.workers, workers...)
}

// Start launches all registered background workers inside managed goroutines.
func (m *Manager) Start(parentCtx context.Context) {
	ctx, cancel := context.WithCancel(parentCtx)
	m.cancel = cancel

	logger.Info("Starting background worker manager", zap.Int("worker_count", len(m.workers)))

	for _, w := range m.workers {
		worker := w
		m.wg.Add(1)
		go func() {
			defer m.wg.Done()
			defer func() {
				if r := recover(); r != nil {
					logger.Error("Panic recovered in background worker", nil,
						zap.String("worker", worker.Name()),
						zap.Any("panic", r),
					)
				}
			}()

			logger.Info("Background worker started", zap.String("worker", worker.Name()))
			worker.Start(ctx)
			logger.Info("Background worker stopped", zap.String("worker", worker.Name()))
		}()
	}
}

// Stop initiates graceful shutdown of all running workers and waits for termination.
func (m *Manager) Stop(timeout time.Duration) {
	if m.cancel != nil {
		m.cancel()
	}

	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		logger.Info("All background workers stopped gracefully")
	case <-time.After(timeout):
		logger.Warn("Background workers shutdown timed out", zap.Duration("timeout", timeout))
	}
}
