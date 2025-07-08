document.addEventListener("DOMContentLoaded", () => {
  const tourList = document.getElementById("tour-dates-list");

  async function fetchTourDates() {
    try {
      // This fetch call points to our serverless function
      const response = await fetch("/api/get_dates");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const dates = await response.json();

      // Clear the loading message
      tourList.innerHTML = "";

      if (dates.length === 0) {
        tourList.innerHTML =
          '<p class="no-dates">No upcoming tour dates. Check back soon!</p>';
        return;
      }

      // Sort dates by event_date
      dates.sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

      dates.forEach((date) => {
        const dateItem = document.createElement("div");
        dateItem.className = "tour-item";

        const eventDate = new Date(date.event_date);
        // To avoid timezone issues, get UTC date parts and format manually
        const formattedDate = `${eventDate.getUTCDate()}/${
          eventDate.getUTCMonth() + 1}/${eventDate.getUTCFullYear()}`;

        dateItem.innerHTML = `
                    <div class="tour-info">
                        <div class="date">${formattedDate}</div>
                        <div>${date.venue}, ${date.city}</div>
                    </div>
                    <a href="${date.ticket_url}" target="_blank" class="ticket-button">Where?</a>
                `;
        tourList.appendChild(dateItem);
      });
    } catch (error) {
      console.error("Failed to fetch tour dates:", error);
      tourList.innerHTML =
        '<p class="no-dates">Could not load tour dates. Please try again later.</p>';
    }
  }

  fetchTourDates();
});
