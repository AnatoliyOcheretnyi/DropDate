package main

import (
	"bufio"
	"context"
	"database/sql"
	"encoding/json" // стандартна бібліотека для кодування/декодування JSON.
	"errors"        // помічник для роботи з помилками та errors.Is().
	"fmt"
	"io"
	"log"      // вбудований логгер, щоб писати в stdout.
	"net/http" // базовий HTTP-стек Go.
	"os"       // читаємо конфіг з env.
	"os/signal"
	"strconv"
	"strings" // утиліти рядків для обрізання пробілів.
	"syscall"
	"time" // робота з часом та таймаутами.

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release" // бізнес-логіка релізів.
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"    // клієнт до TMDB.
	_ "github.com/jackc/pgx/v5/stdlib"
)

// application зберігає всі залежності HTTP-шару.
type application struct {
	releases *release.Service
	auth     *auth.Service
}

const tmdbTokenEnvVar = "TMDB_ACCESS_TOKEN"
const supabaseConnEnvVar = "SUPABASE_CONNECTION_STRING"

func main() {
	loadEnvFiles(".env", ".env.local")

	httpClient := &http.Client{Timeout: 5 * time.Second}

	var tmdbClient *tmdb.Client
	if token := os.Getenv(tmdbTokenEnvVar); token != "" {
		client, err := tmdb.NewClient(httpClient, token)
		if err != nil {
			log.Fatalf("failed to init TMDB client: %v", err)
		}
		tmdbClient = client
	} else {
		log.Printf("%s not set, continuing without TMDB integration", tmdbTokenEnvVar)
	}

	var providers []release.ReleaseProvider
	var suggester release.SuggestionProvider

	if tmdbClient != nil {
		if p := release.NewTMDBProvider(tmdbClient); p != nil {
			providers = append(providers, p)
		}
		suggester = release.NewTMDBSuggestionProvider(tmdbClient)
	}

	if len(providers) == 0 {
		log.Fatal("no release providers configured")
	}

	app := &application{
		releases: release.NewService(providers, suggester, log.Default()),
	}

	if db := openDatabase(); db != nil {
		authService, err := buildAuthService(db)
		if err != nil {
			log.Fatalf("failed to init auth service: %v", err)
		}
		app.auth = authService
	}

	// http.NewServeMux() створює внутрішній роутер "шлях -> хендлер".
	mux := http.NewServeMux()
	mux.HandleFunc("/health", app.healthHandler)
	mux.HandleFunc("/next-release", app.nextReleaseHandler)
	mux.HandleFunc("/suggest", app.suggestHandler)
	mux.HandleFunc("/trending", app.trendingHandler)
	mux.HandleFunc("/search", app.searchHandler)
	mux.HandleFunc("/details", app.detailsHandler)
	mux.HandleFunc("/bulk-next-release", app.bulkNextReleaseHandler)
	mux.HandleFunc("/auth/register", app.registerHandler)
	mux.HandleFunc("/auth/login", app.loginHandler)
	mux.HandleFunc("/auth/refresh", app.refreshHandler)
	mux.HandleFunc("/auth/logout", app.logoutHandler)
	// Через /swagger/ віддаємо статичну сторінку з документацією (Swagger UI).
	mux.Handle("/swagger/", http.StripPrefix("/swagger/", http.FileServer(http.Dir("./docs/swagger"))))

	// http.Server дає контроль над портом, таймаутами та middleware-ланцюжком.
	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("DropDate API listening on %s", server.Addr)

	go func() {
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server error: %v", err)
		}
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, syscall.SIGINT, syscall.SIGTERM)
	<-shutdown

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("server shutdown error: %v", err)
	}
}

func openDatabase() *sql.DB {
	dsn := strings.TrimSpace(os.Getenv(supabaseConnEnvVar))
	if dsn == "" {
		log.Printf("%s not set, auth endpoints are disabled", supabaseConnEnvVar)
		return nil
	}

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		log.Printf("failed to open database: %v", err)
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		log.Printf("db ping failed: %v", err)
		_ = db.Close()
		return nil
	}

	return db
}

