import { appClient } from '@/api/appClient';
import { parseSafeDate, formatDate } from './dateUtils';

export const isValidUuid = (val) =>
    typeof val === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

/**
 * Calculates end date based on start date string (YYYY-MM-DD) and duration in months.
 */
export function calculateLeaseEndDate(startDateStr, durationMonths = 12) {
    const start = parseSafeDate(startDateStr) || new Date();
    const end = new Date(start);
    end.setMonth(end.getMonth() + parseInt(durationMonths || 12, 10));
    return end.toISOString().split('T')[0];
}

/**
 * Checks if a property is off-market based on property status or active/accepted lease date range.
 */
export function isPropertyOffMarket(property, leases = [], targetDate = new Date()) {
    if (!property) return false;
    
    // Explicit status check
    const status = String(property.status || '').toLowerCase();
    if (status === 'rented' || status === 'unlisted') {
        return true;
    }

    if (!Array.isArray(leases) || leases.length === 0) {
        return false;
    }

    const targetTime = targetDate.getTime();
    const propIdStr = String(property.id);

    // Check if any lease for this property is active/pending and target date falls in lease window
    return leases.some(lease => {
        if (!lease || String(lease.property_id) !== propIdStr) return false;
        
        const leaseStatus = String(lease.status || '').toLowerCase();
        const activeStatuses = ['active', 'pending', 'pending_tenant_signature', 'pending_landlord_signature'];
        if (!activeStatuses.includes(leaseStatus)) return false;

        const start = parseSafeDate(lease.start_date);
        const end = parseSafeDate(lease.end_date);
        if (!start) return false;

        const startTime = start.getTime();
        const endTime = end ? end.getTime() : Infinity;

        return targetTime >= startTime && targetTime <= endTime;
    });
}

/**
 * Centralized function to initiate an official E-Lease agreement between tenant and landlord
 * after a bid is accepted, and immediately remove the property off the market for the move-in to move-out period.
 */
