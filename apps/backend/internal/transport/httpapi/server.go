package httpapi

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/achievements"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/airecs"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/akinator"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/cinematch"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/episodes"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/friends"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/games"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/gamestats"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/moodpicker"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/people"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/social"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/taste"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/vibe"
)

type AuthService interface {
	Register(ctx context.Context, email, password string) (auth.TokenPair, error)
	Login(ctx context.Context, email, password string) (auth.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string) (auth.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	VerifyEmail(ctx context.Context, token string) error
	ResendVerification(ctx context.Context, email string) error
	ParseAccessToken(token string) (string, error)
	Config() auth.Config
	GetByID(ctx context.Context, id string) (auth.User, error)
	FindByUsernameOrEmail(ctx context.Context, query string) (auth.User, error)
	SearchUsers(ctx context.Context, callerID, query string, limit int) ([]auth.User, error)
	UpdateUsername(ctx context.Context, userID, username string) (auth.User, error)
}

type ReadinessChecker interface {
	Readiness(ctx context.Context) map[string]error
}

type ServerOptions struct {
	Readiness        ReadinessChecker
	ReadinessTimeout time.Duration
	RequestTimeout   time.Duration
	MaxBodyBytes     int64
	RateLimits       RateLimitConfig
	JobsAccessToken  string
	SuperuserEmails  []string
	AI               *airecs.Service
	Vibe             *vibe.Service
	Capabilities     capabilities.Resolver
	People           *people.Service
	Achievements     *achievements.Service
	Friends          *friends.Service
	Akinator         *akinator.Service
	AkinatorBuilder  *akinator.Builder
	Taste            *taste.Service
	Social           *social.Service
	GameStats        *gamestats.Service
	Episodes         *episodes.Service
}

type Server struct {
	releases         *release.Service
	auth             AuthService
	saved            *saved.Service
	notifications    *notifications.Service
	recommendations  *recommendations.Service
	games            *games.Service
	mood             *moodpicker.Service
	match            *cinematch.Service
	people           *people.Service
	ai               *airecs.Service
	vibe             *vibe.Service
	caps             capabilities.Resolver
	achievements     *achievements.Service
	friends          *friends.Service
	akinator         *akinator.Service
	akinatorBuilder  *akinator.Builder
	taste            *taste.Service
	social           *social.Service
	gameStats        *gamestats.Service
	episodes         *episodes.Service
	readiness        ReadinessChecker
	readinessTimeout time.Duration
	requestTimeout   time.Duration
	maxBodyBytes     int64
	rateLimiter      *rateLimiter
	jobsAccessToken  string
	superuserEmails  map[string]struct{}
	logger           *log.Logger
}

func NewServer(
	releases *release.Service,
	authSvc AuthService,
	savedSvc *saved.Service,
	notificationsSvc *notifications.Service,
	recommendationsSvc *recommendations.Service,
	gamesSvc *games.Service,
	moodSvc *moodpicker.Service,
	matchSvc *cinematch.Service,
	logger *log.Logger,
	options ServerOptions,
) *Server {
	if logger == nil {
		logger = log.Default()
	}
	if options.ReadinessTimeout <= 0 {
		options.ReadinessTimeout = 2 * time.Second
	}
	superusers := make(map[string]struct{}, len(options.SuperuserEmails))
	for _, email := range options.SuperuserEmails {
		if normalized := strings.ToLower(strings.TrimSpace(email)); normalized != "" {
			superusers[normalized] = struct{}{}
		}
	}
	return &Server{
		releases:         releases,
		auth:             authSvc,
		saved:            savedSvc,
		notifications:    notificationsSvc,
		recommendations:  recommendationsSvc,
		games:            gamesSvc,
		mood:             moodSvc,
		match:            matchSvc,
		people:           options.People,
		ai:               options.AI,
		vibe:             options.Vibe,
		caps:             options.Capabilities,
		achievements:     options.Achievements,
		friends:          options.Friends,
		akinator:         options.Akinator,
		akinatorBuilder:  options.AkinatorBuilder,
		taste:            options.Taste,
		social:           options.Social,
		gameStats:        options.GameStats,
		episodes:         options.Episodes,
		readiness:        options.Readiness,
		readinessTimeout: options.ReadinessTimeout,
		requestTimeout:   options.RequestTimeout,
		maxBodyBytes:     options.MaxBodyBytes,
		rateLimiter:      newRateLimiter(options.RateLimits),
		jobsAccessToken:  strings.TrimSpace(options.JobsAccessToken),
		superuserEmails:  superusers,
		logger:           logger,
	}
}

// aiEnabled reports whether an AI feature is enabled for the user. Nil-safe: a
// server built without a capabilities resolver treats every AI feature as off.
func (s *Server) aiEnabled(ctx context.Context, userID string, feature capabilities.Feature) bool {
	return s.caps != nil && s.caps.Enabled(ctx, userID, feature)
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	s.registerRoutes(mux)
	return s.withMiddleware(mux)
}

func (s *Server) isSuperuserEmail(email string) bool {
	_, ok := s.superuserEmails[strings.ToLower(strings.TrimSpace(email))]
	return ok
}

func (s *Server) requireSuperuser(r *http.Request) (auth.User, error) {
	userID, err := s.requireUserID(r)
	if err != nil {
		return auth.User{}, err
	}
	if s.auth == nil {
		return auth.User{}, http.ErrNoCookie
	}
	user, err := s.auth.GetByID(r.Context(), userID)
	if err != nil {
		return auth.User{}, err
	}
	if !s.isSuperuserEmail(user.Email) {
		return auth.User{}, auth.ErrInvalidToken
	}
	return user, nil
}
