package httpapi

import "net/http"

type errorResponse struct {
	Error   string `json:"error"`
	Code    string `json:"code,omitempty"`
	Details any    `json:"details,omitempty"`
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, errorResponse{Error: message})
}

func writeErrorWithDetails(w http.ResponseWriter, status int, code string, message string, details any) {
	writeJSON(w, status, errorResponse{
		Error:   message,
		Code:    code,
		Details: details,
	})
}

func methodNotAllowed(w http.ResponseWriter) {
	writeError(w, http.StatusMethodNotAllowed, "method not allowed")
}
