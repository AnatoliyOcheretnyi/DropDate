package main

import (
	"bufio"
	"encoding/json" // стандартна бібліотека для кодування/декодування JSON.
	"errors"        // помічник для роботи з помилками та errors.Is().
	"log"           // вбудований логгер, щоб писати в stdout.
	"net/http"      // базовий HTTP-стек Go.
	"os"            // читаємо конфіг з env.
	"strconv"
	"strings" // утиліти рядків для обрізання пробілів.
	"time"    // робота з часом та таймаутами.

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release" // бізнес-логіка релізів.
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"    // клієнт до TMDB.
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tvmaze"  // HTTP-клієнт до зовнішнього API.
)

// application зберігає всі залежності HTTP-шару.
type application struct {
	releases *release.Service
}

const tmdbTokenEnvVar = "TMDB_ACCESS_TOKEN"

func main() {
	loadEnvFiles(".env", ".env.local")

	httpClient := &http.Client{Timeout: 5 * time.Second}

	// окремо створюємо клієнт до TVMaze, щоб інжектити як залежність.
	tvmazeClient := tvmaze.NewClient(httpClient)

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

	if p := release.NewTVMazeProvider(tvmazeClient); p != nil {
		providers = append(providers, p)
	}

	if len(providers) == 0 {
		log.Fatal("no release providers configured")
	}

	app := &application{
		releases: release.NewService(providers, suggester, log.Default()),
	}

	// http.NewServeMux() створює внутрішній роутер "шлях -> хендлер".
	mux := http.NewServeMux()
	mux.HandleFunc("/health", app.healthHandler)
	mux.HandleFunc("/next-release", app.nextReleaseHandler)
	mux.HandleFunc("/suggest", app.suggestHandler)
	// Через /swagger/ віддаємо статичну сторінку з документацією (Swagger UI).
	mux.Handle("/swagger/", http.StripPrefix("/swagger/", http.FileServer(http.Dir("./docs/swagger"))))

	// http.Server дає контроль над портом, таймаутами та middleware-ланцюжком.
	server := &http.Server{
		Addr:              ":8080",
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("DropDate API listening on %s", server.Addr)

	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server error: %v", err)
	}
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
