/**
 * Form validation — names, dates, numbers, anti-gibberish
 */

const Validator = {
    rules: {
        name(value) {
            if (!value || value.trim().length < 2) return 'Must be at least 2 characters.';
            if (value.trim().length > 50) return 'Must not exceed 50 characters.';
            if (!/^[A-Za-z][A-Za-z\s'\-]*$/.test(value.trim())) return 'Letters, spaces, hyphens and apostrophes only.';
            if (/(.)\1{3,}/.test(value)) return 'Invalid repeated characters.';
            if (!/[aeiouAEIOU]/.test(value) && value.length > 3) return 'Must contain vowels.';
            const words = value.trim().split(/\s+/);
            if (words.some((w) => w.length < 2 && words.length > 1)) return 'Each name part must be at least 2 letters.';
            return '';
        },

        text(value, min = 2, max = 120) {
            if (!value || value.trim().length < min) return `Must be at least ${min} characters.`;
            if (value.trim().length > max) return `Must not exceed ${max} characters.`;
            if (/(.)\1{4,}/.test(value)) return 'Invalid input pattern.';
            if (!/^[A-Za-z0-9\s\-.,'&()]+$/.test(value.trim())) return 'Contains invalid characters.';
            return '';
        },

        email(value) {
            if (!value) return 'Email is required.';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) return 'Enter a valid email address.';
            return '';
        },

        phone(value) {
            if (!value) return 'Phone is required.';
            const cleaned = value.replace(/[\s\-()]/g, '');
            if (!/^\+?[0-9]{10,15}$/.test(cleaned)) return 'Enter a valid phone number (10–15 digits).';
            return '';
        },

        date(value, field) {
            if (!value) return 'Date is required.';
            const d = new Date(value);
            if (isNaN(d.getTime())) return 'Invalid date.';
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (field === 'date_of_birth') {
                if (d >= today) return 'Date of birth must be in the past.';
                const age = (today - d) / (365.25 * 24 * 60 * 60 * 1000);
                if (age < 5 || age > 40) return 'Player age must be between 5 and 40 years.';
            }
            if (field === 'hire_date' || field === 'registration_date') {
                const y = today.getFullYear();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const day = String(today.getDate()).padStart(2, '0');
                const todayStr = `${y}-${m}-${day}`;
                if (value > todayStr) return 'Date cannot be in the future.';
            }
            if (field === 'due_date' && d < new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)) {
                return 'Due date is too far in the past.';
            }
            return '';
        },

        time(value) {
            if (!value) return 'Time is required.';
            if (!/^\d{2}:\d{2}(:\d{2})?$/.test(value)) return 'Invalid time format.';
            return '';
        },

        timeRange(start, end) {
            if (start && end && start >= end) return 'End time must be after start time.';
            return '';
        },

        positiveNumber(value, field) {
            if (value === '' || value === null || value === undefined) return 'This field is required.';
            const num = Number(value);
            if (isNaN(num)) return 'Must be a valid number.';
            if (num < 0) return 'Cannot be negative.';
            if (field === 'jersey_number' && (num < 1 || num > 99)) return 'Jersey number must be 1–99.';
            if (field === 'max_players' && (num < 11 || num > 30)) return 'Max players must be 11–30.';
            if (field === 'founded_year') {
                const year = parseInt(value, 10);
                if (year < 1990 || year > new Date().getFullYear()) return 'Invalid founded year.';
            }
            if (field === 'amount' && num <= 0) return 'Amount must be greater than zero.';
            if (field === 'salary' && num <= 0) return 'Salary must be greater than zero.';
            if ((field === 'home_score' || field === 'away_score') && num < 0) return 'Score cannot be negative.';
            return '';
        },

        optionalScore(value) {
            if (value === '' || value === null) return '';
            const num = Number(value);
            if (isNaN(num) || num < 0) return 'Score must be zero or positive.';
            if (num > 50) return 'Score seems unrealistic.';
            return '';
        },

        select(value) {
            if (!value) return 'Please select an option.';
            return '';
        },
    },

    validateField(input) {
        const name = input.name;
        const value = input.value;
        const type = input.dataset.validate || input.type;
        let error = '';

        if (input.required === false && !value) {
            error = '';
        } else if (name === 'first_name' || name === 'last_name') {
            error = this.rules.name(value);
        } else if (type === 'email' || name === 'email') {
            error = this.rules.email(value);
        } else if (type === 'tel' || name === 'phone') {
            error = this.rules.phone(value);
        } else if (type === 'date' || input.type === 'date') {
            error = !value && !input.required ? '' : this.rules.date(value, name);
        } else if (type === 'time' || input.type === 'time') {
            error = this.rules.time(value);
        } else if (input.tagName === 'SELECT') {
            error = this.rules.select(value);
        } else if (['jersey_number', 'max_players', 'founded_year', 'amount', 'salary', 'coach_id', 'team_id', 'player_id', 'session_id'].includes(name)) {
            error = this.rules.positiveNumber(value, name);
        } else if (name === 'home_score' || name === 'away_score') {
            error = this.rules.optionalScore(value);
        } else if (input.dataset.validate === 'text') {
            error = !value && !input.required ? '' : this.rules.text(value);
        }

        this.setFieldError(input, error);
        return !error;
    },

    setFieldError(input, error) {
        input.classList.toggle('invalid', !!error);
        const group = input.closest('.form-group');
        if (group) {
            let errEl = group.querySelector('.field-error');
            if (!errEl) {
                errEl = document.createElement('span');
                errEl.className = 'field-error';
                group.appendChild(errEl);
            }
            errEl.textContent = error;
        }
    },

    validateForm(form) {
        let valid = true;
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input) => {
            if (!this.validateField(input)) valid = false;
        });

        const start = form.querySelector('[name="start_time"]');
        const end = form.querySelector('[name="end_time"]');
        if (start && end) {
            const rangeErr = this.rules.timeRange(start.value, end.value);
            if (rangeErr) {
                this.setFieldError(end, rangeErr);
                valid = false;
            }
        }

        const paidDate = form.querySelector('[name="paid_date"]');
        const dueDate = form.querySelector('[name="due_date"]');
        if (paidDate && dueDate && paidDate.value && dueDate.value && paidDate.value < dueDate.value) {
            this.setFieldError(paidDate, 'Paid date cannot be before due date.');
            valid = false;
        }

        return valid;
    },

    bindForm(form) {
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach((input) => {
            input.addEventListener('blur', () => this.validateField(input));
            input.addEventListener('input', () => {
                if (input.classList.contains('invalid')) this.validateField(input);
            });
        });
    },
};
