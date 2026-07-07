package app

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/airecs"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/capabilities"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/cinematch"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/email"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/games"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/moodpicker"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/notifications"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/people"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/recommendations"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/saved"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/transport/httpapi"
	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/sync/errgroup"
)

type App struct {
	server                *http.Server
	notifier              *notifications.ReleaseNotifier
	notificationsInterval time.Duration
	shutdownTimeout       time.Duration
	closeDB               func() error
	logger                *log.Logger
}

func New(cfg Config, logger *log.Logger) (*App, error) {
	if logger == nil {
		logger = log.Default()
	}

	httpClient := &http.Client{Timeout: cfg.HTTPClient.Timeout}

	var tmdbClient *tmdb.Client
	if cfg.TMDB.Token != "" {
		client, err := tmdb.NewClient(httpClient, cfg.TMDB.Token)
		if err != nil {
			return nil, err
		}
		tmdbClient = client
	} else {
		logger.Printf("TMDB_ACCESS_TOKEN not set, continuing without TMDB integration")
	}

	providers, suggester := buildReleaseProviders(tmdbClient)
	if len(providers) == 0 {
		return nil, errors.New("no release providers configured")
	}

	releaseService := release.NewService(providers, suggester, logger)

	var (
		authService          *auth.Service
		savedService         *saved.Service
		notificationsService *notifications.Service
		peopleService        *people.Service
		closeDB              func() error
		db                   *sql.DB
	)

	if cfg.Database.DSN != "" {
		openedDB, err := openDatabase(cfg.Database)
		if err != nil {
			return nil, err
		}
		db = openedDB
		closeDB = openedDB.Close

		emailSender := buildEmailSender(cfg.Email, httpClient)
		service, err := buildAuthService(openedDB, cfg.Auth, emailSender, cfg.Email)
		if err != nil {
			_ = openedDB.Close()
			return nil, err
		}
		authService = service
		savedService = saved.NewService(saved.NewStore(openedDB))
		notificationsService = notifications.NewService(notifications.NewStore(openedDB))
		peopleService = people.NewService(people.NewStore(openedDB))
	}

	var recommendationsService *recommendations.Service
	if savedService != nil {
		recommendationsService = recommendations.NewService(savedService, releaseService, logger)
		recommendationsService.SetRefreshDebounce(cfg.Recommendations.RefreshDebounce)
	}

	gamesService := games.NewService(releaseService, logger)
	moodService := moodpicker.NewService(releaseService, savedService, logger)
	matchService := cinematch.NewService(releaseService, savedService, logger)

	var aiService *airecs.Service
	if cfg.AI.GeminiAPIKey != "" {
		svc, err := airecs.NewService(context.Background(), cfg.AI.GeminiAPIKey, cfg.AI.GeminiModel, logger)
		if err != nil {
			logger.Printf("gemini recommendations disabled: %v", err)
		} else {
			aiService = svc
			logger.Printf("gemini recommendations enabled (model=%s)", airecs.ModelOrDefault(cfg.AI.GeminiModel))
		}
	} else {
		logger.Printf("GEMINI_API_KEY not set, AI recommendations disabled")
	}

	// The mood picker uses Gemini for adaptive question branching when available;
	// per-request gating still goes through the capability resolver.
	if aiService != nil {
		moodService.SetNextQuestionStrategy(aiService)
	}

	// AI features are effective only when a Gemini client exists; each toggle
	// gates one feature. A per-user (tier-aware) resolver can replace Static
	// later without touching call sites.
	aiReady := aiService != nil
	capabilitiesResolver := capabilities.NewStatic(map[capabilities.Feature]bool{
		capabilities.AIRecommendations: aiReady && cfg.AI.RecommendationsEnabled,
		capabilities.AIMood:            aiReady && cfg.AI.MoodEnabled,
		capabilities.AIMatch:           aiReady && cfg.AI.MatchEnabled,
	})

	var readiness httpapi.ReadinessChecker
	if db != nil || tmdbClient != nil {
		readiness = readinessChecker{
			db:         db,
			tmdbClient: tmdbClient,
		}
	}

	apiServer := httpapi.NewServer(
		releaseService,
		authService,
		savedService,
		notificationsService,
		recommendationsService,
		gamesService,
		moodService,
		matchService,
		logger,
		httpapi.ServerOptions{
			Readiness:        readiness,
			ReadinessTimeout: cfg.Readiness.Timeout,
			RequestTimeout:   cfg.HTTP.RequestTimeout,
			AI:               aiService,
			Capabilities:     capabilitiesResolver,
			People:           peopleService,
		},
	)

	server := &http.Server{
		Addr:              cfg.HTTP.Addr,
		Handler:           apiServer.Routes(),
		ReadHeaderTimeout: cfg.HTTP.ReadHeaderTimeout,
		ReadTimeout:       cfg.HTTP.ReadTimeout,
		WriteTimeout:      cfg.HTTP.WriteTimeout,
		IdleTimeout:       cfg.HTTP.IdleTimeout,
	}

	var notifier *notifications.ReleaseNotifier
	if notificationsService != nil && savedService != nil {
		notifier = notifications.NewReleaseNotifier(releaseService, savedService, notificationsService, logger)
	}

	return &App{
		server:                server,
		notifier:              notifier,
		notificationsInterval: cfg.Notifications.Interval,
		shutdownTimeout:       cfg.Shutdown.Timeout,
		closeDB:               closeDB,
		logger:                logger,
	}, nil
}

