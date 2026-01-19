package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

const resendBaseURL = "https://api.resend.com"

type ResendSender struct {
	apiKey     string
	httpClient *http.Client
}

func NewResendSender(apiKey string, httpClient *http.Client) *ResendSender {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 5 * time.Second}
	}
	return &ResendSender{
		apiKey:     apiKey,
		httpClient: httpClient,
	}
}

func (s *ResendSender) Send(ctx context.Context, msg Message) error {
	if msg.To == "" || msg.From == "" {
		return fmt.Errorf("email: missing from/to")
	}

	payload := map[string]any{
		"from":    msg.From,
		"to":      []string{msg.To},
		"subject": msg.Subject,
		"html":    msg.HTML,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, resendBaseURL+"/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 300 {
		return fmt.Errorf("email: resend status %d", resp.StatusCode)
	}
	return nil
}
