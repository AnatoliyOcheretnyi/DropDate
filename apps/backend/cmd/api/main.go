package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/httpapi"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/tmdb"
)

const tmdbTokenEnvVar = "TMDB_ACCESS_TOKEN"

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

	releaseService := release.NewService(providers, suggester, log.Default())

	var authService *auth.Service
	if db := openDatabase(); db != nil {
		service, err := buildAuthService(db)
		if err != nil {
			log.Fatalf("failed to init auth service: %v", err)
		}
		authService = service
	}

	apiServer := httpapi.NewServer(releaseService, authService, log.Default())

	server := &http.Server{
		Addr:              ":8080",
		Handler:           apiServer.Routes(),
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
