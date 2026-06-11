/**
 * Global utilities — sidebar, API client, toast notifications, modal helpers
 */

const API = {
    async request(method, url, body = null) {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        };
        if (body !== null) {
            options.body = JSON.stringify(body);
        }
        const response = await fetch(url, options);
        const json = await response.json();
        if (!response.ok || !json.success) {
            const err = new Error(json.message || 'Request failed');
            err.status = response.status;
            throw err;
        }
        return json;
    },
    get(url) { return this.request('GET', url); },
    post(url, data) { return this.request('POST', url, data); },
    put(url, data) { return this.request('PUT', url, data); },
    delete(url) { return this.request('DELETE', url); },
};

const Toast = {
    icons: {
        success: 'check_circle',
        error: 'error',
        warning: 'warning',
    },

    show(message, type = 'success', duration = 4500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `
            <span class="material-icons-round toast-icon">${this.icons[type] || 'info'}</span>
            <span class="toast-content">${this.escapeHtml(message)}</span>
            <button type="button" class="toast-close" aria-label="Dismiss">
                <span class="material-icons-round">close</span>
            </button>
        `;

        const dismiss = () => {
            toast.classList.add('removing');
            setTimeout(() => toast.remove(), 250);
        };

        toast.querySelector('.toast-close').addEventListener('click', dismiss);
        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(dismiss, duration);
        }
    },

    success(msg) { this.show(msg, 'success'); },
    error(msg) { this.show(msg, 'error'); },
    warning(msg) { this.show(msg, 'warning'); },

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },
};

const Modal = {
    open(title, bodyHtml, onSubmit) {
        const overlay = document.getElementById('modal-overlay');
        overlay.innerHTML = `
            <div class="modal" role="dialog" aria-modal="true">
                <div class="modal-header">
                    <h2>${Toast.escapeHtml(title)}</h2>
                    <button type="button" class="btn-icon modal-close" aria-label="Close">
                        <span class="material-icons-round">close</span>
                    </button>
                </div>
                <div class="modal-body">${bodyHtml}</div>
            </div>
        `;
        overlay.classList.remove('hidden');

        const close = () => {
            overlay.classList.add('hidden');
            overlay.innerHTML = '';
        };

        overlay.querySelector('.modal-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        const form = overlay.querySelector('form');
        if (form && onSubmit) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!Validator.validateForm(form)) {
                    Toast.warning('Please fix the highlighted errors before submitting.');
                    return;
                }
                const submitBtn = form.querySelector('[type="submit"]');
                if (submitBtn) submitBtn.disabled = true;
                try {
                    await onSubmit(new FormData(form), form);
                    close();
                } catch (err) {
                    Toast.error(err.message || 'Operation failed.');
                } finally {
                    if (submitBtn) submitBtn.disabled = false;
                }
            });
        }

        return { close };
    },
};

