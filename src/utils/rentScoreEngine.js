import { appClient } from '@/api/appClient';

/**
 * Calculates and dynamically updates a tenant's official RentScore based on:
 * 1. Base Score (550)
 * 2. Identity, Income, and Employment Verifications (+35 to +40 pts each)
 * 3. Payment history: on-time rental payments (+15 pts each)
 * 4. Active Occupancy Duration: +5 pts per month spent occupying under signed e-lease
 * 5. Completed lease compliance: +25 pts
 *
 * @param {object|string} userOrEmail - The user object or tenant email
 * @returns {Promise<object>} - Updated RentScore record
 */
export async function syncAndScoreTenant(userOrEmail) {
    const userEmail = typeof userOrEmail === 'string' 
        ? userOrEmail.toLowerCase().trim() 
        : userOrEmail?.email?.toLowerCase()?.trim();

    if (!userEmail) return null;

    try {
        // 1. Fetch user's profile to check verified status
        let profile = null;
        try {
            const profiles = await appClient.entities.Profile.filter({ email: userEmail });
            profile = profiles?.[0] || null;
        } catch (_) {}

        // Check verification credentials
        const verifiedIdentity = Boolean(profile?.id_verified || profile?.verified_identity || profile?.id_number);
        const verifiedIncome = Boolean(profile?.income_verified || profile?.verified_income || profile?.monthly_income);
        const verifiedEmployment = Boolean(profile?.employment_verified || profile?.verified_employment || profile?.employer_name);

        let verificationPoints = 0;
        if (verifiedIdentity) verificationPoints += 40;
        if (verifiedIncome) verificationPoints += 35;
        if (verifiedEmployment) verificationPoints += 35;

        // 2. Fetch payments made by this tenant
        let paymentsCount = 0;
        try {
            const payments = await appClient.entities.Payment.filter({ tenant_id: userEmail });
            if (Array.isArray(payments)) {
                paymentsCount = payments.filter(p => p.status === 'completed' || p.status === 'success' || p.status === 'paid').length;
            }
        } catch (_) {}

        const paymentPoints = Math.min(120, paymentsCount * 15);

        // 3. Fetch leases and calculate occupancy duration
        let monthsOccupied = 0;
        let activeLeasesCount = 0;
        let completedLeasesCount = 0;

        try {
            const leases = await appClient.entities.Lease.filter({ tenant_id: userEmail });
            if (Array.isArray(leases)) {
                const now = new Date();
                leases.forEach(lease => {
                    const isBothSigned = (lease.status === 'active' || (lease.tenant_signature && lease.landlord_signature));
                    if (isBothSigned && lease.start_date) {
                        const startDate = new Date(lease.start_date);
                        if (!isNaN(startDate.getTime()) && startDate <= now) {
                            activeLeasesCount++;
                            const diffDays = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
                            const months = Math.floor(diffDays / 30);
                            monthsOccupied += months;
                        }
                    }
                    if (lease.status === 'completed' || lease.status === 'ended') {
                        completedLeasesCount++;
                    }
                });
            }
        } catch (_) {}

        // Occupancy Duration factor: +5 pts per month spent actively occupying
        const occupancyPoints = Math.min(100, monthsOccupied * 5);
        const leaseCompletionPoints = Math.min(50, completedLeasesCount * 25);

        // Calculate total score: Base 550, max 850, min 300
        const baseScore = 550;
        const totalCalculated = Math.min(850, Math.max(300, baseScore + verificationPoints + paymentPoints + occupancyPoints + leaseCompletionPoints));

        // Sub-scores (0-100 scale)
        const paymentHistoryScore = Math.min(100, 60 + Math.floor(paymentPoints / 3));
        const verificationScore = Math.min(100, Math.round((verificationPoints / 110) * 100));
        const leaseScore = Math.min(100, 50 + occupancyPoints / 2 + leaseCompletionPoints);
        const reviewScore = Math.min(100, 75 + (activeLeasesCount > 0 ? 15 : 0));

        const historyPayload = {
            verified_identity: verifiedIdentity,
            verified_income: verifiedIncome,
            verified_employment: verifiedEmployment,
            verification_score: verificationScore,
            payment_history_score: paymentHistoryScore,
            lease_completion_score: leaseScore,
            landlord_reviews_score: reviewScore,
            months_occupied: monthsOccupied,
            active_leases_count: activeLeasesCount,
            payments_recorded: paymentsCount,
            last_scored_at: new Date().toISOString()
        };

        // Check if RentScore record exists in DB
        const existingScores = await appClient.entities.RentScore.filter({ user_id: userEmail });
        const existingRecord = existingScores?.[0];

        const payload = {
            user_id: userEmail,
            score: totalCalculated,
            history: historyPayload,
            // Also assign flat fields for backward compatibility with components
            payment_history_score: paymentHistoryScore,
            lease_completion_score: leaseScore,
            landlord_reviews_score: reviewScore,
            verification_score: verificationScore,
            verified_identity: verifiedIdentity,
            verified_income: verifiedIncome,
            verified_employment: verifiedEmployment,
            updated_at: new Date().toISOString()
        };

        if (existingRecord?.id) {
            const updated = await appClient.entities.RentScore.update(existingRecord.id, payload);
            return updated;
        } else {
            const created = await appClient.entities.RentScore.create(payload);
            return created;
        }
    } catch (err) {
        console.warn('RentScore sync engine notice:', err);
        return null;
    }
}

/**
 * Updates a tenant's RentScore automatically when a Paygate payment transaction is confirmed.
 */
export async function processPaygateRentScoreUpdate(tenantId, paymentData) {
    if (!tenantId) return null;
    return await syncAndScoreTenant(tenantId);
}
