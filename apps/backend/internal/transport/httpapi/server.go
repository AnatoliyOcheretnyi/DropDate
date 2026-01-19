package httpapi

import (
	"context"
	"log"
	"net/http"
	"time"

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

type ReadinessChecker interface {
	Readiness(ctx context.Context) map[string]error
}

type ServerOptions struct {
	Readiness        ReadinessChecker
	ReadinessTimeout time.Duration
	RequestTimeout   time.Duration
}

type Server struct {
	releases         *release.Service
	auth             AuthService
	saved            *saved.Service
	notifications    *notifications.Service
	readiness        ReadinessChecker
	readinessTimeout time.Duration
	requestTimeout   time.Duration
	logger           *log.Logger
}

func NewServer(
	releases *release.Service,
	authSvc AuthService,
	savedSvc *saved.Service,
	notificationsSvc *notifications.Service,
	logger *log.Logger,
	options ServerOptions,
) *Server {
	if logger == nil {
		logger = log.Default()
	}
	if options.ReadinessTimeout <= 0 {
		options.ReadinessTimeout = 2 * time.Second
	}
	return &Server{
		releases:         releases,
		auth:             authSvc,
		saved:            savedSvc,
		notifications:    notificationsSvc,
		readiness:        options.Readiness,
		readinessTimeout: options.ReadinessTimeout,
		requestTimeout:   options.RequestTimeout,
		logger:           logger,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	s.registerRoutes(mux)
	return s.withMiddleware(mux)
}
