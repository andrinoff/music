
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
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        // This password will be checked by the backend.
        // For the frontend, we just store it to send with requests.
        authToken = password; 
        loginSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        loadExistingDates();
    });

    // --- LOAD EXISTING DATES ---
    async function loadExistingDates() {
        try {
            const response = await fetch('/api/get_dates');
            if (!response.ok) throw new Error('Failed to fetch dates');
            
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
                const eventDate = new Date(date.event_date);
                const formattedDate = `${eventDate.getUTCMonth() + 1}/${eventDate.getUTCDate()}/${eventDate.getUTCFullYear()}`;
                
                div.innerHTML = `
                    <span>${formattedDate} - ${date.venue}, ${date.city}</span>
                    <button class="btn btn-delete" data-id="${date.id}">Delete</button>
                `;
                existingDatesList.appendChild(div);
            });

        } catch (error) {
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
                formMessage.style.color = 'red';
                formMessage.textContent = 'Authentication failed. Incorrect password.';
                return;
            }
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to add date');
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
                    alert('Authentication failed. Incorrect password.');
                    return;
                }
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete date');
                }

                alert('Date deleted successfully!');
                loadExistingDates(); // Refresh the list

            } catch (error) {
                alert(`Error: ${error.message}`);
            }
        }
    });
});
