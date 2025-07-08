document.addEventListener('DOMContentLoaded', () => {
    const loginSection = document.getElementById('login-section');
    const dashboardSection = document.getElementById('dashboard-section');
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');
    const addDateForm = document.getElementById('add-date-form');
    const formMessage = document.getElementById('form-message');
    const existingDatesList = document.getElementById('existing-dates-list');

    let authToken = null;

    // --- MODAL LOGIC ---
    function setupModal() {
        // Create modal HTML structure dynamically
        const modalHTML = `
            <div id="custom-modal-overlay" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.6); z-index: 1000; justify-content: center; align-items: center;">
                <div id="custom-modal-box" style="background: #2c2c2c; padding: 25px; border-radius: 10px; box-shadow: 0 5px 15px rgba(0,0,0,0.5); text-align: center; max-width: 400px; width: 90%;">
                    <h3 id="modal-title" style="margin-top: 0; color: #fff;"></h3>
                    <p id="modal-message" style="color: #e0e0e0;"></p>
                    <div id="modal-buttons">
                        <!-- Buttons will be added here -->
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    function showModal(title, message, buttons) {
        const overlay = document.getElementById('custom-modal-overlay');
        document.getElementById('modal-title').textContent = title;
        document.getElementById('modal-message').textContent = message;
        const buttonsContainer = document.getElementById('modal-buttons');
        buttonsContainer.innerHTML = ''; // Clear old buttons

        if (buttons) {
            buttons.forEach(btnInfo => {
                const button = document.createElement('button');
                button.textContent = btnInfo.text;
                button.className = btnInfo.class || 'btn'; // Reuse existing btn style
                button.style.margin = '0 10px';
                button.onclick = () => {
                    overlay.style.display = 'none';
                    if (btnInfo.onClick) btnInfo.onClick();
                };
                buttonsContainer.appendChild(button);
            });
        } else {
            // Default "OK" button if none are provided
            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.className = 'btn';
            okButton.onclick = () => overlay.style.display = 'none';
            buttonsContainer.appendChild(okButton);
        }

        overlay.style.display = 'flex';
    }
    
    // Create the modal once the DOM is loaded
    setupModal();

    // --- LOGIN LOGIC ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.textContent = ""; // Clear previous errors
        const password = document.getElementById('password').value;

        if (!password) {
            showModal("Login Error", "Please enter a password.");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password: password })
            });

            if (response.ok) {
                authToken = password;
                loginSection.style.display = 'none';
                dashboardSection.style.display = 'block';
                loadExistingDates();
            } else {
                const errorData = await response.json();
                showModal("Login Failed", errorData.error || "Please try again.");
            }
        } catch (error) {
            console.error("Login API call failed:", error);
            showModal("Login Error", "An error occurred during login. Please check the console.");
        }
    });

    // --- LOAD EXISTING DATES ---
    async function loadExistingDates() {
        existingDatesList.innerHTML = '<p>Loading dates...</p>';
        try {
            const response = await fetch('/api/get_dates');
            if (!response.ok) throw new Error(`Failed to fetch dates. Status: ${response.status}`);
            const dates = await response.json();
            existingDatesList.innerHTML = '';
            if (dates.length === 0) {
                existingDatesList.innerHTML = '<p>No dates found.</p>';
                return;
            }
            dates.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));
            dates.forEach(date => {
                const div = document.createElement('div');
                div.className = 'date-entry';
                const eventDate = new Date(date.event_date + 'T00:00:00Z');
                const formattedDate = eventDate.toLocaleDateString('en-US', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit' });
                div.innerHTML = `<span>${formattedDate} - ${date.venue}, ${date.city}</span><button class="btn btn-delete" data-id="${date.id}">Delete</button>`;
                existingDatesList.appendChild(div);
            });
        } catch (error) {
            console.error("Error loading dates:", error);
            existingDatesList.innerHTML = `<p style="color: red;">Could not load dates.</p>`;
            showModal("Error", `Could not load tour dates: ${error.message}`);
        }
    }

    // --- ADD NEW DATE ---
    addDateForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const response = await fetch('/api/manage_dates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({
                    event_date: document.getElementById('event_date').value,
                    venue: document.getElementById('venue').value,
                    city: document.getElementById('city').value,
                    ticket_url: document.getElementById('ticket_url').value,
                })
            });
            if (response.status === 401) throw new Error('Authentication failed. The password may be incorrect.');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'An unknown error occurred' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            showModal("Success!", "Date added successfully!");
            addDateForm.reset();
            loadExistingDates();
        } catch (error) {
            showModal("Error", `Failed to add date: ${error.message}`);
        }
    });

    // --- DELETE DATE ---
    existingDatesList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('btn-delete')) {
            const dateId = e.target.dataset.id;
            
            showModal("Confirm Deletion", "Are you sure you want to delete this date?", [
                { text: "Cancel", class: "btn" },
                { text: "Delete", class: "btn btn-delete", onClick: () => performDelete(dateId) }
            ]);
        }
    });

    async function performDelete(dateId) {
        try {
            const response = await fetch('/api/manage_dates', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify({ id: parseInt(dateId) })
            });
            if (response.status === 401) throw new Error('Authentication failed. The password may be incorrect.');
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Failed to delete' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            showModal("Success!", "Date deleted successfully!");
            loadExistingDates();
        } catch (error) {
            showModal("Error", `Failed to delete date: ${error.message}`);
        }
    }
});
