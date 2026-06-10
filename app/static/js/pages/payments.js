let playersCache = [];

const PAYMENT_FORM = `
<form id="entity-form">
    <div class="form-grid">
        <div class="form-group full-width">
            <label>Player <span class="required">*</span></label>
            <select class="form-control" name="player_id" id="player-select" required></select>
        </div>
        <div class="form-group">
            <label>Amount (PKR) <span class="required">*</span></label>
            <input class="form-control" type="number" name="amount" min="0.01" step="0.01" required>
        </div>
        <div class="form-group">
            <label>Due Date <span class="required">*</span></label>
            <input class="form-control" type="date" name="due_date" required>
        </div>
        <div class="form-group">
            <label>Paid Date</label>
            <input class="form-control" type="date" name="paid_date">
        </div>
        <div class="form-group">
            <label>Payment Type <span class="required">*</span></label>
            <select class="form-control" name="payment_type" required>
                <option value="monthly_fee">Monthly Fee</option>
                <option value="registration">Registration</option>
                <option value="equipment">Equipment</option>
                <option value="tournament">Tournament</option>
            </select>
        </div>
        <div class="form-group">
            <label>Status</label>
            <select class="form-control" name="status">
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
                <option value="partial">Partial</option>
            </select>
        </div>
        <div class="form-group full-width">
            <label>Notes</label>
            <textarea class="form-control" name="notes" rows="2" data-validate="text"></textarea>
        </div>
    </div>
    <div class="form-actions">
        <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
        <button type="submit" class="btn btn-primary">Save Payment</button>
    </div>
</form>`;

async function loadPlayers() {
    const { data } = await API.get('/api/players');
    playersCache = data.filter((p) => p.status !== 'inactive');
}

function isOverdue(p) {
    if (p.status === 'overdue') return true;
    if (p.status === 'pending' && p.due_date && new Date(p.due_date) < new Date()) return true;
    return false;
}

async function loadPayments() {
    const container = document.getElementById('table-container');
    showLoading(container);
    try {
        const { data } = await API.get('/api/payments');
        if (!data.length) {
            container.innerHTML = `<div class="table-empty"><span class="material-icons-round">payments</span><p>No payment records yet.</p><p style="font-size:0.875rem;margin-top:0.25rem;">Click <strong>+ Add Payment</strong> to get started.</p></div>`;
            return;
        }
        container.innerHTML = `
            <table class="data-table">
                <thead><tr>
                    <th>Player</th><th class="col-hide-mobile">Team</th><th>Type</th><th>Amount</th><th class="col-hide-mobile">Due</th><th class="col-hide-mobile">Paid</th><th>Status</th><th>Actions</th>
                </tr></thead>
                <tbody>${data.map((p) => {
                    const overdue = isOverdue(p);
                    return `
                    <tr${overdue ? ' style="background:var(--error-bg)"' : ''}>
                        <td><strong>${p.player_name}</strong>${overdue ? ' <span class="overdue-flag">OVERDUE</span>' : ''}</td>
                        <td class="col-hide-mobile">${p.team_name || '—'}</td>
                        <td>${(p.payment_type || '').replace(/_/g, ' ')}</td>
                        <td>PKR ${Number(p.amount).toFixed(2)}</td>
                        <td class="col-hide-mobile">${formatDate(p.due_date)}</td>
                        <td class="col-hide-mobile">${p.paid_date ? formatDate(p.paid_date) : '—'}</td>
                        <td>${statusBadge(p.status)}</td>
                        <td class="table-actions">
                            <button class="btn-icon edit-btn" data-id="${p.payment_id}"><span class="material-icons-round">edit</span></button>
                            <button class="btn-icon danger delete-btn" data-id="${p.payment_id}" data-name="Payment #${p.payment_id}"><span class="material-icons-round">delete</span></button>
                        </td>
                    </tr>`;
                }).join('')}</tbody>
            </table>`;
        bindActions(data);
    } catch (err) {
        container.innerHTML = '<div class="table-empty">Failed to load payments.</div>';
        Toast.error(err.message);
    }
}

function bindActions(data) {
    document.querySelectorAll('.edit-btn').forEach((btn) => {
        btn.addEventListener('click', () => openForm('Edit Payment', data.find((p) => p.payment_id == btn.dataset.id)));
    });
    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
            if (await confirmDelete(btn.dataset.name)) {
                try {
                    await API.delete(`/api/payments/${btn.dataset.id}`);
                    Toast.success('Payment deleted.');
                    loadPayments();
                } catch (err) { Toast.error(err.message); }
            }
        });
    });
}

function openForm(title, item = null) {
    Modal.open(title, PAYMENT_FORM, async (fd) => {
        const payload = formDataToObject(fd);
        if (item) {
            await API.put(`/api/payments/${item.payment_id}`, payload);
            Toast.success('Payment updated.');
        } else {
            await API.post('/api/payments', payload);
            Toast.success('Payment recorded.');
        }
        loadPayments();
    });
    const form = document.querySelector('#entity-form');
    Validator.bindForm(form);
    document.getElementById('player-select').innerHTML =
        '<option value="">Select player</option>' +
        playersCache.map((p) =>
            `<option value="${p.player_id}" ${p.player_id == item?.player_id ? 'selected' : ''}>${p.first_name} ${p.last_name}</option>`
        ).join('');
    document.querySelector('.modal-close-btn')?.addEventListener('click', () => {
        document.getElementById('modal-overlay').classList.add('hidden');
    });
    if (item) {
        populateForm(form, item);
    } else {
        form.querySelector('[name="due_date"]').value = new Date().toISOString().split('T')[0];
        form.querySelector('[name="status"]').value = 'pending';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadPlayers();
        await loadPayments();
        document.getElementById('btn-add').addEventListener('click', () => openForm('Add Payment'));
    } catch (err) { Toast.error(err.message); }
});