function initSidebar() {
    const toggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    if (!toggle || !sidebar) return;

    toggle.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.addEventListener('click', (e) => {
        if (window.innerWidth > 900) return;
        if (!sidebar.contains(e.target) && !toggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

function formDataToObject(formData) {
    const intFields = new Set([
        'jersey_number', 'max_players', 'founded_year', 'coach_id', 'team_id',
        'player_id', 'session_id', 'home_score', 'away_score',
    ]);
    const floatFields = new Set(['amount', 'salary']);
    const obj = {};
    formData.forEach((value, key) => {
        if (value === '') {
            obj[key] = null;
        } else if (floatFields.has(key)) {
            obj[key] = parseFloat(value);
        } else if (intFields.has(key)) {
            obj[key] = parseInt(value, 10);
        } else {
            obj[key] = value;
        }
    });
    return obj;
}

function populateForm(form, item) {
    Object.entries(item).forEach(([k, v]) => {
        const el = form.querySelector(`[name="${k}"]`);
        if (!el || v == null) return;
        if (k.includes('date')) {
            el.value = String(v).split('T')[0].split(' ')[0];
        } else if (k.includes('time')) {
            el.value = String(v).substring(0, 5);
        } else {
            el.value = v;
        }
    });
}

function formatDate(str) {
    if (!str) return '—';
    const d = new Date(str);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(str) {
    if (!str) return '—';
    return str.substring(0, 5);
}

function statusBadge(status) {
    const map = {
        active: 'success', paid: 'success', present: 'success', completed: 'success', win: 'success',
        injured: 'warning', late: 'warning', partial: 'warning', on_leave: 'warning', postponed: 'warning',
        inactive: 'neutral', pending: 'neutral', scheduled: 'primary', draw: 'neutral',
        absent: 'error', overdue: 'error', cancelled: 'error', loss: 'error',
        excused: 'warning', away: 'neutral', home: 'primary',
    };
    const cls = map[status] || 'neutral';
    const label = (status || 'unknown').replace(/_/g, ' ');
    return `<span class="badge badge-${cls}">${label}</span>`;
}

function showLoading(container) {
    container.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <span>Loading...</span>
        </div>
    `;
}

function confirmDelete(name) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('modal-overlay');
        overlay.innerHTML = `
            <div class="modal" style="max-width:420px">
                <div class="modal-header">
                    <h2>Confirm Delete</h2>
                    <button type="button" class="btn-icon modal-close"><span class="material-icons-round">close</span></button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete <strong>${Toast.escapeHtml(name)}</strong>? This action cannot be undone.</p>
                    <div class="form-actions">
                        <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
                        <button type="button" class="btn btn-danger confirm-btn">Delete</button>
                    </div>
                </div>
            </div>
        `;
        overlay.classList.remove('hidden');
        const close = () => { overlay.classList.add('hidden'); overlay.innerHTML = ''; };
        overlay.querySelector('.modal-close').addEventListener('click', () => { close(); resolve(false); });
        overlay.querySelector('.cancel-btn').addEventListener('click', () => { close(); resolve(false); });
        overlay.querySelector('.confirm-btn').addEventListener('click', () => { close(); resolve(true); });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initSidebar();
    initGlobalSearch();
});

// ─────────────────────────────────────────────────────────────────────────────
// Global search
// ─────────────────────────────────────────────────────────────────────────────

function initGlobalSearch() {
    const input = document.getElementById('global-search');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    let debounceTimer = null;

    input.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        const q = input.value.trim();
        if (q.length < 2) {
            closeDropdown();
            return;
        }
        debounceTimer = setTimeout(() => fetchSearchResults(q), 280);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeDropdown();
            input.blur();
        }
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
        if (!input.closest('.navbar-search-wrapper').contains(e.target)) {
            closeDropdown();
        }
    });

    async function fetchSearchResults(q) {
        try {
            const { data } = await API.get(`/api/search?q=${encodeURIComponent(q)}`);
            renderResults(data);
        } catch {
            dropdown.innerHTML = '<div class="search-empty">Search unavailable.</div>';
            dropdown.classList.add('open');
        }
    }

    function renderResults(data) {
        const { players = [], coaches = [], matches = [], payments = [] } = data;
        const total = players.length + coaches.length + matches.length + payments.length;

        if (total === 0) {
            dropdown.innerHTML = '<div class="search-empty">No results found.</div>';
            dropdown.classList.add('open');
            return;
        }

        let html = '';

        if (players.length) {
            html += `<div class="search-section-title">Players</div>`;
            players.forEach(p => {
                html += `<a class="search-item" href="/players">
                    <span class="material-icons-round">person</span>
                    <span class="search-item-text">
                        <span class="search-item-label">${Toast.escapeHtml(p.first_name + ' ' + p.last_name)}</span>
                        <span class="search-item-sub">${Toast.escapeHtml(p.position || '')}${p.team_name ? ' · ' + Toast.escapeHtml(p.team_name) : ''}</span>
                    </span>
                </a>`;
            });
        }

        if (coaches.length) {
            if (html) html += '<hr class="search-divider">';
            html += `<div class="search-section-title">Coaches</div>`;
            coaches.forEach(c => {
                html += `<a class="search-item" href="/coaches">
                    <span class="material-icons-round">sports</span>
                    <span class="search-item-text">
                        <span class="search-item-label">${Toast.escapeHtml(c.first_name + ' ' + c.last_name)}</span>
                        <span class="search-item-sub">${Toast.escapeHtml(c.specialization || '')}</span>
                    </span>
                </a>`;
            });
        }

        if (matches.length) {
            if (html) html += '<hr class="search-divider">';
            html += `<div class="search-section-title">Matches</div>`;
            matches.forEach(m => {
                html += `<a class="search-item" href="/matches">
                    <span class="material-icons-round">emoji_events</span>
                    <span class="search-item-text">
                        <span class="search-item-label">${Toast.escapeHtml(m.team_name || '?')} vs ${Toast.escapeHtml(m.opponent_name)}</span>
                        <span class="search-item-sub">${Toast.escapeHtml(m.status || '')}${m.match_date ? ' · ' + formatDate(m.match_date) : ''}</span>
                    </span>
                </a>`;
            });
        }

        if (payments.length) {
            if (html) html += '<hr class="search-divider">';
            html += `<div class="search-section-title">Payments</div>`;
            payments.forEach(p => {
                html += `<a class="search-item" href="/payments">
                    <span class="material-icons-round">payments</span>
                    <span class="search-item-text">
                        <span class="search-item-label">${Toast.escapeHtml(p.player_name || '—')}</span>
                        <span class="search-item-sub">PKR ${Number(p.amount).toFixed(2)} · ${Toast.escapeHtml((p.payment_type || '').replace(/_/g, ' '))} · ${Toast.escapeHtml(p.status || '')}</span>
                    </span>
                </a>`;
            });
        }

        dropdown.innerHTML = html;
        dropdown.classList.add('open');

        // Close dropdown when a result link is clicked
        dropdown.querySelectorAll('.search-item').forEach(el => {
            el.addEventListener('click', () => {
                closeDropdown();
                input.value = '';
            });
        });
    }

    function closeDropdown() {
        dropdown.classList.remove('open');
        dropdown.innerHTML = '';
    }
}
