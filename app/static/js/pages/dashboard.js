document.addEventListener('DOMContentLoaded', async () => {
    const statsGrid = document.getElementById('stats-grid');

    try {
        const { data } = await API.get('/api/dashboard');
        statsGrid.innerHTML = `
            <div class="stat-card">
                <div class="stat-icon navy"><span class="material-icons-round">groups</span></div>
                <div class="stat-info">
                    <span class="stat-label">Total Players</span>
                    <span class="stat-value">${data.total_players}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon gold"><span class="material-icons-round">sports</span></div>
                <div class="stat-info">
                    <span class="stat-label">Total Coaches</span>
                    <span class="stat-value">${data.total_coaches}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon green"><span class="material-icons-round">emoji_events</span></div>
                <div class="stat-info">
                    <span class="stat-label">Upcoming Matches</span>
                    <span class="stat-value">${data.upcoming_matches}</span>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon red"><span class="material-icons-round">money_off</span></div>
                <div class="stat-info">
                    <span class="stat-label">Unpaid Fees</span>
                    <span class="stat-value">${data.unpaid_payments_count}</span>
                </div>
            </div>
        `;
    } catch (err) {
        statsGrid.innerHTML = '<p class="table-empty">Failed to load dashboard stats.</p>';
        Toast.error(err.message);
    }
});
