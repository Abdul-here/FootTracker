let teamsCache = [];
let currentEditId = null; // track player being edited for jersey check

const PLAYER_FORM = `
<form id="entity-form">
    <div class="form-grid">
        <div class="form-group">
            <label>First Name <span class="required">*</span></label>
            <input class="form-control" name="first_name" required>
        </div>
        <div class="form-group">
            <label>Last Name <span class="required">*</span></label>
            <input class="form-control" name="last_name" required>
        </div>
        <div class="form-group">
            <label>Date of Birth <span class="required">*</span></label>
            <input class="form-control" type="date" name="date_of_birth" required>
        </div>
        <div class="form-group">
            <label>Email <span class="required">*</span></label>
            <input class="form-control" type="email" name="email" required>
        </div>
        <div class="form-group">
            <label>Phone <span class="required">*</span></label>
            <input class="form-control" type="tel" name="phone" required>
        </div>
        <div class="form-group">
            <label>Position <span class="required">*</span></label>
            <select class="form-control" name="position" required>
                <option value="">Select position</option>
                <option>Goalkeeper</option><option>Defender</option>
                <option>Midfielder</option><option>Forward</option>
            </select>
        </div>
        <div class="form-group">
            <label>Team <span class="required">*</span></label>
            <select class="form-control" name="team_id" id="team-select" required></select>
        </div>
        <div class="form-group">
            <label>Jersey # <span class="required">*</span></label>
            <input class="form-control" type="number" name="jersey_number" id="jersey-input" min="1" max="99" required>
            <span class="field-error" id="jersey-error"></span>
        </div>
        <div class="form-group">
            <label>Registration Date <span class="required">*</span></label>
            <input class="form-control" type="date" name="registration_date" required>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
                <option value="active">Active</option>
                <option value="injured">Injured</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Player</button>
    </div>
</form>`;

async function loadTeams() {
    const { data } = await API.get('/api/teams');
    teamsCache = data;
    return data;
}

function teamOptions(selected) {
    if (!teamsCache.length) {
        return '<option value="" disabled>No teams available — add a team first</option>';
    }
    return teamsCache.map((t) =>
        `<option value="${t.team_id}" ${t.team_id == selected ? 'selected' : ''}>${t.team_name}</option>`
    ).join('');
}

async function checkJerseyDuplicate(teamId, jerseyNumber) {
    if (!teamId || !jerseyNumber) return;
    const errEl = document.getElementById('jersey-error');
    const jerseyInput = document.getElementById('jersey-input');
    if (!errEl || !jerseyInput) return;
    try {
        const excludeParam = currentEditId ? `&exclude_player_id=${currentEditId}` : '';
        const { data } = await API.get(`/api/players/check-jersey?team_id=${teamId}&jersey_number=${jerseyNumber}${excludeParam}`);
        if (data.taken) {
            errEl.textContent = `Jersey #${jerseyNumber} is already taken in this team.`;
            jerseyInput.classList.add('invalid');
        } else {
            errEl.textContent = '';
            jerseyInput.classList.remove('invalid');
        }
    } catch { /* silent fail */ }
}

function bindJerseyCheck() {
    const teamSelect = document.getElementById('team-select');
    const jerseyInput = document.getElementById('jersey-input');
    if (!teamSelect || !jerseyInput) return;

    let jerseyTimer = null;
    const check = () => {
        clearTimeout(jerseyTimer);
        jerseyTimer = setTimeout(() => {
            checkJerseyDuplicate(teamSelect.value, jerseyInput.value);
        }, 400);
    };

    teamSelect.addEventListener('change', check);
    jerseyInput.addEventListener('input', check);
}

async function loadPlayers() {
    const container = document.getElementById('table-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/players');
        if (!data.length) {
            container.innerHTML = `
                <div class="table-empty">
                    <span class="material-icons-round">groups</span>
                    <p>No players added yet.</p>
                    <p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Add Player</strong> to get started.</p>
                </div>`;
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Name</th><th>Team</th><th class="col-hide-mobile">Position</th><th class="col-hide-mobile">Jersey</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>${data.map((p) => `
                    <tr>
                        <td><strong>${p.first_name} ${p.last_name}</strong></td>
                        <td>${p.team_name || '—'}</td>
                        <td class="col-hide-mobile">${p.position}</td>
                        <td class="col-hide-mobile">#${p.jersey_number}</td>
                        <td>${statusBadge(p.status)}</td>
                        <td class="table-actions">
                            <button class="btn-icon edit-btn" data-id="${p.player_id}" title="Edit"><span class="material-icons-round">edit</span></button>
                            <button class="btn-icon danger delete-btn" data-id="${p.player_id}" data-name="${p.first_name} ${p.last_name}" title="Delete"><span class="material-icons-round">delete</span></button>
                        </td>
                    </tr>`).join('')}</tbody>
            </table>`;
        bindTableActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load players.</div>';
        Toast.error(err.message);
    }
}

function bindTableActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Player', data.find((p) => p.player_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/players/${btn.dataset.id}`);
                    Toast.success('Player deleted successfully.');
                    loadPlayers();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    currentEditId = item ? item.player_id : null;
    Modal.open(title, PLAYER_FORM, async (fd) => {
        // Block submit if jersey is invalid
        const jerseyErr = document.getElementById('jersey-error');
        if (jerseyErr && jerseyErr.textContent) {
            Toast.warning('Please fix the jersey number conflict before saving.');
            throw new Error('jersey conflict');
        }
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/players/${item.player_id}`, payload);
            Toast.success('Player updated successfully.');
        } else {
            await API.post('/api/players', payload);
            Toast.success('Player created successfully.');
        }
        loadPlayers();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.getElementById('team-select').innerHTML =
        '<option value="">Select team</option>' + teamOptions(item?.team_id);
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) {
        populateForm(form, item);
    } else {
        // Build today string using local date parts (timezone-safe)
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        form.querySelector('[name="registration_date"]').value = `${y}-${m}-${d}`;
        form.querySelector('[name="status"]').value = 'active';
    }
    bindJerseyCheck();
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadTeams();
        await loadPlayers();
        document.getElementById('btn-add').addEventListener('click', () => openForm('Add Player'));
    } catch (err) { Toast.error(err.message); }
});