func buildAuthService(db *sql.DB) (*auth.Service, error) {
	secret := strings.TrimSpace(os.Getenv("AUTH_JWT_SECRET"))
	if secret == "" {
		return nil, fmt.Errorf("AUTH_JWT_SECRET is required")
	}
	issuer := strings.TrimSpace(os.Getenv("AUTH_JWT_ISSUER"))
	if issuer == "" {
		issuer = "dropdate"
	}
	accessTTL := parseDurationEnv("AUTH_ACCESS_TTL", 15*time.Minute)
	refreshTTL := parseDurationEnv("AUTH_REFRESH_TTL", 30*24*time.Hour)
	cookieName := strings.TrimSpace(os.Getenv("AUTH_COOKIE_NAME"))
	if cookieName == "" {
		cookieName = "dd_refresh"
	}
	cookieSecure := strings.EqualFold(strings.TrimSpace(os.Getenv("AUTH_COOKIE_SECURE")), "true")

	return auth.NewService(db, auth.Config{
		JWTSecret:    []byte(secret),
		Issuer:       issuer,
		AccessTTL:    accessTTL,
		RefreshTTL:   refreshTTL,
		CookieName:   cookieName,
		CookieSecure: cookieSecure,
	}), nil
}

func parseDurationEnv(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	if parsed, err := time.ParseDuration(raw); err == nil {
		return parsed
	}
	return fallback
}

func loadEnvFiles(paths ...string) {
	for _, path := range paths {
		file, err := os.Open(path)
		if err != nil {
			continue
		}

		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}

			parts := strings.SplitN(line, "=", 2)
			if len(parts) != 2 {
				continue
			}

			key := strings.TrimSpace(parts[0])
			value := strings.TrimSpace(parts[1])

			if key == "" {
				continue
			}
			if _, exists := os.LookupEnv(key); exists {
				continue
			}
			if err := os.Setenv(key, value); err != nil {
				log.Printf("failed to set env %s from %s: %v", key, path, err)
			}
		}

		if err := scanner.Err(); err != nil {
			log.Printf("error reading %s: %v", path, err)
		}

		_ = file.Close()
	}
}

func (app *application) healthHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/json")

	response := map[string]string{
		"status": "ok",
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

func (app *application) nextReleaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	title := strings.TrimSpace(r.URL.Query().Get("title"))
	if title == "" {
		http.Error(w, "title query parameter is required", http.StatusBadRequest)
		return
	}

	var hint *release.LookupHint
	if idStr := strings.TrimSpace(r.URL.Query().Get("tmdbId")); idStr != "" {
		if id, err := strconv.Atoi(idStr); err == nil && id > 0 {
			hint = &release.LookupHint{
				TMDBID:    id,
				MediaType: strings.TrimSpace(r.URL.Query().Get("mediaType")),
			}
		}
	}

	if hint != nil {
		log.Printf("next-release query: title=%q tmdbId=%d mediaType=%s", title, hint.TMDBID, hint.MediaType)
	} else {
		log.Printf("next-release query: title=%q (no hint)", title)
	}

	info, err := app.releases.NextRelease(r.Context(), title, hint)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			http.Error(w, "release not found", http.StatusNotFound)
			return
		}
		log.Printf("release lookup failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(info); err != nil {
		log.Printf("failed to encode response: %v", err)
	}
}

func (app *application) suggestHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if len(query) < 2 {
		http.Error(w, "query should be at least 2 characters", http.StatusBadRequest)
		return
	}

	limit := 5
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	results, err := app.releases.Suggestions(r.Context(), query, limit)
	if err != nil {
		log.Printf("suggestions failed: %v", err)
		http.Error(w, "failed to fetch suggestions", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"results": results}); err != nil {
		log.Printf("failed to encode suggestions: %v", err)
	}
}

