package handler

import (
	"encoding/json"
	"net/http"
	"os"
)

// Define a struct for the expected request body from the frontend
type LoginPayload struct {
	Password string `json:"password"`
}

// Handler function for the /api/login endpoint.
// It verifies the password sent from the admin login form.
func Handler(w http.ResponseWriter, r *http.Request) {
	// We only expect POST requests to this endpoint
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Retrieve the secret password from the environment variables set in Vercel
	adminSecret := os.Getenv("ADMIN_SECRET")
	if adminSecret == "" {
		jsonError(w, "Server configuration error: ADMIN_SECRET not set", http.StatusInternalServerError)
		return
	}

	// Decode the JSON payload from the request body
	var payload LoginPayload
	err := json.NewDecoder(r.Body).Decode(&payload)
	if err != nil {
		jsonError(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Compare the password from the payload with the secret password
	if payload.Password == adminSecret {
		// If the passwords match, send a success response.
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]string{"message": "Login successful"})
	} else {
		// If they don't match, send a 401 Unauthorized error.
		jsonError(w, "Invalid password", http.StatusUnauthorized)
	}
}

// jsonError is a helper function to format error messages as JSON.
func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
