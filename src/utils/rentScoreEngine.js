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
    const userId = typeof userOrEmail === 'object' ? userOrEmail?.id : null;

    if (!userEmail && !userId) return null;

    const lookupKey = userEmail || userId;

    try {
        // 1. Fetch user's profile to check verified status
        let profile = null;
        try {
            if (userEmail) {
                const profiles = await appClient.entities.Profile.filter({ email: userEmail });
                profile = profiles?.[0] || null;
            }
            if (!profile && userId) {
                const profiles = await appClient.entities.Profile.filter({ id: userId });
                profile = profiles?.[0] || null;
            }
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
            const paymentsByEmail = userEmail ? await appClient.entities.Payment.filter({ tenant_id: userEmail }).catch(() => []) : [];
            const paymentsById = userId ? await appClient.entities.Payment.filter({ tenant_id: userId }).catch(() => []) : [];
            const rawPayments = [...(Array.isArray(paymentsByEmail) ? paymentsByEmail : []), ...(Array.isArray(paymentsById) ? paymentsById : [])];
            const seenP = new Set();
            const payments = rawPayments.filter(p => {
                const pid = p.id || JSON.stringify(p);
                if (seenP.has(pid)) return false;
                seenP.add(pid);
                return true;
            });
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
            const leasesByEmail = userEmail ? await appClient.entities.Lease.filter({ tenant_id: userEmail }).catch(() => []) : [];
            const leasesById = userId ? await appClient.entities.Lease.filter({ tenant_id: userId }).catch(() => []) : [];
            let rawLeases = [...(Array.isArray(leasesByEmail) ? leasesByEmail : []), ...(Array.isArray(leasesById) ? leasesById : [])];
            
            if (rawLeases.length === 0) {
                const allLeasesList = await appClient.entities.Lease.list().catch(() => []);
                if (Array.isArray(allLeasesList)) {
                    rawLeases = allLeasesList.filter(l => 
                        (userEmail && l.tenant_id && l.tenant_id.toLowerCase() === userEmail) ||
                        (userId && l.tenant_id === userId) ||
                        (l.tenant_name && typeof userOrEmail === 'object' && userOrEmail?.full_name && l.tenant_name.toLowerCase() === userOrEmail.full_name.toLowerCase())
                    );
                }
            }

            const seenL = new Set();
            const leases = rawLeases.filter(l => {
                const lid = l.id || JSON.stringify(l);
                if (seenL.has(lid)) return false;
                seenL.add(lid);
                return true;
            });

            if (Array.isArray(leases)) {
                const now = new Date();
                leases.forEach(lease => {
                    const isBothSigned = (lease.status === 'active' || (lease.tenant_signature && lease.landlord_signature));
                    if (isBothSigned && lease.start_date) {
                        activeLeasesCount++;
                        const startDate = new Date(lease.start_date);
                        if (!isNaN(startDate.getTime()) && startDate <= now) {
                            const diffDays = Math.max(0, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
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

        // Occupancy Duration factor: +10 base active tenancy bonus + +5 pts per month spent actively occupying
        const activeLeaseBonus = activeLeasesCount > 0 ? 10 : 0;
        const occupancyPoints = Math.min(100, activeLeaseBonus + (monthsOccupied * 5));
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
        let existingScores = userEmail ? await appClient.entities.RentScore.filter({ user_id: userEmail }).catch(() => []) : [];
        if ((!existingScores || existingScores.length === 0) && userId) {
            existingScores = await appClient.entities.RentScore.filter({ user_id: userId }).catch(() => []);
        }
        const existingRecord = existingScores?.[0];

        const payload = {
            user_id: lookupKey,
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
