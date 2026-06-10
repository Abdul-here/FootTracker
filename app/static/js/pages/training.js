let teamsCache = [], coachesCache = [];

const SESSION_FORM = `
<form id="entity-form">
    <div class="form-grid">
        <div class="form-group">
            <label>Team <span class="required">*</span></label>
            <select class="form-control" name="team_id" id="team-select" required></select>
        </div>
        <div class="form-group">
            <label>Coach <span class="required">*</span></label>
            <select class="form-control" name="coach_id" id="coach-select" required></select>
        </div>
        <div class="form-group">
            <label>Date <span class="required">*</span></label>
            <input class="form-control" type="date" name="session_date" required>
        </div>
        <div class="form-group">
            <label>Start Time <span class="required">*</span></label>
            <input class="form-control" type="time" name="start_time" required>
        </div>
        <div class="form-group">
            <label>End Time <span class="required">*</span></label>
            <input class="form-control" type="time" name="end_time" required>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
        <div class="form-group full-width">
            <label>Location <span class="required">*</span></label>
            <input class="form-control" name="location" data-validate="text" required>
        </div>
        <div class="form-group full-width">
            <label>Focus Area <span class="required">*</span></label>
            <input class="form-control" name="focus_area" data-validate="text" required>
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Session</button>
    </div>
</form>`;

async function loadRefs() {
    const [teams, coaches] = await Promise.all([API.get('/api/teams'), API.get('/api/coaches')]);
    teamsCache = teams.data;
    coachesCache = coaches.data.filter((c) => c.status === 'active');
}

async function loadSessions() {
    const container = document.getElementById('schedule-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/training-sessions');
        if (!data.length) {
            container.innerHTML = `<div class="table-empty"><span class="material-icons-round">fitness_center</span><p>No training sessions scheduled yet.</p><p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Schedule Training</strong> to get started.</p></div>`;
            return;
        }
        container.innerHTML = `<div class="schedule-grid">${data.map((s) => `
            <div class="session-card">
                <div class="session-card-header">
                    <span class="session-date">${formatDate(s.session_date)}</span>
                    ${statusBadge(s.status)}
                </div>
                <h3>${s.focus_area}</h3>
                <div class="session-meta">
                    <span><span class="material-icons-round">shield</span> ${s.team_name}</span>
                    <span><span class="material-icons-round">sports</span> ${s.coach_name}</span>
                    <span><span class="material-icons-round">schedule</span> ${formatTime(s.start_time)} – ${formatTime(s.end_time)}</span>
                    <span><span class="material-icons-round">place</span> ${s.location}</span>
                </div>
                <div class="table-actions">
                    <button class="btn btn-secondary edit-btn" data-id="${s.session_id}"><span class="material-icons-round">edit</span> Edit</button>
                    <button class="btn btn-danger delete-btn" data-id="${s.session_id}" data-name="${s.focus_area}"><span class="material-icons-round">delete</span></button>
                </div>
            </div>`).join('')}</div>`;
        bindActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load sessions.</div>';
        Toast.error(err.message);
    }
}

function bindActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Session', data.find((s) => s.session_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/training-sessions/${btn.dataset.id}`);
                    Toast.success('Session deleted.');
                    loadSessions();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    Modal.open(title, SESSION_FORM, async (fd) => {
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/training-sessions/${item.session_id}`, payload);
            Toast.success('Session updated.');
        } else {
            await API.post('/api/training-sessions', payload);
            Toast.success('Session scheduled.');
        }
        loadSessions();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.getElementById('team-select').innerHTML =
        '<option value="">Select team</option>' +
        teamsCache.map((t) => `<option value="${t.team_id}" ${t.team_id == item?.team_id ? 'selected' : ''}>${t.team_name}</option>`).join('');
    document.getElementById('coach-select').innerHTML =
        '<option value="">Select coach</option>' +
        coachesCache.map((c) => `<option value="${c.coach_id}" ${c.coach_id == item?.coach_id ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`).join('');
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) populateForm(form, item);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadRefs();
        await loadSessions();
        document.getElementById('btn-add').addEventListener('click', () => openForm('Schedule Training'));
    } catch (err) { Toast.error(err.message); }
});
