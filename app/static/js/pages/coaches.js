const COACH_FORM = `
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
            <label>Email <span class="required">*</span></label>
            <input class="form-control" type="email" name="email" required>
        </div>
        <div class="form-group">
            <label>Phone <span class="required">*</span></label>
            <input class="form-control" type="tel" name="phone" required>
        </div>
        <div class="form-group full-width">
            <label>Specialization <span class="required">*</span></label>
            <input class="form-control" name="specialization" data-validate="text" required>
        </div>
        <div class="form-group">
            <label>Hire Date <span class="required">*</span></label>
            <input class="form-control" type="date" name="hire_date" required>
        </div>
        <div class="form-group">
            <label>Salary (PKR) <span class="required">*</span></label>
            <input class="form-control" type="number" name="salary" min="0" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="inactive">Inactive</option>
            </select>
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Coach</button>
    </div>
</form>`;

async function loadCoaches() {
    const container = document.getElementById('table-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/coaches');
        if (!data.length) {
            container.innerHTML = `<div class="table-empty"><span class="material-icons-round">sports</span><p>No coaches added yet.</p><p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Add Coach</strong> to get started.</p></div>`;
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Name</th><th>Specialization</th><th class="col-hide-mobile">Email</th><th class="col-hide-mobile">Salary</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>${data.map((c) => `
                    <tr>
                        <td><strong>${c.first_name} ${c.last_name}</strong></td>
                        <td>${c.specialization}</td>
                        <td class="col-hide-mobile">${c.email}</td>
                        <td class="col-hide-mobile">PKR ${Number(c.salary).toLocaleString()}</td>
                        <td>${statusBadge(c.status)}</td>
                        <td class="table-actions">
                            <button class="btn-icon edit-btn" data-id="${c.coach_id}"><span class="material-icons-round">edit</span></button>
                            <button class="btn-icon danger delete-btn" data-id="${c.coach_id}" data-name="${c.first_name} ${c.last_name}"><span class="material-icons-round">delete</span></button>
                        </td>
                    </tr>`).join('')}</tbody>
            </table>`;
        bindActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load coaches.</div>';
        Toast.error(err.message);
    }
}

function bindActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Coach', data.find((c) => c.coach_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/coaches/${btn.dataset.id}`);
                    Toast.success('Coach deleted.');
                    loadCoaches();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    Modal.open(title, COACH_FORM, async (fd) => {
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/coaches/${item.coach_id}`, payload);
            Toast.success('Coach updated.');
        } else {
            await API.post('/api/coaches', payload);
            Toast.success('Coach created.');
        }
        loadCoaches();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) populateForm(form, item);
}

document.addEventListener('DOMContentLoaded', () => {
    loadCoaches();
    document.getElementById('btn-add').addEventListener('click', () => openForm('Add Coach'));
});
