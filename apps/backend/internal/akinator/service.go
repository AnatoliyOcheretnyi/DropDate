package akinator

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"sync"
	"time"
)

var ErrUnavailable = errors.New("akinator dataset unavailable")

type Service struct {
	store  *Store
	mu     sync.RWMutex
	engine *Engine
}

func NewService(store *Store) *Service { return &Service{store: store} }

func (s *Service) Reload(ctx context.Context) error {
	movies, err := s.store.LoadAll(ctx)
	if err != nil {
		return err
	}
	s.mu.Lock()
	s.engine = NewEngine(movies, time.Now())
	s.mu.Unlock()
	return nil
}

func (s *Service) Start() (StartResult, error) {
	s.mu.RLock()
	engine := s.engine
	s.mu.RUnlock()
	if engine == nil {
		return StartResult{}, ErrUnavailable
	}
	question, ok := engine.Start()
	if !ok {
		return StartResult{}, ErrUnavailable
	}
	return StartResult{SessionToken: newSessionToken(), Question: question, Step: 1, Candidates: len(engine.movies)}, nil
}

func (s *Service) Next(answers []AnsweredQuestion) (StepResult, error) {
	s.mu.RLock()
	engine := s.engine
	s.mu.RUnlock()
	if engine == nil {
		return StepResult{}, ErrUnavailable
	}
	return engine.Next(answers)
}

func (s *Service) LogResult(ctx context.Context, input ResultInput) error {
	if input.SessionToken == "" || input.GuessTMDBID <= 0 {
		return ErrInvalidHistory
	}
	return s.store.LogResult(ctx, input)
}

func newSessionToken() string {
	raw := make([]byte, 12)
	if _, err := rand.Read(raw); err != nil {
		return "ak_" + hex.EncodeToString([]byte(time.Now().Format(time.RFC3339Nano)))
	}
	return "ak_" + hex.EncodeToString(raw)
}
