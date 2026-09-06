package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/redis/go-redis/v9"
)

type CacheService interface {
	Get(ctx context.Context, tenantSchema, key string, dest interface{}) bool
	Set(ctx context.Context, tenantSchema, key string, value interface{}, ttl time.Duration) error
	Delete(ctx context.Context, tenantSchema, key string) error
	DeletePattern(ctx context.Context, tenantSchema, pattern string) error
}

type redisCacheService struct {
	client *redis.Client
}

func NewCacheService(redisURL string) CacheService {
	if redisURL == "" {
		return &noopCacheService{}
	}

	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("WARN: Failed to parse Redis URL (%s): %v. Using in-memory fallback cache.", redisURL, err)
		return &noopCacheService{}
	}

	client := redis.NewClient(opt)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("WARN: Redis unreachable at %s (%v). Caching operations will gracefully fallback.", redisURL, err)
		return &noopCacheService{}
	}

	log.Printf("INFO: Redis cache connection established at %s", redisURL)
	return &redisCacheService{client: client}
}

func (s *redisCacheService) buildKey(tenantSchema, key string) string {
	if tenantSchema == "" {
		tenantSchema = "global"
	}
	return fmt.Sprintf("schoollinx:%s:%s", tenantSchema, key)
}

func (s *redisCacheService) Get(ctx context.Context, tenantSchema, key string, dest interface{}) bool {
	if s.client == nil {
		return false
	}
	fullKey := s.buildKey(tenantSchema, key)
	val, err := s.client.Get(ctx, fullKey).Result()
	if err != nil {
		return false
	}
	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return false
	}
	return true
}

func (s *redisCacheService) Set(ctx context.Context, tenantSchema, key string, value interface{}, ttl time.Duration) error {
	if s.client == nil {
		return nil
	}
	fullKey := s.buildKey(tenantSchema, key)
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}
	return s.client.Set(ctx, fullKey, string(data), ttl).Err()
}

func (s *redisCacheService) Delete(ctx context.Context, tenantSchema, key string) error {
	if s.client == nil {
		return nil
	}
	fullKey := s.buildKey(tenantSchema, key)
	return s.client.Del(ctx, fullKey).Err()
}

func (s *redisCacheService) DeletePattern(ctx context.Context, tenantSchema, pattern string) error {
	if s.client == nil {
		return nil
	}
	fullPattern := s.buildKey(tenantSchema, pattern)
	if !strings.HasSuffix(fullPattern, "*") {
		fullPattern += "*"
	}

	iter := s.client.Scan(ctx, 0, fullPattern, 0).Iterator()
	var keys []string
	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}
	if err := iter.Err(); err != nil {
		return err
	}
	if len(keys) > 0 {
		return s.client.Del(ctx, keys...).Err()
	}
	return nil
}

// No-op fallback when Redis is offline
type noopCacheService struct{}

func (n *noopCacheService) Get(ctx context.Context, tenantSchema, key string, dest interface{}) bool {
	return false
}
func (n *noopCacheService) Set(ctx context.Context, tenantSchema, key string, value interface{}, ttl time.Duration) error {
	return nil
}
func (n *noopCacheService) Delete(ctx context.Context, tenantSchema, key string) error {
	return nil
}
func (n *noopCacheService) DeletePattern(ctx context.Context, tenantSchema, pattern string) error {
	return nil
}
