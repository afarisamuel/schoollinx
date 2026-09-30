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

// TelemetryData records operational health and performance stats of a worker.
type TelemetryData struct {
	Name           string    `json:"name"`
	Status         string    `json:"status"` // "RUNNING", "STOPPED", "ERROR"
	StartedAt      time.Time `json:"started_at"`
	LastHeartbeat  time.Time `json:"last_heartbeat"`
	LastRunAt      time.Time `json:"last_run_at"`
	LastDurationMs int64     `json:"last_duration_ms"`
	ExecutionCount int64     `json:"execution_count"`
	ErrorCount     int64     `json:"error_count"`
	LastError      string    `json:"last_error,omitempty"`
}

// Manager orchestrates the lifecycle, execution, telemetry, and graceful termination of all background workers.
type Manager struct {
	workers   []Worker
	wg        sync.WaitGroup
	cancel    context.CancelFunc
	telemetry sync.Map // map[string]*TelemetryData
}

// NewManager creates a new background worker manager.
func NewManager() *Manager {
	return &Manager{
		workers: make([]Worker, 0),
	}
}

// Register adds one or more workers to the manager.
func (m *Manager) Register(workers ...Worker) {
	for _, w := range workers {
		m.workers = append(m.workers, w)
		m.telemetry.Store(w.Name(), &TelemetryData{
			Name:      w.Name(),
			Status:    "INITIALIZED",
			StartedAt: time.Now(),
		})
	}
}

// RecordExecution updates worker telemetry metrics.
func (m *Manager) RecordExecution(workerName string, duration time.Duration, err error) {
	if val, ok := m.telemetry.Load(workerName); ok {
		t := val.(*TelemetryData)
		t.LastRunAt = time.Now()
		t.LastHeartbeat = time.Now()
		t.LastDurationMs = duration.Milliseconds()
		t.ExecutionCount++
		if err != nil {
			t.ErrorCount++
			t.LastError = err.Error()
			t.Status = "ERROR"
		} else {
			t.Status = "RUNNING"
		}
	}
}

// GetTelemetry returns the current operational telemetry snapshot of all workers.
func (m *Manager) GetTelemetry() []TelemetryData {
	results := make([]TelemetryData, 0)
	for _, w := range m.workers {
		if val, ok := m.telemetry.Load(w.Name()); ok {
			results = append(results, *val.(*TelemetryData))
		}
	}
	return results
}

// Start launches all registered background workers inside managed goroutines.
func (m *Manager) Start(parentCtx context.Context) {
	ctx, cancel := context.WithCancel(parentCtx)
	m.cancel = cancel

	logger.Info("Starting background worker manager", zap.Int("worker_count", len(m.workers)))

	for _, w := range m.workers {
		worker := w
		m.wg.Add(1)

		if val, ok := m.telemetry.Load(worker.Name()); ok {
			t := val.(*TelemetryData)
			t.Status = "RUNNING"
			t.StartedAt = time.Now()
			t.LastHeartbeat = time.Now()
		}

		go func() {
			defer m.wg.Done()
			defer func() {
				if r := recover(); r != nil {
					logger.Error("Panic recovered in background worker", nil,
						zap.String("worker", worker.Name()),
						zap.Any("panic", r),
					)
					if val, ok := m.telemetry.Load(worker.Name()); ok {
						t := val.(*TelemetryData)
						t.Status = "CRASHED"
						t.ErrorCount++
						t.LastError = "panic recovered"
					}
				}
			}()

			logger.Info("Background worker started", zap.String("worker", worker.Name()))
			worker.Start(ctx)

			if val, ok := m.telemetry.Load(worker.Name()); ok {
				t := val.(*TelemetryData)
				t.Status = "STOPPED"
			}
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
