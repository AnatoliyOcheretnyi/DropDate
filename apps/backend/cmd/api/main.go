package main

import (
	"encoding/json" // стандартна бібліотека для кодування/декодування JSON.
	"errors"        // помічник для роботи з помилками та errors.Is().
	"log"           // вбудований логгер, щоб писати в stdout.
	"net/http"      // базовий HTTP-стек Go.
	"strings"       // утиліти рядків для обрізання пробілів.
	"time"          // робота з часом та таймаутами.

	"github.com/AnatoliyOcheretnyi/dropdate/internal/release" // бізнес-логіка релізів.
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tvmaze"  // HTTP-клієнт до зовнішнього API.
)

// application зберігає всі залежності HTTP-шару.
type application struct {
	releases *release.Service
}

func main() {
	// окремо створюємо клієнт до TVMaze, щоб інжектити як залежність.
	tvmazeClient := tvmaze.NewClient(&http.Client{Timeout: 5 * time.Second})
	app := &application{
		releases: release.NewService(tvmazeClient),
	}

	// http.NewServeMux() створює внутрішній роутер "шлях -> хендлер".
	mux := http.NewServeMux()
	mux.HandleFunc("/health", app.healthHandler)
	mux.HandleFunc("/next-release", app.nextReleaseHandler)
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

	info, err := app.releases.NextRelease(r.Context(), title)
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
