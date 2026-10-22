import { appClient } from '@/api/appClient';
import { initiatePaystackPayment } from '@/lib/paystack';
import { syncAndScoreTenant } from '@/utils/rentScoreEngine';
import { syncAndScoreContractor, recordContractorJobPayout } from '@/utils/contractorScoreEngine';

/**
 * Universal Paystack Transaction Dispatcher & Status Handler
 * 
 * Supports all 3 flow directions:
 * 1. Tenant -> Landlord (Rent, Deposit, Application Fee) [Boosts RentScore]
 * 2. Landlord -> Contractor (Job Payment, Repairs) [Boosts JobScore]
 * 3. Contractor -> Landlord (Refunds, Materials, Adjustments)
 * 
 * @param {Object} params
 * @param {string} params.email - Payer email
 * @param {number} params.amount - Amount in ZAR
 * @param {('tenant_to_landlord'|'landlord_to_contractor'|'contractor_to_landlord')} params.flowType
 * @param {string} [params.paymentId] - Existing pending payment ID if completing a scheduled bill
 * @param {string} [params.leaseId] - Associated lease ID
 * @param {string} [params.jobId] - Associated contractor job ID
 * @param {string} [params.bidId] - Associated contractor bid ID
 * @param {string} params.payerId - Email or User ID of payer
 * @param {string} params.payeeId - Email or User ID of payee
 * @param {string} [params.paymentType='rent'] - 'rent' | 'deposit' | 'maintenance' | 'fee'
 * @param {string} [params.description] - Human readable note/title
 * @param {Function} params.onSuccess - Callback upon successful verification
 * @param {Function} [params.onClose] - Callback when modal is closed
 * @param {Function} [params.onError] - Callback on error
 */
export async function executePaystackPayment({
    email,
    amount,
    flowType = 'tenant_to_landlord',
    paymentId,
    leaseId,
    jobId,
    bidId,
    payerId,
    payeeId,
    paymentType = 'rent',
    description = '',
    onSuccess,
    onClose,
    onError
}) {
    const cleanAmount = Number(amount);
    if (!cleanAmount || cleanAmount <= 0) {
        throw new Error('Please enter a valid amount.');
    }

    const metadata = {
        flow_type: flowType,
        payment_type: paymentType,
        payer_id: payerId,
        payee_id: payeeId,
        payment_id: paymentId || null,
        lease_id: leaseId || null,
        job_id: jobId || null,
        bid_id: bidId || null,
        description: description || 'RentFlex Secure Transaction'
    };

    return initiatePaystackPayment({
        email: email || payerId,
        amount: cleanAmount,
        metadata,
        onSuccess: async (paystackResponse) => {
            try {
                const txRef = paystackResponse.reference;
                let finalPaymentRecord = null;
                let scoreUpdate = null;

                // 1. If existing pending payment record exists, update it
                if (paymentId) {
                    finalPaymentRecord = await appClient.entities.Payment.update(paymentId, {
                        status: 'paid',
                        paid_date: new Date().toISOString().split('T')[0],
                        payment_method: 'paystack',
                        transaction_id: txRef
                    });
                } else {
                    // Create new payment record
                    finalPaymentRecord = await appClient.entities.Payment.create({
                        lease_id: leaseId || null,
                        tenant_id: payerId,
                        landlord_id: payeeId,
                        amount: cleanAmount,
                        due_date: new Date().toISOString().split('T')[0],
                        paid_date: new Date().toISOString().split('T')[0],
                        status: 'paid',
                        type: paymentType,
                        payment_method: 'paystack',
                        transaction_id: txRef
                    });
                }

                // 2. Route score accrual based on flowType
                if (flowType === 'tenant_to_landlord' || paymentType === 'rent' || paymentType === 'deposit') {
                    // Tenant accrues RentScore (+15 pts for on-time payment)
                    scoreUpdate = await syncAndScoreTenant(payerId);
                } else if (flowType === 'landlord_to_contractor' || paymentType === 'maintenance') {
                    // Contractor accrues JobScore™
                    if (jobId || bidId) {
                        scoreUpdate = await recordContractorJobPayout({
                            jobId,
                            bidId,
                            contractorId: payeeId,
                            landlordId: payerId,
                            amount: cleanAmount,
                            transactionId: txRef
                        });
                    } else {
                        scoreUpdate = await syncAndScoreContractor(payeeId);
                    }
                } else if (flowType === 'contractor_to_landlord') {
                    // Contractor reimbursing or paying landlord
                    scoreUpdate = await syncAndScoreContractor(payerId);
                }

                onSuccess?.({
                    payment: finalPaymentRecord,
                    paystack: paystackResponse,
                    scoreUpdate,
                    flowType
                });
            } catch (err) {
                console.error('Failed to finalize payment in database:', err);
                onError?.(err);
            }
        },
        onClose,
        onError
    });
}