func (a *App) Run(ctx context.Context) error {
	defer a.closeResources()

	group, ctx := errgroup.WithContext(ctx)
	group.Go(func() error {
		a.logger.Printf("DropDate API listening on %s", a.server.Addr)
		if err := a.server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			return err
		}
		return nil
	})

	if a.notifier != nil && a.notificationsInterval > 0 {
		group.Go(func() error {
			a.notifier.Run(ctx, a.notificationsInterval)
			return nil
		})
	}

	// Block until context cancellation, then attempt graceful shutdown.
	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), a.shutdownTimeout)
	defer cancel()

	if err := a.server.Shutdown(shutdownCtx); err != nil {
		a.logger.Printf("server shutdown error: %v", err)
	}

	if err := group.Wait(); err != nil && !errors.Is(err, context.Canceled) {
		return err
	}
	return nil
}

func (a *App) closeResources() {
	if a.closeDB == nil {
		return
	}
	if err := a.closeDB(); err != nil {
		a.logger.Printf("db close error: %v", err)
	}
}

func buildReleaseProviders(tmdbClient *tmdb.Client) ([]release.ReleaseProvider, release.SuggestionProvider) {
	var providers []release.ReleaseProvider
	var suggester release.SuggestionProvider

	if tmdbClient != nil {
		if p := release.NewTMDBProvider(tmdbClient); p != nil {
			providers = append(providers, p)
		}
		suggester = release.NewTMDBSuggestionProvider(tmdbClient)
	}

	return providers, suggester
}

func openDatabase(cfg DatabaseConfig) (*sql.DB, error) {
	db, err := sql.Open("pgx", cfg.DSN)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}

	return db, nil
}

func buildAuthService(db *sql.DB, cfg AuthConfig, sender email.Sender, emailCfg EmailConfig) (*auth.Service, error) {
	verifyBaseURL := emailCfg.VerifyBaseURL
	if verifyBaseURL == "" {
		verifyBaseURL = emailCfg.AppBaseURL
	}
	return auth.NewService(db, auth.Config{
		JWTSecret:                  []byte(cfg.JWTSecret),
		Issuer:                     cfg.Issuer,
		AccessTTL:                  cfg.AccessTTL,
		RefreshTTL:                 cfg.RefreshTTL,
		CookieName:                 cfg.CookieName,
		CookieSecure:               cfg.CookieSecure,
		RequireEmailVerification:   cfg.RequireEmailVerification,
		EmailVerificationTTL:       cfg.VerificationTTL,
		VerificationResendCooldown: cfg.VerificationResendCooldown,
		AppBaseURL:                 verifyBaseURL,
		EmailSender:                sender,
		EmailFrom:                  emailCfg.ResendSender,
	}), nil
}

func buildEmailSender(cfg EmailConfig, httpClient *http.Client) email.Sender {
	if cfg.ResendAPIKey == "" || cfg.ResendSender == "" {
		return nil
	}
	return email.NewResendSender(cfg.ResendAPIKey, httpClient)
}
