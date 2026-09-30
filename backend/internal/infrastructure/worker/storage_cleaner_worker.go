package worker

import (
	"context"
	"os"
	"path/filepath"
	"time"

	"github.com/user/high-school-management/backend/internal/infrastructure/logger"
	"go.uber.org/zap"
)

// StorageCleanerWorker periodically scans temporary upload and export directories,
// removing orphaned files and generated export artifacts older than 7 days.
type StorageCleanerWorker struct {
	directories []string
	locker      Locker
	interval    time.Duration
}

func NewStorageCleanerWorker(locker Locker, directories []string, interval time.Duration) *StorageCleanerWorker {
	if interval <= 0 {
		interval = 24 * time.Hour
	}
	if len(directories) == 0 {
		directories = []string{
			"./uploads/temp",
			"./storage/uploads/temp",
			"./storage/temp",
		}
	}
	return &StorageCleanerWorker{
		directories: directories,
		locker:      locker,
		interval:    interval,
	}
}

func (w *StorageCleanerWorker) Name() string {
	return "StorageCleanerWorker"
}

func (w *StorageCleanerWorker) Start(ctx context.Context) {
	// Run cleanup on startup
	w.runCleanup(ctx)

	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.runCleanup(ctx)
		}
	}
}

func (w *StorageCleanerWorker) runCleanup(ctx context.Context) {
	if w.locker != nil {
		acquired, release := w.locker.Acquire(ctx, "storage_cleaner", 1*time.Hour)
		if !acquired {
			return
		}
		defer release()
	}

	cutoff := time.Now().AddDate(0, 0, -7)
	var deletedCount int
	var freedBytes int64

	for _, dir := range w.directories {
		if _, err := os.Stat(dir); os.IsNotExist(err) {
			continue
		}

		_ = filepath.Walk(dir, func(path string, info os.FileInfo, err error) error {
			if err != nil || info == nil || info.IsDir() {
				return nil
			}

			if info.ModTime().Before(cutoff) {
				size := info.Size()
				if rmErr := os.Remove(path); rmErr == nil {
					deletedCount++
					freedBytes += size
				}
			}
			return nil
		})
	}

	if deletedCount > 0 {
		logger.Info("StorageCleanerWorker: purged stale temporary files",
			zap.Int("deleted_count", deletedCount),
			zap.Int64("freed_bytes", freedBytes),
		)
	}
}
