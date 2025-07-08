document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const addDateForm = document.getElementById('add-date-form');
    const formMessage = document.getElementById('form-message');
    const existingDatesList = document.getElementById('existing-dates-list');

    let authToken = null;

    // --- LOGIN LOGIC ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = ""; // Clear previous errors
        const password = document.getElementById('password').value;

        if (!password) {
            loginError.textContent = "Please enter a password.";
            return;
        }

        try {
            // Call the new /api/login endpoint to verify the password
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password: password })
            });

            if (response.ok) {
                // If login is successful (status 200 OK)
                authToken = password; // Store the password for subsequent API calls
                console.log("Login successful. Hiding login section, showing dashboard.");
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                loadExistingDates();
            } else {
                // If login fails (e.g., 401 Unauthorized)
                const errorData = await response.json();
                loginError.textContent = errorData.error || "Login failed. Please try again.";
            }
        } catch (error) {
            console.error("Login API call failed:", error);
            loginError.textContent = "An error occurred during login. Please check the console.";
        }
    });

    // --- LOAD EXISTING DATES ---
    async function loadExistingDates() {
        existingDatesList.innerHTML = '<p>Loading dates...</p>';
        if (!authToken) {
            console.error("Auth token is not set. Cannot load dates.");
            existingDatesList.innerHTML = `<p style="color: red;">Error: Not logged in.</p>`;
            return;
        }
        
        try {
            // We use the public endpoint to get dates, which doesn't require auth
            const response = await fetch('/api/get_dates');
            
            if (!response.ok) {
                throw new Error(`Failed to fetch dates. Status: ${response.status}`);
            }
            
            const dates = await response.json();
            existingDatesList.innerHTML = '';

            if (dates.length === 0) {
                existingDatesList.innerHTML = '<p>No dates found.</p>';
                return;
            }
            
            // Sort dates client-side
            dates.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

            dates.forEach(date => {
                const div = document.createElement('div');
                div.className = 'date-entry';
                // Handle potential timezone issues by creating date in UTC
                const eventDate = new Date(date.event_date + 'T00:00:00Z');
                const formattedDate = eventDate.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
                
                div.innerHTML = `
                    <span>${formattedDate} - ${date.venue}, ${date.city}</span>
                    <button class="btn btn-delete" data-id="${date.id}">Delete</button>
                `;
                existingDatesList.appendChild(div);
            });

        } catch (error) {
            console.error("Error loading dates:", error);
            existingDatesList.innerHTML = `<p style="color: red;">Error: ${error.message}</p>`;
        }
    }

    // --- ADD NEW DATE ---
    addDateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        formMessage.textContent = '';

        const newDate = {
            event_date: document.getElementById('event_date').value,
            venue: document.getElementById('venue').value,
            city: document.getElementById('city').value,
            ticket_url: document.getElementById('ticket_url').value,
        };

        try {
            const response = await fetch('/api/manage_dates', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(newDate)
            });

            if (response.status === 401) {
                throw new Error('Authentication failed. The password may be incorrect.');
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            formMessage.style.color = 'lightgreen';
            formMessage.textContent = 'Date added successfully!';
            addDateForm.reset();
            loadExistingDates(); // Refresh the list

        } catch (error) {
            formMessage.style.color = 'red';
            formMessage.textContent = `Error: ${error.message}`;
        }
    });

    // --- DELETE DATE ---
    existingDatesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const dateId = e.target.dataset.id;
            if (!confirm('Are you sure you want to delete this date?')) return;

            try {
                const response = await fetch('/api/manage_dates', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ id: parseInt(dateId) })
                });

                if (response.status === 401) {
                     throw new Error('Authentication failed. The password may be incorrect.');
                }
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
                    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
                }

                alert('Date deleted successfully!');
                loadExistingDates(); // Refresh the list

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });
});
