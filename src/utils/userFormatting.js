/**
 * Utility functions for protecting user privacy and displaying clean, human-readable names
 * instead of raw email addresses or internal system UUIDs on the UI.
 */

/**
 * Sanitizes and formats display names so raw email addresses or internal IDs are NEVER exposed to users.
 * E.g. "john.doe@gmail.com" -> "John Doe"
 * E.g. "tenant@rentflex.co.za" -> "Verified Tenant"
 * E.g. "01234567-89ab-..." -> "Verified Resident"
 * 
 * @param {string|null|undefined} input - Full name, email, or user identifier
 * @param {string} [fallbackRole='User'] - Role fallback (e.g., 'Tenant', 'Landlord', 'Contractor')
 * @returns {string} Clean, professional human display name
 */
export function formatUserDisplayName(input, fallbackRole = 'User') {
    if (!input || typeof input !== 'string') return fallbackRole;
    const clean = input.trim();
    if (!clean) return fallbackRole;

    // Check if input is a raw database UUID or MongoDB ObjectId
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean) || /^[0-9a-f]{24,}$/i.test(clean)) {
        return `Verified ${fallbackRole}`;
    }

    // Check if input is an email address
    if (clean.includes('@')) {
        const username = clean.split('@')[0];
        const lowerUser = username.toLowerCase();
        
        if (lowerUser === 'tenant') return 'Verified Tenant';
        if (lowerUser === 'landlord') return 'Verified Landlord';
        if (lowerUser === 'contractor') return 'Accredited Contractor';
        if (lowerUser === 'admin' || lowerUser === 'sysadmin') return 'System Administrator';

        // Split by dots, underscores, dashes, numbers and format nicely
        const words = username.replace(/[._\-+]/g, ' ').replace(/\d+/g, '').trim().split(/\s+/).filter(Boolean);
        if (words.length > 0) {
            return words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        }
        return `Verified ${fallbackRole}`;
    }

    return clean;
}

/**
 * Checks whether a given string is an email address.
 * @param {string} str 
 * @returns {boolean}
 */
export function isEmailAddress(str) {
    if (!str || typeof str !== 'string') return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str.trim());
}
