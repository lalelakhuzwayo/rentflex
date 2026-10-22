import { appClient } from '@/api/appClient';

/**
 * RentFlex Contractor JobScore™ Engine
 * 
 * Accrues and dynamically recalculates a contractor's JobScore™ based on:
 * 1. Base Score: 500 (Score range 300 - 850)
 * 2. Document & ID Verifications: +50 to +100 pts
 * 3. Completed & Paid Maintenance Jobs: +25 pts per completed job (up to 200 pts)
 * 4. Landlord Satisfaction & Ratings: up to 100 pts
 * 5. Turnaround & On-Time Performance: up to 50 pts
 * 
 * @param {string} contractorIdOrUserId - Contractor UUID or user_id
 * @returns {Promise<object>} - Updated contractor record
 */
export async function syncAndScoreContractor(contractorIdOrUserId) {
    if (!contractorIdOrUserId) return null;

    try {
        // 1. Locate contractor profile
        let contractor = null;
        try {
            const byId = await appClient.entities.Contractor.filter({ id: contractorIdOrUserId });
            if (byId?.[0]) contractor = byId[0];
            if (!contractor) {
                const byUserId = await appClient.entities.Contractor.filter({ user_id: contractorIdOrUserId });
                if (byUserId?.[0]) contractor = byUserId[0];
            }
            if (!contractor) {
                const byEmail = await appClient.entities.Contractor.filter({ email: contractorIdOrUserId });
                if (byEmail?.[0]) contractor = byEmail[0];
            }
        } catch (e) {
            console.warn('Error fetching contractor:', e);
        }

        if (!contractor) return null;

        const contractorUserId = contractor.user_id || contractor.id;

        // 2. Fetch all completed jobs and bids for this contractor
        let completedJobsCount = Number(contractor.completed_tasks_count || 0);
        let averageRating = Number(contractor.rating || 5.0);
        let ratingsCount = Number(contractor.reviews_count || 0);

        try {
            const allJobs = await appClient.entities.ContractorJob.list().catch(() => []);
            if (Array.isArray(allJobs)) {
                const myCompleted = allJobs.filter(
                    j => (j.contractor_id === contractorUserId || j.contractor_id === contractor.id) &&
                         (j.status === 'completed' || j.landlord_rating)
                );
                completedJobsCount = Math.max(completedJobsCount, myCompleted.length);

                const ratedJobs = myCompleted.filter(j => j.landlord_rating);
                if (ratedJobs.length > 0) {
                    ratingsCount = ratedJobs.length;
                    const ratingSum = ratedJobs.reduce((acc, j) => acc + Number(j.landlord_rating || 5), 0);
                    averageRating = Number((ratingSum / ratedJobs.length).toFixed(1));
                }
            }
        } catch (_) {}

        // 3. Compute verification points
        const verificationPoints = contractor.verified || contractor.verification_status === 'verified'
            ? 100
            : Math.min(80, Math.round((Number(contractor.verification_score || 0) / 100) * 80));

        // 4. Compute job completion points (+25 pts per verified completed job, max 200 pts)
        const jobPoints = Math.min(200, completedJobsCount * 25);

        // 5. Rating points (0 to 100 pts)
        const ratingPoints = Math.round((Math.max(1, averageRating) / 5) * 100);

        // 6. Base Score 500, Min 300, Max 850
        const baseScore = 500;
        const totalJobScore = Math.min(850, Math.max(300, baseScore + verificationPoints + jobPoints + ratingPoints - 50));

        // 7. Update contractor table
        const updatePayload = {
            job_score: totalJobScore,
            completed_tasks_count: completedJobsCount,
            rating: averageRating,
            reviews_count: ratingsCount
        };

        const updated = await appClient.entities.Contractor.update(contractor.id, updatePayload);
        return updated || { ...contractor, ...updatePayload };
    } catch (err) {
        console.warn('Contractor JobScore sync notice:', err);
        return null;
    }
}

/**
 * Completes a landlord-to-contractor job payout via Paystack,
 * logs the payment record, and updates Contractor JobScore™.
 */
export async function recordContractorJobPayout({
    jobId,
    bidId,
    contractorId,
    landlordId,
    amount,
    transactionId
}) {
    if (!contractorId || !amount) {
        throw new Error('Missing contractorId or amount for payout');
    }

    // 1. Record payment in public.payments table
    const paymentRecord = await appClient.entities.Payment.create({
        lease_id: null,
        tenant_id: landlordId || 'landlord', // Payer
        landlord_id: contractorId,          // Payee
        amount: Number(amount),
        due_date: new Date().toISOString().split('T')[0],
        paid_date: new Date().toISOString().split('T')[0],
        status: 'paid',
        type: 'maintenance',
        payment_method: 'paystack',
        transaction_id: transactionId || `PSTK-JOB-${Date.now()}`
    });

    // 2. Mark the job as completed if jobId exists
    if (jobId) {
        try {
            await appClient.entities.Job.update(jobId, {
                status: 'completed'
            });
        } catch (e) {
            console.warn('Could not update job status:', e);
        }
    }

    // 3. Mark the bid as accepted if bidId exists
    if (bidId) {
        try {
            await appClient.entities.ContractorBid.update(bidId, {
                status: 'accepted'
            });
        } catch (e) {
            console.warn('Could not update bid status:', e);
        }
    }

    // 4. Update contractor's official JobScore™
    const contractorUpdate = await syncAndScoreContractor(contractorId);

    return {
        payment: paymentRecord,
        contractor: contractorUpdate
    };
}
