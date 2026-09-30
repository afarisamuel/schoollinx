package push

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/messaging"
	"github.com/user/high-school-management/backend/internal/domain"
	"google.golang.org/api/option"
)

type FCMService interface {
	IsConfigured() bool
	SendToToken(ctx context.Context, token string, title, body string, data map[string]string) error
	SendMulticast(ctx context.Context, tokens []string, title, body string, data map[string]string) (unregisteredTokens []string, err error)
	SendToTopic(ctx context.Context, topic string, title, body string, data map[string]string) error
	SubscribeToTopic(ctx context.Context, tokens []string, topic string) error
	UnsubscribeFromTopic(ctx context.Context, tokens []string, topic string) error
	SendNotification(ctx context.Context, sub *domain.PushSubscription, payload map[string]interface{}) error
	FormatTenantTopic(tenantID string, topicName string) string
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

func (s *fcmService) FormatTenantTopic(tenantID string, topicName string) string {
	cleanTenant := strings.ReplaceAll(tenantID, "-", "_")
	cleanTopic := strings.ReplaceAll(topicName, "-", "_")
	return fmt.Sprintf("tenant_%s_%s", cleanTenant, cleanTopic)
}

func getChannelID(notifType string) string {
	switch notifType {
	case "attendance":
		return "attendance_alerts"
	case "fee", "payment":
		return "fee_alerts"
	case "grade", "exam":
		return "academic_alerts"
	case "message", "chat":
		return "chat_alerts"
	case "emergency":
		return "critical_alerts"
	default:
		return "general_alerts"
	}
}

func getWebpushActions(notifType string) []*messaging.WebpushNotificationAction {
	switch notifType {
	case "fee", "payment":
		return []*messaging.WebpushNotificationAction{
			{Action: "view_invoice", Title: "View Invoice"},
			{Action: "pay_now", Title: "Pay Fees"},
		}
	case "grade", "exam":
		return []*messaging.WebpushNotificationAction{
			{Action: "view_grades", Title: "View Gradebook"},
		}
	case "attendance":
		return []*messaging.WebpushNotificationAction{
			{Action: "view_attendance", Title: "View Attendance"},
		}
	default:
		return nil
	}
}

func isFCMTokenInvalid(err error) bool {
	if err == nil {
		return false
	}
	if messaging.IsUnregistered(err) ||
		messaging.IsRegistrationTokenNotRegistered(err) ||
		messaging.IsInvalidArgument(err) ||
		messaging.IsSenderIDMismatch(err) {
		return true
	}
	errStr := err.Error()
	return strings.Contains(errStr, "registration-token-not-registered") ||
		strings.Contains(errStr, "invalid-argument") ||
		strings.Contains(errStr, "NOT_FOUND") ||
		strings.Contains(errStr, "UNREGISTERED")
}

func (s *fcmService) SendToToken(ctx context.Context, token string, title, body string, data map[string]string) error {
	if s.client == nil {
		return fmt.Errorf("fcm client not configured")
	}

	channelID := getChannelID(data["type"])
	actions := getWebpushActions(data["type"])
	badgeCount := 1

	icon := "/favicon.ico"
	if customIcon := data["icon"]; customIcon != "" {
		icon = customIcon
	} else if logo := data["logo_url"]; logo != "" {
		icon = logo
	}

	msg := &messaging.Message{
		Token: token,
		Notification: &messaging.Notification{
			Title:    title,
			Body:     body,
			ImageURL: data["image_url"],
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Title:       title,
				Body:        body,
				ChannelID:   channelID,
				Icon:        "ic_notification",
				Sound:       "default",
				ClickAction: "FLUTTER_NOTIFICATION_CLICK",
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
					Badge: &badgeCount,
				},
			},
		},
		Webpush: &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Title:   title,
				Body:    body,
				Icon:    icon,
				Badge:   icon,
				Vibrate: []int{100, 50, 100},
				Actions: actions,
			},
			FCMOptions: &messaging.WebpushFCMOptions{
				Link: data["url"],
			},
		},
	}

	_, err := s.client.Send(ctx, msg)
	if err != nil {
		if isFCMTokenInvalid(err) {
			return fmt.Errorf("subscription_expired")
		}
		return err
	}
	return nil
}

