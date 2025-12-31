package httpapi

import (
	"context"
	"log"
	"net/http"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/auth"
	"github.com/AnatoliyOcheretnyi/dropdate/internal/release"
)

type AuthService interface {
	Register(ctx context.Context, email, password string) (auth.TokenPair, error)
	Login(ctx context.Context, email, password string) (auth.TokenPair, error)
	Refresh(ctx context.Context, refreshToken string) (auth.TokenPair, error)
	Logout(ctx context.Context, refreshToken string) error
	Config() auth.Config
}

type Server struct {
	releases *release.Service
	auth     AuthService
	logger   *log.Logger
}

func NewServer(releases *release.Service, authSvc AuthService, logger *log.Logger) *Server {
	if logger == nil {
		logger = log.Default()
	}
	return &Server{
		releases: releases,
		auth:     authSvc,
		logger:   logger,
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	s.registerRoutes(mux)
	return mux
}
