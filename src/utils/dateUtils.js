import { format, parseISO, isValid } from 'date-fns';

/**
 * Parse any date format safely:
 * - Pure date string "YYYY-MM-DD" -> parsed in local time without UTC offset drift
 * - ISO timestamp "YYYY-MM-DDTHH:mm:ss.sssZ" -> parsed safely
 * - JS Date object or numeric timestamp
 */
export function parseSafeDate(dateInput) {
    if (!dateInput) return null;
    if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }

    if (typeof dateInput === 'string') {
        const trimmed = dateInput.trim();
        // Date-only string like "2026-01-01"
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [year, month, day] = trimmed.split('-').map(Number);
            return new Date(year, month - 1, day);
        }

        try {
            const parsed = parseISO(trimmed);
            if (isValid(parsed)) return parsed;
        } catch (_) {}

        const fallback = new Date(trimmed);
        if (isValid(fallback)) return fallback;
    }

    if (typeof dateInput === 'number') {
        const d = new Date(dateInput);
        if (isValid(d)) return d;
    }

    return null;
}

/**
 * Formats a date into a clean human-readable string (default: "MMM d, yyyy" -> "Jan 1, 2026")
 */
export function formatDate(dateInput, formatStr = 'MMM d, yyyy') {
    const d = parseSafeDate(dateInput);
    if (!d) return 'N/A';
    try {
        return format(d, formatStr);
    } catch (_) {
        return String(dateInput);
    }
}

/**
 * Formats a date & time (default: "MMM d, yyyy 'at' h:mm a" -> "Sep 1, 2026 at 8:30 PM")
 */
export function formatDateTime(dateInput, formatStr = "MMM d, yyyy 'at' h:mm a") {
    const d = parseSafeDate(dateInput);
    if (!d) return 'N/A';
    try {
        return format(d, formatStr);
    } catch (_) {
        return String(dateInput);
    }
}

/**
 * Formats a date range cleanly (e.g., "Jan 1, 2026 – Dec 31, 2026")
 */
export function formatDateRange(startDate, endDate, formatStr = 'MMM d, yyyy') {
    const start = formatDate(startDate, formatStr);
    const end = formatDate(endDate, formatStr);
    if (start === 'N/A' && end === 'N/A') return 'N/A';
    if (start === 'N/A') return `Until ${end}`;
    if (end === 'N/A') return `From ${start}`;
    return `${start} – ${end}`;
}

export default {
    parseSafeDate,
    formatDate,
    formatDateTime,
    formatDateRange,
};
