let teamsCache = [];

const MATCH_FORM = `
<form id="entity-form">
    <div class="form-grid">
        <div class="form-group">
            <label>Team <span class="required">*</span></label>
            <select class="form-control" name="team_id" id="team-select" required></select>
        </div>
        <div class="form-group">
            <label>Opponent <span class="required">*</span></label>
            <input class="form-control" name="opponent_name" data-validate="text" required>
        </div>
        <div class="form-group">
            <label>Match Date <span class="required">*</span></label>
            <input class="form-control" type="date" name="match_date" required>
        </div>
        <div class="form-group">
            <label>Kickoff <span class="required">*</span></label>
            <input class="form-control" type="time" name="kickoff_time" required>
        </div>
        <div class="form-group">
            <label>Venue <span class="required">*</span></label>
            <select class="form-control" name="venue_type" required>
                <option value="home">Home</option>
                <option value="away">Away</option>
            </select>
        </div>
        <div class="form-group">
            <label>Location <span class="required">*</span></label>
            <input class="form-control" name="location" data-validate="text" required>
        </div>
        <div class="form-group">
            <label>Home Score</label>
            <input class="form-control" type="number" name="home_score" min="0" max="50">
        </div>
        <div class="form-group">
            <label>Away Score</label>
            <input class="form-control" type="number" name="away_score" min="0" max="50">
        </div>
        <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
        <div class="form-group">
            <label>Result</label>
            <select class="form-control" name="result">
                <option value="pending">Pending</option>
                <option value="win">Win</option>
                <option value="draw">Draw</option>
                <option value="loss">Loss</option>
            </select>
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Match</button>
    </div>
</form>`;

async function loadTeams() {
    const { data } = await API.get('/api/teams');
    teamsCache = data;
}

async function loadMatches() {
    const container = document.getElementById('table-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/matches');
        if (!data.length) {
            container.innerHTML = `<div class="table-empty"><span class="material-icons-round">emoji_events</span><p>No matches scheduled yet.</p><p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Add Match</strong> to get started.</p></div>`;
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Date</th><th>Team</th><th>Opponent</th><th class="col-hide-mobile">Score</th><th class="col-hide-mobile">Venue</th><th>Status</th><th class="col-hide-mobile">Result</th><th>Actions</th>
                </tr></thead>
                <tbody>${data.map((m) => `
                    <tr>
                        <td>${formatDate(m.match_date)}<br><small>${formatTime(m.kickoff_time)}</small></td>
                        <td><strong>${m.team_name}</strong></td>
                        <td>${m.opponent_name}</td>
                        <td class="col-hide-mobile">${m.home_score != null ? `${m.home_score} : ${m.away_score}` : '—'}</td>
                        <td class="col-hide-mobile">${statusBadge(m.venue_type)}</td>
                        <td>${statusBadge(m.status)}</td>
                        <td class="col-hide-mobile">${statusBadge(m.result)}</td>
                        <td class="table-actions">
                            <button class="btn-icon edit-btn" data-id="${m.match_id}"><span class="material-icons-round">edit</span></button>
                            <button class="btn-icon danger delete-btn" data-id="${m.match_id}" data-name="${m.team_name} vs ${m.opponent_name}"><span class="material-icons-round">delete</span></button>
                        </td>
                    </tr>`).join('')}</tbody>
            </table>`;
        bindActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load matches.</div>';
        Toast.error(err.message);
    }
}

function bindActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Match', data.find((m) => m.match_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/matches/${btn.dataset.id}`);
                    Toast.success('Match deleted.');
                    loadMatches();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    Modal.open(title, MATCH_FORM, async (fd) => {
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/matches/${item.match_id}`, payload);
            Toast.success('Match updated.');
        } else {
            await API.post('/api/matches', payload);
            Toast.success('Match created.');
        }
        loadMatches();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.getElementById('team-select').innerHTML =
        '<option value="">Select team</option>' +
        teamsCache.map((t) => `<option value="${t.team_id}">${t.team_name}</option>`).join('');
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) populateForm(form, item);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadTeams();
        await loadMatches();
        document.getElementById('btn-add').addEventListener('click', () => openForm('Add Match'));
    } catch (err) { Toast.error(err.message); }
});
