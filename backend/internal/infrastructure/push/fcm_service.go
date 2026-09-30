package push

import (
	"context"
	"fmt"
	"log"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/user/high-school-management/backend/internal/domain"
	"google.golang.org/api/option"
)

type FCMService interface {
	IsConfigured() bool
	SendToToken(ctx context.Context, token string, title, body string, data map[string]string) error
	SendNotification(ctx context.Context, sub *domain.PushSubscription, payload map[string]interface{}) error
}

type fcmService struct {
	client *messaging.Client
}

// NewFCMService initializes the Firebase Cloud Messaging client from a service account file or JSON env var.
func NewFCMService(credentialsFile string) FCMService {
	if credentialsFile == "" {
		credentialsFile = os.Getenv("FIREBASE_CREDENTIALS_FILE")
	}

	if credentialsFile == "" {
		if jsonCreds := os.Getenv("FIREBASE_CREDENTIALS_JSON"); jsonCreds != "" {
			opt := option.WithCredentialsJSON([]byte(jsonCreds))
			app, err := firebase.NewApp(context.Background(), nil, opt)
			if err != nil {
				log.Printf("WARN: Failed to initialize Firebase App with JSON: %v", err)
				return &fcmService{}
			}
			client, err := app.Messaging(context.Background())
			if err != nil {
				log.Printf("WARN: Failed to initialize FCM client: %v", err)
				return &fcmService{}
			}
			log.Printf("INFO: Firebase Cloud Messaging (FCM) initialized successfully via JSON credentials")
			return &fcmService{client: client}
		}
		// No credentials provided
		return &fcmService{}
	}

	opt := option.WithCredentialsFile(credentialsFile)
	app, err := firebase.NewApp(context.Background(), nil, opt)
	if err != nil {
		log.Printf("WARN: Failed to initialize Firebase App from %s: %v", credentialsFile, err)
		return &fcmService{}
	}

	client, err := app.Messaging(context.Background())
	if err != nil {
		log.Printf("WARN: Failed to initialize FCM client: %v", err)
		return &fcmService{}
	}

	log.Printf("INFO: Firebase Cloud Messaging (FCM) initialized successfully from %s", credentialsFile)
	return &fcmService{client: client}
}

func (s *fcmService) IsConfigured() bool {
	return s.client != nil
}

func (s *fcmService) SendToToken(ctx context.Context, token string, title, body string, data map[string]string) error {
	if s.client == nil {
		return fmt.Errorf("fcm client not configured")
	}

	msg := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Data: data,
		Webpush: &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Title: title,
				Body:  body,
				Icon:  "/favicon.ico",
				Badge: "/favicon.ico",
			},
			FCMOptions: &messaging.WebpushFCMOptions{
				Link: data["url"],
			},
		},
	}

	_, err := s.client.Send(ctx, msg)
	return err
}

func (s *fcmService) SendNotification(ctx context.Context, sub *domain.PushSubscription, payload map[string]interface{}) error {
	if sub == nil || sub.Endpoint == "" {
		return fmt.Errorf("invalid subscription")
	}

	title, _ := payload["title"].(string)
	body, _ := payload["body"].(string)

	dataMap := make(map[string]string)
	if d, ok := payload["data"].(map[string]string); ok {
		dataMap = d
	} else if d, ok := payload["data"].(map[string]interface{}); ok {
		for k, v := range d {
			dataMap[k] = fmt.Sprintf("%v", v)
		}
	}

	return s.SendToToken(ctx, sub.Endpoint, title, body, dataMap)
}
