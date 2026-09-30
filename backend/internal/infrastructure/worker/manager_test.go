package worker_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/user/high-school-management/backend/internal/infrastructure/worker"
)

type mockTestWorker struct {
	name    string
	started atomic.Bool
	stopped atomic.Bool
}

func (m *mockTestWorker) Name() string {
	return m.name
}

func (m *mockTestWorker) Start(ctx context.Context) {
	m.started.Store(true)
	<-ctx.Done()
	m.stopped.Store(true)
}

func TestWorkerManagerLifecycle(t *testing.T) {
	w1 := &mockTestWorker{name: "Worker1"}
	w2 := &mockTestWorker{name: "Worker2"}

	mgr := worker.NewManager()
	mgr.Register(w1, w2)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	mgr.Start(ctx)

	// Wait briefly for goroutines to start
	time.Sleep(50 * time.Millisecond)

	if !w1.started.Load() || !w2.started.Load() {
		t.Fatalf("Expected workers to be started, got w1: %v, w2: %v", w1.started.Load(), w2.started.Load())
	}

	// Stop manager
	mgr.Stop(1 * time.Second)

	if !w1.stopped.Load() || !w2.stopped.Load() {
		t.Fatalf("Expected workers to be stopped, got w1: %v, w2: %v", w1.stopped.Load(), w2.stopped.Load())
	}
}
