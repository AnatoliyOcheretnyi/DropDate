package httpapi

import (
	"context"
	"log"
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
)

type AuthService interface {
	Register(ctx context.Context, email, password string) (auth.TokenPair, error)
	Login(ctx context.Context, email, password string) (auth.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string) (auth.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	ParseAccessToken(token string) (string, error)
	Config() auth.Config
}

type Server struct {
	releases      *release.Service
	auth          AuthService
	saved         *saved.Service
	notifications *notifications.Service
	logger        *log.Logger
}

func NewServer(
	releases *release.Service,
	authSvc AuthService,
	savedSvc *saved.Service,
	notificationsSvc *notifications.Service,
	logger *log.Logger,
) *Server {
	if logger == nil {
		logger = log.Default()
	}
	return &Server{
		releases:      releases,
		auth:          authSvc,
		saved:         savedSvc,
		notifications: notificationsSvc,
		logger:        logger,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	s.registerRoutes(mux)
	return mux
}
