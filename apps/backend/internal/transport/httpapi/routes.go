package httpapi

import "net/http"

func (s *Server) registerRoutes(mux *http.ServeMux) {
	mux.HandleFunc("/health", s.healthHandler)
	mux.HandleFunc("/ready", s.readyHandler)
	mux.HandleFunc("/next-release", s.nextReleaseHandler)
	mux.HandleFunc("/suggest", s.suggestHandler)
	mux.HandleFunc("/trending", s.trendingHandler)
	mux.HandleFunc("/popular", s.popularHandler)
	mux.HandleFunc("/top-rated", s.topRatedHandler)
	mux.HandleFunc("/upcoming", s.upcomingHandler)
	mux.HandleFunc("/search", s.searchHandler)
	mux.HandleFunc("/details", s.detailsHandler)
	mux.HandleFunc("/bulk-next-release", s.bulkNextReleaseHandler)
	mux.HandleFunc("/saved", s.savedHandler)
	mux.HandleFunc("/saved/items", s.savedItemHandler)
	mux.HandleFunc("/notifications", s.notificationsHandler)
	mux.HandleFunc("/notifications/read", s.notificationsReadHandler)
	mux.HandleFunc("/jobs/notifications", s.notificationsJobHandler)
	mux.HandleFunc("/auth/register", s.registerHandler)
	mux.HandleFunc("/auth/login", s.loginHandler)
	mux.HandleFunc("/auth/refresh", s.refreshHandler)
	mux.HandleFunc("/auth/logout", s.logoutHandler)
	mux.HandleFunc("/auth/verify", s.verifyEmailHandler)
	mux.HandleFunc("/auth/verify/resend", s.resendVerificationHandler)

	mux.Handle("/swagger/", http.StripPrefix("/swagger/", http.FileServer(http.Dir("./docs/swagger"))))
}