export async function initiateLeaseFromAcceptedBid({ bid, landlordUser, queryClient }) {
    if (!bid) {
        throw new Error('Invalid bid data provided.');
    }

    const startDate = bid.move_in_date || new Date().toISOString().split('T')[0];
    const leaseMonths = parseInt(bid.proposed_lease_months || bid.lease_duration_months || '12', 10);
    const endDate = calculateLeaseEndDate(startDate, leaseMonths);
    const rent = parseFloat(bid.proposed_rent || bid.bid_amount || 0);

    const landlordId = landlordUser?.email || landlordUser?.id || bid.landlord_id || 'landlord';
    const landlordName = landlordUser?.full_name || 'Landlord';
    const tenantId = bid.tenant_id || bid.bidder_id || bid.tenant_email;
    const tenantName = bid.tenant_name || 'Tenant';
    const propertyId = isValidUuid(bid.property_id) ? bid.property_id : null;

    // 1. Create Lease record in Supabase database
    const leasePayload = {
        landlord_id: landlordId,
        landlord_name: landlordName,
        tenant_id: tenantId,
        tenant_name: tenantName,
        property_id: propertyId,
        property_title: bid.property_title || 'Rental Property',
        property_address: bid.property_address || '',
        monthly_rent: rent,
        deposit_amount: rent,
        start_date: startDate,
        end_date: endDate,
        status: 'pending_tenant_signature',
        signed: false,
        created_from_bid_id: isValidUuid(bid.id) ? bid.id : null,
        terms: 'Standard South African Residential Lease Agreement (Rental Housing Act compliant).'
    };

    const createdLease = await appClient.entities.Lease.create(leasePayload);

    // 2. Update Bid status to 'accepted'
    const updatedBid = await appClient.entities.Bid.update(bid.id, {
        status: 'accepted',
        responded_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    });

    // 3. Remove property off the market from move-in date to move-out date
    if (propertyId) {
        try {
            const prop = await appClient.entities.Property.get(propertyId);
            if (prop) {
                if (prop.is_room_rental || prop.rental_type === 'room') {
                    const currentVacant = prop.available_rooms !== undefined ? prop.available_rooms : (prop.total_rooms || prop.bedrooms || 1);
                    const newVacant = Math.max(0, currentVacant - 1);
                    await appClient.entities.Property.update(prop.id, {
                        available_rooms: newVacant,
                        status: newVacant <= 0 ? 'rented' : 'available'
                    });
                } else {
                    // Update property status to 'rented' (off the market) for the lease period
                    await appClient.entities.Property.update(prop.id, {
                        status: 'rented'
                    });
                }
            }
        } catch (err) {
            console.warn('Property status update warning:', err);
        }
    }

    // 4. Send notifications into bid conversation thread & tenant inbox
    const notificationText = `🎉 Bid Accepted & E-Lease Initiated! Landlord accepted your bid of R${rent.toLocaleString()}/month. Official lease contract generated for move-in from ${formatDate(startDate)} to ${formatDate(endDate)}. Please review & e-sign in your Leases portal.`;

    if (tenantId) {
        await appClient.entities.Message.create({
            conversation_id: `bid_${bid.id}`,
            sender_id: landlordId,
            receiver_id: tenantId,
            content: notificationText
        }).catch(() => {});

        if (landlordId) {
            await appClient.entities.Message.create({
                conversation_id: `${tenantId}_${landlordId}`,
                sender_id: landlordId,
                receiver_id: tenantId,
                content: notificationText
            }).catch(() => {});
        }
    }

    // 5. Invalidate Query Client cache if available
    if (queryClient) {
        queryClient.invalidateQueries({ queryKey: ['propertyBids'] });
        queryClient.invalidateQueries({ queryKey: ['leases'] });
        queryClient.invalidateQueries({ queryKey: ['allLeases'] });
        queryClient.invalidateQueries({ queryKey: ['properties'] });
        queryClient.invalidateQueries({ queryKey: ['properties-list-all'] });
        queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
        queryClient.invalidateQueries({ queryKey: ['messages'] });
        queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
    }

    return { lease: createdLease, bid: updatedBid };
}

/**
 * Reconciles properties with leases:
 * - If a property has an active lease for today, ensures property status is 'rented'.
 * - If all leases have passed their end_date, restores property status to 'available'.
 */
export async function syncPropertyMarketAvailability(properties = [], leases = []) {
    if (!Array.isArray(properties) || properties.length === 0) return;
    const now = new Date();

    for (const prop of properties) {
        if (!prop || !prop.id) continue;

        const propLeases = (leases || []).filter(l => String(l.property_id) === String(prop.id));
        const activeLease = propLeases.find(l => {
            const status = String(l.status || '').toLowerCase();
            const isActiveState = ['active', 'pending', 'pending_tenant_signature', 'pending_landlord_signature'].includes(status);
            if (!isActiveState) return false;
            const start = parseSafeDate(l.start_date);
            const end = parseSafeDate(l.end_date);
            if (!start) return false;
            return now >= start && (!end || now <= end);
        });

        const currentStatus = String(prop.status || '').toLowerCase();

        if (activeLease && currentStatus === 'available') {
            // Property has an active/initiated lease -> remove off market
            try {
                await appClient.entities.Property.update(prop.id, { status: 'rented' });
            } catch (_) {}
        } else if (!activeLease && currentStatus === 'rented') {
            // Check if all leases ended -> restore to available
            const hasAnyOngoingLease = propLeases.some(l => {
                const s = String(l.status || '').toLowerCase();
                return ['active', 'pending', 'pending_tenant_signature', 'pending_landlord_signature'].includes(s);
            });
            if (!hasAnyOngoingLease) {
                try {
                    await appClient.entities.Property.update(prop.id, { status: 'available' });
                } catch (_) {}
            }
        }
    }
}
