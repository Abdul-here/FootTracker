let coachesCache = [];

const TEAM_FORM = `
<form id="entity-form">
    <div class="form-grid">
        <div class="form-group full-width">
            <label>Team Name <span class="required">*</span></label>
            <input class="form-control" name="team_name" data-validate="text" required>
        </div>
        <div class="form-group">
            <label>Age Group <span class="required">*</span></label>
            <select class="form-control" name="age_group" required>
                <option value="">Select</option>
                <option>U-10</option><option>U-12</option><option>U-14</option>
                <option>U-16</option><option>U-18</option><option>Senior</option>
            </select>
        </div>
        <div class="form-group">
            <label>Head Coach <span class="required">*</span></label>
            <select class="form-control" name="coach_id" id="coach-select" required></select>
        </div>
        <div class="form-group">
            <label>Founded Year <span class="required">*</span></label>
            <input class="form-control" type="number" name="founded_year" min="1990" max="2026" required>
        </div>
        <div class="form-group">
            <label>Max Players</label>
            <input class="form-control" type="number" name="max_players" min="11" max="30" value="22">
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Team</button>
    </div>
</form>`;

async function loadCoaches() {
    const { data } = await API.get('/api/coaches');
    coachesCache = data.filter((c) => c.status === 'active');
    return coachesCache;
}

function coachOptions(selected) {
    if (!coachesCache.length) {
        return '<option value="" disabled>No coaches available — add a coach first</option>';
    }
    return coachesCache.map((c) =>
        `<option value="${c.coach_id}" ${c.coach_id == selected ? 'selected' : ''}>${c.first_name} ${c.last_name}</option>`
    ).join('');
}

async function loadTeams() {
    const container = document.getElementById('table-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/teams');
        if (!data.length) {
            container.innerHTML = `<div class="table-empty"><span class="material-icons-round">shield</span><p>No teams added yet.</p><p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Add Team</strong> to get started.</p></div>`;
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Team</th><th>Age Group</th><th>Coach</th><th class="col-hide-mobile">Founded</th><th class="col-hide-mobile">Max Players</th><th>Actions</th>
                </tr></thead>
                <tbody>${data.map((t) => `
                    <tr>
                        <td><strong>${t.team_name}</strong></td>
                        <td><span class="badge badge-primary">${t.age_group}</span></td>
                        <td>${t.coach_name || '—'}</td>
                        <td class="col-hide-mobile">${t.founded_year}</td>
                        <td class="col-hide-mobile">${t.max_players}</td>
                        <td class="table-actions">
                            <button class="btn-icon edit-btn" data-id="${t.team_id}"><span class="material-icons-round">edit</span></button>
                            <button class="btn-icon danger delete-btn" data-id="${t.team_id}" data-name="${t.team_name}"><span class="material-icons-round">delete</span></button>
                        </td>
                    </tr>`).join('')}</tbody>
            </table>`;
        bindActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load teams.</div>';
        Toast.error(err.message);
    }
}

function bindActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Team', data.find((t) => t.team_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/teams/${btn.dataset.id}`);
                    Toast.success('Team deleted.');
                    loadTeams();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    Modal.open(title, TEAM_FORM, async (fd) => {
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/teams/${item.team_id}`, payload);
            Toast.success('Team updated.');
        } else {
            await API.post('/api/teams', payload);
            Toast.success('Team created.');
        }
        loadTeams();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.getElementById('coach-select').innerHTML =
        '<option value="">Select coach</option>' + coachOptions(item?.coach_id);
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) populateForm(form, item);
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCoaches();
        await loadTeams();
        document.getElementById('btn-add').addEventListener('click', () => openForm('Add Team'));
    } catch (err) { Toast.error(err.message); }
});
