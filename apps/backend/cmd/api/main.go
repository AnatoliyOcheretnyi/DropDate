package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/app"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/config"
)

func main() {
	config.LoadEnvFiles(".env", ".env.local")

	cfg, err := app.LoadConfig()
	if err != nil {
		log.Fatalf("config error: %v", err)
	}

	appInstance, err := app.New(cfg, log.Default())
	if err != nil {
		log.Fatalf("app init error: %v", err)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := appInstance.Run(ctx); err != nil {
		log.Fatalf("app stopped with error: %v", err)
	}
}
