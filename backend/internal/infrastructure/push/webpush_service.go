package push

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/user/high-school-management/backend/internal/domain"
)

type WebPushService interface {
	GetVAPIDPublicKey() string
	SendNotification(ctx context.Context, sub *domain.PushSubscription, payload interface{}) error
}

type webPushService struct {
	vapidPublicKey  string
	vapidPrivateKey string
	vapidSubject    string
}

func NewWebPushService(vapidPublicKey, vapidPrivateKey, vapidSubject string) WebPushService {
	if vapidSubject == "" {
		vapidSubject = "mailto:admin@schoollinx.com"
	}

	if vapidPublicKey == "" || vapidPrivateKey == "" {
		privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
		if err != nil {
			log.Printf("WARN: Failed to generate VAPID keys: %v", err)
		} else {
			vapidPublicKey = publicKey
			vapidPrivateKey = privateKey
			log.Printf("INFO: Auto-generated WebPush VAPID Public Key: %s", vapidPublicKey)
		}
	}

	return &webPushService{
		vapidPublicKey:  vapidPublicKey,
		vapidPrivateKey: vapidPrivateKey,
		vapidSubject:    vapidSubject,
	}
}

func (s *webPushService) GetVAPIDPublicKey() string {
	return s.vapidPublicKey
}

func (s *webPushService) SendNotification(ctx context.Context, sub *domain.PushSubscription, payload interface{}) error {
	if sub == nil || sub.Endpoint == "" {
		return errors.New("invalid push subscription")
	}

	dataBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	subscription := &webpush.Subscription{
		Endpoint: sub.Endpoint,
		Keys: webpush.Keys{
			P256dh: sub.P256dh,
			Auth:   sub.Auth,
		},
	}

	resp, err := webpush.SendNotificationWithContext(ctx, dataBytes, subscription, &webpush.Options{
		Subscriber:      s.vapidSubject,
		VAPIDPublicKey:  s.vapidPublicKey,
		VAPIDPrivateKey: s.vapidPrivateKey,
		TTL:             86400, // 24 hours
		Urgency:         webpush.UrgencyHigh,
	})
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
		return errors.New("subscription_expired")
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return errors.New("push notification failed with status: " + resp.Status)
	}

	return nil
}