func (s *fcmService) SendMulticast(ctx context.Context, tokens []string, title, body string, data map[string]string) ([]string, error) {
	if s.client == nil {
		return nil, fmt.Errorf("fcm client not configured")
	}
	if len(tokens) == 0 {
		return nil, nil
	}

	channelID := getChannelID(data["type"])
	actions := getWebpushActions(data["type"])
	badgeCount := 1

	icon := "/favicon.ico"
	if customIcon := data["icon"]; customIcon != "" {
		icon = customIcon
	} else if logo := data["logo_url"]; logo != "" {
		icon = logo
	}

	var deadTokens []string
	const maxBatch = 500

	for i := 0; i < len(tokens); i += maxBatch {
		end := i + maxBatch
		if end > len(tokens) {
			end = len(tokens)
		}
		batch := tokens[i:end]

		msg := &messaging.MulticastMessage{
			Tokens: batch,
			Notification: &messaging.Notification{
				Title:    title,
				Body:     body,
				ImageURL: data["image_url"],
			},
			Data: data,
			Android: &messaging.AndroidConfig{
				Priority: "high",
				Notification: &messaging.AndroidNotification{
					Title:       title,
					Body:        body,
					ChannelID:   channelID,
					Icon:        "ic_notification",
					Sound:       "default",
					ClickAction: "FLUTTER_NOTIFICATION_CLICK",
				},
			},
			APNS: &messaging.APNSConfig{
				Payload: &messaging.APNSPayload{
					Aps: &messaging.Aps{
						Sound: "default",
						Badge: &badgeCount,
					},
				},
			},
			Webpush: &messaging.WebpushConfig{
				Notification: &messaging.WebpushNotification{
					Title:   title,
					Body:    body,
					Icon:    icon,
					Badge:   icon,
					Vibrate: []int{100, 50, 100},
					Actions: actions,
				},
				FCMOptions: &messaging.WebpushFCMOptions{
					Link: data["url"],
				},
			},
		}

		br, err := s.client.SendEachForMulticast(ctx, msg)
		if err != nil {
			log.Printf("[FCM] Multicast batch error: %v", err)
			continue
		}

		for idx, resp := range br.Responses {
			if !resp.Success && resp.Error != nil {
				if isFCMTokenInvalid(resp.Error) {
					deadTokens = append(deadTokens, batch[idx])
				}
			}
		}
	}

	return deadTokens, nil
}

func (s *fcmService) SendToTopic(ctx context.Context, topic string, title, body string, data map[string]string) error {
	if s.client == nil {
		return fmt.Errorf("fcm client not configured")
	}

	channelID := getChannelID(data["type"])
	actions := getWebpushActions(data["type"])
	badgeCount := 1

	icon := "/favicon.ico"
	if customIcon := data["icon"]; customIcon != "" {
		icon = customIcon
	} else if logo := data["logo_url"]; logo != "" {
		icon = logo
	}

	msg := &messaging.Message{
		Topic: topic,
		Notification: &messaging.Notification{
			Title:    title,
			Body:     body,
			ImageURL: data["image_url"],
		},
		Data: data,
		Android: &messaging.AndroidConfig{
			Priority: "high",
			Notification: &messaging.AndroidNotification{
				Title:       title,
				Body:        body,
				ChannelID:   channelID,
				Icon:        "ic_notification",
				Sound:       "default",
				ClickAction: "FLUTTER_NOTIFICATION_CLICK",
			},
		},
		APNS: &messaging.APNSConfig{
			Payload: &messaging.APNSPayload{
				Aps: &messaging.Aps{
					Sound: "default",
					Badge: &badgeCount,
				},
			},
		},
		Webpush: &messaging.WebpushConfig{
			Notification: &messaging.WebpushNotification{
				Title:   title,
				Body:    body,
				Icon:    icon,
				Badge:   icon,
				Vibrate: []int{100, 50, 100},
				Actions: actions,
			},
			FCMOptions: &messaging.WebpushFCMOptions{
				Link: data["url"],
			},
		},
	}

	_, err := s.client.Send(ctx, msg)
	return err
}

func (s *fcmService) SubscribeToTopic(ctx context.Context, tokens []string, topic string) error {
	if s.client == nil || len(tokens) == 0 {
		return nil
	}
	_, err := s.client.SubscribeToTopic(ctx, tokens, topic)
	return err
}

func (s *fcmService) UnsubscribeFromTopic(ctx context.Context, tokens []string, topic string) error {
	if s.client == nil || len(tokens) == 0 {
		return nil
	}
	_, err := s.client.UnsubscribeFromTopic(ctx, tokens, topic)
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
