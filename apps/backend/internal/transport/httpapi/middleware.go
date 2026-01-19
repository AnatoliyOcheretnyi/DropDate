package httpapi

import (
	"context"
	"net/http"
	"time"

	"github.com/AnatoliyOcheretnyi/dropdate/internal/observability"
)

const requestIDHeader = "X-Request-ID"

type statusWriter struct {
	http.ResponseWriter
	status int
	bytes  int
}

func (w *statusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *statusWriter) Write(p []byte) (int, error) {
	if w.status == 0 {
		w.status = http.StatusOK
	}
	n, err := w.ResponseWriter.Write(p)
	w.bytes += n
	return n, err
}

func (s *Server) withMiddleware(next http.Handler) http.Handler {
	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.requestTimeout > 0 {
			ctx, cancel := context.WithTimeout(r.Context(), s.requestTimeout)
			defer cancel()
			r = r.WithContext(ctx)
		}

		requestID := r.Header.Get(requestIDHeader)
		if requestID == "" {
			requestID = observability.NewRequestID()
		}
		if requestID != "" {
			w.Header().Set(requestIDHeader, requestID)
			r = r.WithContext(observability.WithRequestID(r.Context(), requestID))
		}

		sw := &statusWriter{ResponseWriter: w}
		start := time.Now()
		defer func() {
			if recovered := recover(); recovered != nil {
				s.logger.Printf("request_id=%s panic=%v", requestID, recovered)
				writeError(sw, http.StatusInternalServerError, "internal server error")
			}
		}()

		next.ServeHTTP(sw, r)
		duration := time.Since(start)

		status := sw.status
		if status == 0 {
			status = http.StatusOK
		}
		s.logger.Printf(
			"request_id=%s method=%s path=%s status=%d bytes=%d duration=%s",
			requestID,
			r.Method,
			r.URL.Path,
			status,
			sw.bytes,
			duration,
		)
	})

	return handler
}