func (app *application) trendingHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	window := strings.TrimSpace(r.URL.Query().Get("window"))
	limit := 18
	if limitStr := strings.TrimSpace(r.URL.Query().Get("limit")); limitStr != "" {
		if parsed, err := strconv.Atoi(limitStr); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	movies, err := app.releases.TrendingByType(r.Context(), "movie", window, limit)
	if err != nil {
		log.Printf("trending movies failed: %v", err)
		http.Error(w, "failed to fetch trending movies", http.StatusInternalServerError)
		return
	}

	series, err := app.releases.TrendingByType(r.Context(), "tv", window, limit)
	if err != nil {
		log.Printf("trending series failed: %v", err)
		http.Error(w, "failed to fetch trending series", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{
		"movies": movies,
		"series": series,
	}); err != nil {
		log.Printf("failed to encode trending: %v", err)
	}
}

func (app *application) searchHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := strings.TrimSpace(r.URL.Query().Get("query"))
	if query == "" {
		http.Error(w, "query is required", http.StatusBadRequest)
		return
	}

	page := 1
	if pageStr := strings.TrimSpace(r.URL.Query().Get("page")); pageStr != "" {
		if parsed, err := strconv.Atoi(pageStr); err == nil && parsed > 0 {
			page = parsed
		}
	}

	results, err := app.releases.Search(r.Context(), query, page)
	if err != nil {
		log.Printf("search failed: %v", err)
		http.Error(w, "failed to fetch search results", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(results); err != nil {
		log.Printf("failed to encode search: %v", err)
	}
}

type detailsResponse struct {
	Details         release.Details      `json:"details"`
	Release         *release.Info        `json:"release,omitempty"`
	Recommendations []release.Suggestion `json:"recommendations,omitempty"`
}

func (app *application) detailsHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	tmdbIDStr := strings.TrimSpace(r.URL.Query().Get("tmdbId"))
	if tmdbIDStr == "" {
		http.Error(w, "tmdbId is required", http.StatusBadRequest)
		return
	}
	tmdbID, err := strconv.Atoi(tmdbIDStr)
	if err != nil || tmdbID <= 0 {
		http.Error(w, "invalid tmdbId", http.StatusBadRequest)
		return
	}

	mediaType := strings.TrimSpace(r.URL.Query().Get("mediaType"))
	if mediaType == "" {
		http.Error(w, "mediaType is required", http.StatusBadRequest)
		return
	}

	details, err := app.releases.Details(r.Context(), tmdbID, mediaType)
	if err != nil {
		if errors.Is(err, release.ErrNotFound) {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		log.Printf("details failed: %v", err)
		http.Error(w, "failed to fetch details", http.StatusInternalServerError)
		return
	}

	recommendations, err := app.releases.Recommendations(r.Context(), tmdbID, mediaType, 12)
	if err != nil {
		log.Printf("recommendations failed: %v", err)
		recommendations = []release.Suggestion{}
	}

	var releaseInfo *release.Info
	if details.Title != "" {
		info, err := app.releases.NextRelease(
			r.Context(),
			details.Title,
			&release.LookupHint{TMDBID: tmdbID, MediaType: mediaType},
		)
		if err == nil {
			releaseInfo = &info
		}
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(detailsResponse{
		Details:         details,
		Release:         releaseInfo,
		Recommendations: recommendations,
	}); err != nil {
		log.Printf("failed to encode details: %v", err)
	}
}

type bulkNextReleaseRequest struct {
	Items []bulkNextReleaseItem `json:"items"`
}

type bulkNextReleaseItem struct {
	ClientID  string `json:"clientId"`
	Title     string `json:"title"`
	TMDBID    int    `json:"tmdbId"`
	MediaType string `json:"mediaType"`
}

type bulkNextReleaseResult struct {
	ClientID string        `json:"clientId"`
	Info     *release.Info `json:"info,omitempty"`
	Error    string        `json:"error,omitempty"`
}

func (app *application) bulkNextReleaseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var payload bulkNextReleaseRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	results := make([]bulkNextReleaseResult, 0, len(payload.Items))
	if len(payload.Items) == 0 {
		http.Error(w, "items array is required", http.StatusBadRequest)
		return
	}

	for _, item := range payload.Items {
		entry := bulkNextReleaseResult{ClientID: item.ClientID}
		title := strings.TrimSpace(item.Title)
		if title == "" && item.TMDBID == 0 {
			entry.Error = "title or tmdbId is required"
			results = append(results, entry)
			continue
		}

		lookupTitle := title
		if lookupTitle == "" {
			lookupTitle = fmt.Sprintf("tmdb:%d", item.TMDBID)
		}

		var hint *release.LookupHint
		if item.TMDBID > 0 {
			hint = &release.LookupHint{
				TMDBID:    item.TMDBID,
				MediaType: item.MediaType,
			}
		}

		info, err := app.releases.NextRelease(r.Context(), lookupTitle, hint)
		if err != nil {
			if errors.Is(err, release.ErrNotFound) {
				entry.Error = "not found"
			} else {
				entry.Error = err.Error()
			}
		} else {
			copyInfo := info
			entry.Info = &copyInfo
		}

		results = append(results, entry)
	}

	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(map[string]any{"results": results}); err != nil {
		log.Printf("failed to encode bulk response: %v", err)
	}
}

type authRequest struct {
	Email          string `json:"email"`
	Password       string `json:"password"`
	Client         string `json:"client,omitempty"`
	ReturnRefresh  bool   `json:"returnRefresh,omitempty"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type authUserResponse struct {
	ID    string `json:"id"`
	Email string `json:"email"`
}

type authResponse struct {
	AccessToken  string           `json:"accessToken"`
	ExpiresAt    time.Time        `json:"expiresAt"`
	RefreshToken *string          `json:"refreshToken,omitempty"`
	User         authUserResponse `json:"user"`
}

func (app *application) registerHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if app.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	result, err := app.auth.Register(r.Context(), payload.Email, payload.Password)
	if err != nil {
		switch {
		case errors.Is(err, auth.ErrEmailExists):
			http.Error(w, "email already registered", http.StatusConflict)
		case errors.Is(err, auth.ErrWeakPassword):
			http.Error(w, "password does not meet policy", http.StatusBadRequest)
		case errors.Is(err, auth.ErrInvalidEmail):
			http.Error(w, "invalid email", http.StatusBadRequest)
		default:
			log.Printf("register failed: %v", err)
			http.Error(w, "internal server error", http.StatusInternalServerError)
		}
		return
	}

	app.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	app.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (app *application) loginHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if app.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	var payload authRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "invalid JSON body", http.StatusBadRequest)
		return
	}

	result, err := app.auth.Login(r.Context(), payload.Email, payload.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			http.Error(w, "invalid credentials", http.StatusUnauthorized)
			return
		}
		log.Printf("login failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	app.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	app.writeAuthResponse(w, result, shouldReturnRefresh(payload))
}

func (app *application) refreshHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if app.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	cookieName := app.auth.Config().CookieName
	refreshToken, fromBody := readRefreshToken(r, cookieName)
	if refreshToken == "" {
		http.Error(w, "missing refresh token", http.StatusUnauthorized)
		return
	}

	result, err := app.auth.Refresh(r.Context(), refreshToken)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidToken) {
			http.Error(w, "invalid refresh token", http.StatusUnauthorized)
			return
		}
		log.Printf("refresh failed: %v", err)
		http.Error(w, "internal server error", http.StatusInternalServerError)
		return
	}

	app.setRefreshCookie(w, result.RefreshToken, result.RefreshExpiresAt)
	app.writeAuthResponse(w, result, fromBody)
}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if app.auth == nil {
		http.Error(w, "auth service unavailable", http.StatusServiceUnavailable)
		return
	}

	cookieName := app.auth.Config().CookieName
	refreshToken, _ := readRefreshToken(r, cookieName)
	if refreshToken != "" {
		if err := app.auth.Logout(r.Context(), refreshToken); err != nil {
			log.Printf("logout failed: %v", err)
		}
	}

	app.clearRefreshCookie(w)
	w.WriteHeader(http.StatusNoContent)
}

func (app *application) setRefreshCookie(w http.ResponseWriter, token string, expiresAt time.Time) {
	cfg := app.auth.Config()
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.CookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (app *application) clearRefreshCookie(w http.ResponseWriter) {
	cfg := app.auth.Config()
	http.SetCookie(w, &http.Cookie{
		Name:     cfg.CookieName,
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   cfg.CookieSecure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (app *application) writeAuthResponse(w http.ResponseWriter, result auth.TokenPair, includeRefresh bool) {
	var refresh *string
	if includeRefresh {
		refresh = &result.RefreshToken
	}
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(authResponse{
		AccessToken:  result.AccessToken,
		ExpiresAt:    result.AccessExpiresAt,
		RefreshToken: refresh,
		User: authUserResponse{
			ID:    result.User.ID,
			Email: result.User.Email,
		},
	}); err != nil {
		log.Printf("failed to encode auth response: %v", err)
	}
}

func shouldReturnRefresh(payload authRequest) bool {
	if payload.ReturnRefresh {
		return true
	}
	return strings.EqualFold(payload.Client, "mobile")
}

func readRefreshToken(r *http.Request, cookieName string) (string, bool) {
	if cookie, err := r.Cookie(cookieName); err == nil && cookie.Value != "" {
		return cookie.Value, false
	}

	var payload refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		if errors.Is(err, io.EOF) {
			return "", false
		}
		return "", false
	}
	token := strings.TrimSpace(payload.RefreshToken)
	if token == "" {
		return "", false
	}
	return token, true
}
