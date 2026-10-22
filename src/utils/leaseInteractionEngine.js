import { appClient } from '@/api/appClient';
import { syncAndScoreTenant } from '@/utils/rentScoreEngine';
import { calculateLeaseEndDate } from '@/utils/leaseManager';

/**
 * Cancels or terminates a lease with role-based penalties:
 * - If Tenant cancels: applies financial cancellation penalty invoice and RentScore penalty deduction.
 * - If Landlord cancels: releases tenant obligations without score penalty.
 * - Updates property availability back to available.
 */
export async function cancelOrTerminateLease({
    lease,
    cancelledBy = 'tenant', // 'tenant' | 'landlord' | 'mutual'
    reason = '',
    financialPenaltyAmount = 0,
    scorePenaltyPoints = 35,
    currentUser
}) {
    if (!lease?.id) {
        throw new Error('Valid lease required for cancellation');
    }

    const now = new Date().toISOString();
    const isTenant = cancelledBy === 'tenant';
    const isLandlord = cancelledBy === 'landlord';

    const cleanFinancialPenalty = isTenant ? Math.max(0, Number(financialPenaltyAmount || 0)) : 0;
    const cleanScorePenalty = isTenant ? Math.max(0, Number(scorePenaltyPoints || 35)) : 0;

    // 1. Update lease record
    const updatedLease = await appClient.entities.Lease.update(lease.id, {
        status: isTenant ? 'cancelled' : 'terminated',
        cancelled_by: cancelledBy,
        cancellation_reason: reason || (isTenant ? 'Early tenant lease termination' : 'Landlord cancellation'),
        cancelled_at: now,
        financial_penalty_applied: cleanFinancialPenalty,
        score_penalty_applied: cleanScorePenalty,
        occupancy_status: 'vacated',
        updated_at: now
    });

    // 2. If tenant cancelled with financial penalty, generate a pending penalty payment record
    if (isTenant && cleanFinancialPenalty > 0) {
        await appClient.entities.Payment.create({
            lease_id: lease.id,
            tenant_id: lease.tenant_id,
            landlord_id: lease.landlord_id,
            amount: cleanFinancialPenalty,
            due_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            status: 'pending',
            type: 'fee',
            description: `Early Lease Cancellation Fee: ${lease.property_title || 'Rental Unit'}`
        }).catch(err => console.warn('Penalty payment creation notice:', err));
    }

    // 3. Update property availability
    if (lease.property_id) {
        try {
            const prop = await appClient.entities.Property.get(lease.property_id);
            if (prop) {
                if (prop.rental_type === 'room') {
                    const currentVacant = prop.available_rooms !== undefined ? prop.available_rooms : 0;
                    await appClient.entities.Property.update(prop.id, {
                        available_rooms: currentVacant + 1,
                        status: 'available'
                    });
                } else {
                    await appClient.entities.Property.update(prop.id, {
                        status: 'available'
                    });
                }
            }
        } catch (err) {
            console.warn('Property availability reset notice:', err);
        }
    }

    // 4. Send notification message
    const notifier = currentUser?.email || currentUser?.id || cancelledBy;
    const recipient = isTenant ? lease.landlord_id : lease.tenant_id;
    const messageContent = isTenant
        ? `⚠️ Lease Cancelled by Tenant: ${lease.tenant_name || 'Tenant'} has cancelled the lease for "${lease.property_title}". Reason: ${reason || 'Early cancellation'}. Penalty: R${cleanFinancialPenalty.toLocaleString()} (${cleanScorePenalty} pts score impact).`
        : `ℹ️ Lease Terminated by Landlord: "${lease.property_title}" agreement has been terminated. Reason: ${reason || 'Landlord notice'}. Tenant RentScore is protected.`;

    if (recipient) {
        await appClient.entities.Message.create({
            conversation_id: `lease_${lease.id}`,
            sender_id: notifier,
            receiver_id: recipient,
            content: messageContent
        }).catch(() => {});
    }

    // 5. Trigger RentScore recalculation for tenant
    if (lease.tenant_id) {
        await syncAndScoreTenant(lease.tenant_id).catch(() => {});
    }

    return updatedLease;
}

