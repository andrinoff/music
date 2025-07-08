package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

// This function handles POST (create) and DELETE requests to /api/manage_dates
func Handler(w http.ResponseWriter, r *http.Request) {
	// Get credentials from environment variables
	supabaseURL := os.Getenv("SUPABASE_URL")
	// Use the SERVICE_ROLE_KEY for write operations
	supabaseServiceKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")
	adminSecret := os.Getenv("ADMIN_SECRET")

	if supabaseURL == "" || supabaseServiceKey == "" || adminSecret == "" {
		jsonError(w, "Server configuration error", http.StatusInternalServerError)
		return
	}

	// --- Authentication ---
	authHeader := r.Header.Get("Authorization")
	if authHeader == "" {
		jsonError(w, "Authorization header required", http.StatusUnauthorized)
		return
	}
	tokenParts := strings.Split(authHeader, " ")
	if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
		jsonError(w, "Invalid Authorization header format", http.StatusUnauthorized)
		return
	}
	token := tokenParts[1]

	if token != adminSecret {
		jsonError(w, "Invalid token", http.StatusUnauthorized)
		return
	}
	// --- End Authentication ---

	// Route request based on HTTP method
	switch r.Method {
	case http.MethodPost:
		handlePost(w, r, supabaseURL, supabaseServiceKey)
	case http.MethodDelete:
		handleDelete(w, r, supabaseURL, supabaseServiceKey)
	default:
		jsonError(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

// Handles creating a new date
func handlePost(w http.ResponseWriter, r *http.Request, url, key string) {
	apiURL := fmt.Sprintf("%s/rest/v1/tour_dates", url)

	// We proxy the request body directly to Supabase
	body, err := io.ReadAll(r.Body)
	if err != nil {
		jsonError(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	req, err := http.NewRequest("POST", apiURL, bytes.NewBuffer(body))
	if err != nil {
		jsonError(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set headers for creating a new item
	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal") // Don't return the created object in the body

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		jsonError(w, "Failed to send data to Supabase", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Handles deleting a date
func handleDelete(w http.ResponseWriter, r *http.Request, url, key string) {
	// Parse the incoming JSON to get the ID
	var payload struct {
		ID int `json:"id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		jsonError(w, "Invalid request body. Expecting { \"id\": ... }", http.StatusBadRequest)
		return
	}

	// Construct the URL to delete a specific item by its ID
	apiURL := fmt.Sprintf("%s/rest/v1/tour_dates?id=eq.%d", url, payload.ID)

	req, err := http.NewRequest("DELETE", apiURL, nil)
	if err != nil {
		jsonError(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	req.Header.Set("apikey", key)
	req.Header.Set("Authorization", "Bearer "+key)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		jsonError(w, "Failed to send delete request to Supabase", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
}

// Helper to return JSON errors
func jsonError(w http.ResponseWriter, message string, code int) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	json.NewEncoder(w).Encode(map[string]string{"error": message})
}
