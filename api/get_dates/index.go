package handler

import (
	"fmt"
	"io"
	"net/http"
	"os"
)

// This function handles GET requests to /api/get_dates
// It fetches all tour dates from Supabase and returns them as JSON.
func Handler(w http.ResponseWriter, r *http.Request) {
	// Only allow GET method
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Get Supabase credentials from environment variables
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseAnonKey := os.Getenv("SUPABASE_ANON_KEY")

	if supabaseURL == "" || supabaseAnonKey == "" {
		http.Error(w, "Supabase environment variables not set", http.StatusInternalServerError)
		return
	}

	// Construct the Supabase API URL to get all rows from the 'tour_dates' table
	// The `order` query parameter sorts the results by date
	apiURL := fmt.Sprintf("%s/rest/v1/tour_dates?select=*&order=event_date.asc", supabaseURL)

	// Create a new HTTP request
	req, err := http.NewRequest("GET", apiURL, nil)
	if err != nil {
		http.Error(w, "Failed to create request", http.StatusInternalServerError)
		return
	}

	// Set the required headers for Supabase
	req.Header.Set("apikey", supabaseAnonKey)
	req.Header.Set("Authorization", "Bearer "+supabaseAnonKey)

	// Execute the request
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		http.Error(w, "Failed to fetch data from Supabase", http.StatusInternalServerError)
		return
	}
	defer resp.Body.Close()

	// Set the Content-Type header of our response to application/json
	w.Header().Set("Content-Type", "application/json")
	// Set the status code to match Supabase's response
	w.WriteHeader(resp.StatusCode)

	// Copy the body from the Supabase response directly to our response writer
	io.Copy(w, resp.Body)
}
