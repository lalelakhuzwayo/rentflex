import { appClient } from '@/api/appClient';

/**
 * Updates a tenant's RentScore automatically when a Paygate payment transaction is confirmed.
 * @param {string} tenantId - Email or User ID of the tenant paying rent/fees
 * @param {object} paymentData - Details of the paygate transaction (amount, payment_type, transaction_id, etc.)
 */
export async function processPaygateRentScoreUpdate(tenantId, paymentData) {
    if (!tenantId) return null;

    try {
        // Fetch existing RentScore or initialize
        const scores = await appClient.entities.RentScore.filter({ user_id: tenantId });
        let rentScoreRecord = scores[0];

        const isRentPayment = paymentData?.type === 'rent' || !paymentData?.type;
        const ptsGain = isRentPayment ? 15 : 10;

        if (rentScoreRecord) {
            const currentScore = rentScoreRecord.score || 600;
            const currentHistoryScore = rentScoreRecord.payment_history_score || 70;
            
            const newScore = Math.min(850, currentScore + ptsGain);
            const newHistoryScore = Math.min(100, currentHistoryScore + 5);

            const updatedRecord = await appClient.entities.RentScore.update(rentScoreRecord.id, {
                score: newScore,
                payment_history_score: newHistoryScore,
                last_updated: new Date().toISOString()
            });

            return updatedRecord;
        } else {
            // Create initial score
            const newRecord = await appClient.entities.RentScore.create({
                user_id: tenantId,
                score: 615,
                payment_history_score: 80,
                lease_completion_score: 70,
                landlord_reviews_score: 75,
                verification_score: 50,
                verified_income: false,
                verified_employment: false,
                verified_identity: false,
                last_updated: new Date().toISOString()
            });

            return newRecord;
        }
    } catch (err) {
        console.error('Error processing RentScore Paygate update:', err);
        return null;
    }
}