/**
 * Renews an existing lease agreement:
 * - Extends end_date by specified months.
 * - Optionally updates rent amount.
 * - Increments renewal count.
 * - Accrues +25 bonus RentScore points for verified renewal!
 */
export async function renewLeaseAgreement({
    lease,
    extensionMonths = 12,
    newMonthlyRent,
    renewalNotes = '',
    currentUser
}) {
    if (!lease?.id) {
        throw new Error('Valid lease required for renewal');
    }

    const currentEndDate = lease.end_date || new Date().toISOString().split('T')[0];
    const newEndDate = calculateLeaseEndDate(currentEndDate, parseInt(extensionMonths, 10));
    const cleanRent = newMonthlyRent !== undefined && Number(newMonthlyRent) > 0
        ? Number(newMonthlyRent)
        : Number(lease.monthly_rent || 0);

    const now = new Date().toISOString();
    const newRenewalCount = (parseInt(lease.renewal_count || 0, 10)) + 1;

    // Update lease
    const updatedLease = await appClient.entities.Lease.update(lease.id, {
        end_date: newEndDate,
        monthly_rent: cleanRent,
        status: 'active',
        occupancy_status: 'active',
        renewal_count: newRenewalCount,
        last_renewed_at: now,
        renewal_notes: renewalNotes || `Renewed for ${extensionMonths} months until ${newEndDate}`,
        updated_at: now
    });

    // Notify parties
    const notifier = currentUser?.email || currentUser?.id || 'RentFlex';
    const otherParty = currentUser?.email === lease.tenant_id ? lease.landlord_id : lease.tenant_id;
    if (otherParty) {
        await appClient.entities.Message.create({
            conversation_id: `lease_${lease.id}`,
            sender_id: notifier,
            receiver_id: otherParty,
            content: `🎉 Lease Agreement Renewed! "${lease.property_title}" has been successfully extended for ${extensionMonths} months until ${newEndDate} at R${cleanRent.toLocaleString()}/month. Tenant earns +25 RentScore renewal bonus points!`
        }).catch(() => {});
    }

    // Update tenant's RentScore to reflect renewal incentive (+25 pts)
    if (lease.tenant_id) {
        await syncAndScoreTenant(lease.tenant_id).catch(() => {});
    }

    return updatedLease;
}

/**
 * Customizes lease payment arrangements, cutoff rules, and penalty policies.
 * Landlord can configure:
 * - payment_frequency ('monthly', 'bi_weekly', 'weekly')
 * - payment_due_day (1-31)
 * - payment_cutoff_day (1-31)
 * - payment_cutoff_time ('23:59')
 * - grace_period_days (days)
 * - late_penalty_fee (R)
 * - cancellation_fee (R)
 * - cancellation_score_penalty (pts)
 */
export async function customizeLeaseArrangements({
    leaseId,
    termsPayload,
    currentUser
}) {
    if (!leaseId) {
        throw new Error('Lease ID required to update terms');
    }

    const payload = {
        payment_frequency: termsPayload.payment_frequency || 'monthly',
        payment_due_day: parseInt(termsPayload.payment_due_day || 1, 10),
        payment_cutoff_day: parseInt(termsPayload.payment_cutoff_day || 5, 10),
        payment_cutoff_time: termsPayload.payment_cutoff_time || '23:59',
        grace_period_days: parseInt(termsPayload.grace_period_days || 3, 10),
        late_penalty_fee: parseFloat(termsPayload.late_penalty_fee || 250),
        cancellation_fee: parseFloat(termsPayload.cancellation_fee || 0),
        cancellation_score_penalty: parseInt(termsPayload.cancellation_score_penalty || 35, 10),
        monthly_rent: termsPayload.monthly_rent !== undefined ? parseFloat(termsPayload.monthly_rent) : undefined,
        deposit_amount: termsPayload.deposit_amount !== undefined ? parseFloat(termsPayload.deposit_amount) : undefined,
        updated_at: new Date().toISOString()
    };

    // Remove undefined fields
    Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);

    const updated = await appClient.entities.Lease.update(leaseId, payload);

    return updated;
}
