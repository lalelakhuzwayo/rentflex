import React, { useState, useEffect, useRef, useMemo } from 'react';
import { appClient } from '@/api/appClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Send,
    Image as ImageIcon,
    Video,
    ChevronLeft,
    Gavel,
    Calendar,
    FileText,
    MessageSquare,
    Check,
    CheckCheck,
    CheckCircle2,
    X,
    Building2,
    Search,
    RefreshCw,
    Paperclip
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { getReadMessageIds, markMessagesAsRead, getViewedItemIds, markItemsAsViewed } from '@/utils/realtimeNotificationManager';
import { initiateLeaseFromAcceptedBid } from '@/utils/leaseManager';

const normalizeStr = (val) => String(val || '').toLowerCase().trim();

const getContactPairKey = (idA, idB) => {
    const a = normalizeStr(idA);
    const b = normalizeStr(idB);
    if (!a || !b) return a || b || 'unknown_contact';
    return [a, b].sort().join('__');
};

const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
};

export default function Messages() {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedConversationKey, setSelectedConversationKey] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'bids', 'tours', 'applications', 'chats'
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [uploading, setUploading] = useState(false);
    
    // Dedicated internal chat scroll container ref (NEVER scrolls the window page!)
    const chatContainerRef = useRef(null);

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    // ⚡ Supabase Realtime WebSocket Listener for Instant Updates
    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const handleRealtimeUpdate = () => {
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
            queryClient.invalidateQueries({ queryKey: ['messages-tours'] });
            queryClient.invalidateQueries({ queryKey: ['messages-applications'] });
            queryClient.invalidateQueries({ queryKey: ['conversations-leases'] });
        };

        const channel = supabase
            .channel('whatsapp_realtime_messages_unified')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, handleRealtimeUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bids' }, handleRealtimeUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tour_schedules' }, handleRealtimeUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'applications' }, handleRealtimeUpdate)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'leases' }, handleRealtimeUpdate)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const isLandlord = user?.user_type === 'landlord';
    const isSysAdmin = user?.user_type === 'sysAdmin';
    const isTenant = !isLandlord && !isSysAdmin;

    const myEmail = normalizeStr(user?.email);
    const myId = user?.id ? String(user.id) : null;

    // 1. Fetch Leases
    const { data: leases = [] } = useQuery({
        queryKey: ['conversations-leases', user?.email, user?.id, user?.user_type],
        queryFn: async () => {
            if (!user) return [];
            try {
                if (isSysAdmin) return await appClient.entities.Lease.list();
                if (isLandlord) {
                    const list1 = await appClient.entities.Lease.filter({ landlord_id: user.email });
                    const list2 = user.id ? await appClient.entities.Lease.filter({ landlord_id: user.id }) : [];
                    return Array.from(new Map([...list1, ...list2].map(item => [item.id, item])).values());
                }
                const list1 = await appClient.entities.Lease.filter({ tenant_id: user.email });
                const list2 = user.id ? await appClient.entities.Lease.filter({ tenant_id: user.id }) : [];
                return Array.from(new Map([...list1, ...list2].map(item => [item.id, item])).values());
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 2. Fetch Landlord Properties
    const { data: myProperties = [] } = useQuery({
        queryKey: ['messages-landlord-properties', user?.email, user?.id, isLandlord],
        queryFn: async () => {
            if (!user || (!isLandlord && !isSysAdmin)) return [];
            try {
                const list = await appClient.entities.Property.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;
                return list.filter(p => 
                    (p.landlord_id && (normalizeStr(p.landlord_id) === myEmail || p.landlord_id === myId)) ||
                    (p.owner_id && (normalizeStr(p.owner_id) === myEmail || p.owner_id === myId)) ||
                    (p.created_by && (normalizeStr(p.created_by) === myEmail || p.created_by === myId))
                );
            } catch (_) {
                return [];
            }
        },
        enabled: !!user && (isLandlord || isSysAdmin),
    });

    const landlordPropertyIds = useMemo(() => {
        return new Set((myProperties || []).map(p => String(p.id)));
    }, [myProperties]);

    // 3. Fetch Bids
    const { data: bids = [] } = useQuery({
        queryKey: ['messages-bids', user?.email, user?.id, isLandlord, myProperties?.length || 0],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.Bid.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;

                if (isTenant) {
                    return list.filter(b => 
                        (b.tenant_id && (normalizeStr(b.tenant_id) === myEmail || b.tenant_id === myId)) || 
                        (b.bidder_id && (normalizeStr(b.bidder_id) === myEmail || b.bidder_id === myId))
                    );
                }
                return list.filter(b => 
                    (b.landlord_id && (normalizeStr(b.landlord_id) === myEmail || b.landlord_id === myId)) ||
                    (b.property_id && landlordPropertyIds.has(String(b.property_id)))
                );
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 4. Fetch Tours
    const { data: tourSchedules = [] } = useQuery({
        queryKey: ['messages-tours', user?.email, user?.id, isLandlord, myProperties?.length || 0],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.TourSchedule.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;

                if (isTenant) {
                    return list.filter(t => 
                        (t.tenant_id && (normalizeStr(t.tenant_id) === myEmail || t.tenant_id === myId))
                    );
                }
                return list.filter(t => 
                    (t.landlord_id && (normalizeStr(t.landlord_id) === myEmail || t.landlord_id === myId)) ||
                    (t.property_id && landlordPropertyIds.has(String(t.property_id)))
                );
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 5. Fetch Applications
    const { data: applications = [] } = useQuery({
        queryKey: ['messages-applications', user?.email, user?.id, isLandlord, myProperties?.length || 0],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.Application.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;

                if (isTenant) {
                    return list.filter(a => 
                        (a.tenant_id && (normalizeStr(a.tenant_id) === myEmail || a.tenant_id === myId)) || 
                        (a.applicant_email && normalizeStr(a.applicant_email) === myEmail)
                    );
                }
                return list.filter(a => 
                    (a.landlord_id && (normalizeStr(a.landlord_id) === myEmail || a.landlord_id === myId)) ||
                    (a.property_id && landlordPropertyIds.has(String(a.property_id)))
                );
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 6. Fetch All Direct Messages
    const { data: allUserMessages = [] } = useQuery({
        queryKey: ['user-all-messages', user?.email, user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const uEmail = user.email;
                const uId = user.id;
                const list1 = uEmail ? await appClient.entities.Message.filter({ receiver_id: uEmail }) : [];
                const list2 = uEmail ? await appClient.entities.Message.filter({ sender_id: uEmail }) : [];
                const list3 = uId && uId !== uEmail ? await appClient.entities.Message.filter({ receiver_id: uId }) : [];
                const list4 = uId && uId !== uEmail ? await appClient.entities.Message.filter({ sender_id: uId }) : [];
                const combined = [...list1, ...list2, ...list3, ...list4];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            } catch (err) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
        refetchInterval: 3000,
        staleTime: 0,
    });

    // Helper to check if tour date/time has passed
    const isTourPassed = (t) => {
        if (!t?.requested_date) return false;
        try {
            const timeStr = t.requested_time ? t.requested_time.replace(/(AM|PM)/i, ' $1') : '23:59';
            const dt = new Date(`${t.requested_date} ${timeStr}`);
            return !isNaN(dt.getTime()) && dt < new Date();
        } catch (_) {
            return false;
        }
    };

    // Bid Actions Mutation
    const updateBidMutation = useMutation({
        mutationFn: async ({ id, status, counterRent }) => {
            if (status === 'accepted') {
                const targetBid = bids.find(b => String(b.id) === String(id)) || { id, status: 'accepted' };
                const res = await initiateLeaseFromAcceptedBid({
                    bid: { ...targetBid, status: 'accepted' },
                    landlordUser: user,
                    queryClient
                });
                return res.bid;
            }

            const payload = { status };
            if (counterRent) {
                payload.counter_rent = counterRent;
                payload.proposed_rent = counterRent;
                payload.bid_amount = counterRent;
            }
            payload.responded_at = new Date().toISOString();
            payload.updated_at = new Date().toISOString();
            const updated = await appClient.entities.Bid.update(id, payload);
            try {
                const receiverId = (myEmail === normalizeStr(updated.tenant_id) || myEmail === normalizeStr(updated.bidder_id) || myEmail === normalizeStr(updated.tenant_email))
                    ? (updated.landlord_id || 'landlord')
                    : (updated.tenant_id || updated.bidder_id || updated.tenant_email || 'tenant');

                const msgContent = status === 'countered'
                    ? `💬 Counter Offer: Landlord proposed R${counterRent?.toLocaleString()}/month.`
                    : status === 'rejected'
                        ? `❌ Property Bid Declined.`
                        : `Bid status updated to ${status}.`;

                if (receiverId) {
                    await appClient.entities.Message.create({
                        conversation_id: getContactPairKey(myEmail || myId, receiverId),
                        sender_id: user?.email || 'user',
                        receiver_id: receiverId,
                        content: msgContent
                    });
                }
            } catch (e) {
                console.warn('Bid message notify error:', e);
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
            queryClient.invalidateQueries({ queryKey: ['propertyBids'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            toast.success('Bid status updated!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update bid status');
        }
    });

    // Generate E-Lease from Bid Mutation
    const createLeaseFromBidMutation = useMutation({
        mutationFn: async (bid) => {
            const res = await initiateLeaseFromAcceptedBid({
                bid,
                landlordUser: user,
                queryClient
            });
            return res.lease;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
            queryClient.invalidateQueries({ queryKey: ['propertyBids'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            queryClient.invalidateQueries({ queryKey: ['leases'] });
            queryClient.invalidateQueries({ queryKey: ['properties'] });
            toast.success('🎉 Bid Accepted & E-Lease Initiated! Property is now reserved & off the market.');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to generate digital e-lease');
        }
    });

    // Tour Actions Mutation
    const updateTourMutation = useMutation({
        mutationFn: async ({ id, status, rescheduleDate, rescheduleTime, isAcceptingReschedule, rescheduledBy }) => {
            const payload = { status };
            if (rescheduleDate) {
                payload.requested_date = rescheduleDate;
                payload.reschedule_date = rescheduleDate;
            }
            if (rescheduleTime) {
                payload.requested_time = rescheduleTime;
                payload.reschedule_time = rescheduleTime;
            }
            if (rescheduledBy) {
                payload.rescheduled_by = rescheduledBy;
            }
            if (status === 'completed') {
                payload.completed_at = new Date().toISOString();
            }
            if (isAcceptingReschedule) {
                payload.tenant_confirmed_at = new Date().toISOString();
                payload.tenant_response = 'accepted';
            }

            const updated = await appClient.entities.TourSchedule.update(id, payload);
            try {
                const receiverId = (myEmail === normalizeStr(updated.tenant_id) || myEmail === normalizeStr(updated.tenant_email))
                    ? updated.landlord_id
                    : (updated.tenant_id || updated.tenant_email);

                const msgContent = isAcceptingReschedule
                    ? `✅ Rescheduled Viewing Accepted! Viewing agreed for ${updated.requested_date} at ${updated.requested_time}.`
                    : status === 'confirmed'
                        ? `✅ Viewing Confirmed for ${updated.requested_date} at ${updated.requested_time}.`
                        : status === 'completed'
                            ? `🏆 Viewing Completed! Landlord marked the property tour on ${updated.requested_date} as completed.`
                            : status === 'reschedule_requested' || status === 'rescheduled'
                                ? `🔄 Reschedule Proposed for ${rescheduleDate || updated.requested_date} at ${rescheduleTime || updated.requested_time}.`
                                : status === 'declined'
                                    ? `❌ Viewing Request Declined.`
                                    : `Tour viewing status: ${status}.`;

                if (receiverId) {
                    await appClient.entities.Message.create({
                        conversation_id: getContactPairKey(myEmail || myId, receiverId),
                        sender_id: user?.email || 'user',
                        receiver_id: receiverId,
                        content: msgContent
                    });
                }
            } catch (e) {
                console.warn('Tour message notify error:', e);
            }
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages-tours'] });
            queryClient.invalidateQueries({ queryKey: ['tourSchedules'] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            toast.success('Tour schedule updated!');
        },
        onError: (err) => {
            toast.error(err.message || 'Failed to update tour');
        }
    });

    // Track viewed state locally
    const [viewedVersion, setViewedVersion] = useState(0);

    useEffect(() => {
        const handleItemsViewed = () => {
            setViewedVersion(v => v + 1);
        };
        window.addEventListener('rentflex:items-viewed', handleItemsViewed);
        return () => window.removeEventListener('rentflex:items-viewed', handleItemsViewed);
    }, []);

    const viewedSet = useMemo(() => {
        return getViewedItemIds(user?.email || user?.id);
    }, [user, viewedVersion]);

    // 🟢 UNIFIED WHATSAPP CONTACT CONVERSATIONS GROUPING
    // Merges all interactions (bids, tours, apps, leases, direct messages) between the SAME TWO USERS into ONE clean contact entry!
    const unifiedConversations = useMemo(() => {
        if (!user) return [];

        const contactMap = new Map();

        const getOrCreateContact = (otherId, otherName, roleHint) => {
            const cleanOtherId = normalizeStr(otherId) || 'unknown_contact';
            const pairKey = getContactPairKey(myEmail || myId, cleanOtherId);

            if (!contactMap.has(pairKey)) {
                const displayName = otherName && otherName !== cleanOtherId ? otherName : (cleanOtherId || 'Contact User');
                contactMap.set(pairKey, {
                    id: pairKey,
                    otherId: cleanOtherId,
                    contactName: displayName,
                    initials: getInitials(displayName),
                    roleHint: roleHint || 'User',
                    latestTimestamp: '1970-01-01T00:00:00.000Z',
                    lastMessageText: '',
                    unreadCount: 0,
                    bids: [],
                    tours: [],
                    applications: [],
                    leases: [],
                    directMessageIds: new Set(),
                    relatedConvIds: new Set([pairKey]),
                    hasNewBid: false,
                    hasNewTour: false,
                    hasNewApp: false,
                });
            }

            const existing = contactMap.get(pairKey);
            if (otherName && (!existing.contactName || existing.contactName === cleanOtherId)) {
                existing.contactName = otherName;
                existing.initials = getInitials(otherName);
            }
            return existing;
        };

        // 1. Process Bids
        bids.forEach(b => {
            const isMeTenant = (normalizeStr(b.tenant_id) === myEmail || b.tenant_id === myId || normalizeStr(b.bidder_id) === myEmail || b.bidder_id === myId);
            const otherId = isMeTenant ? b.landlord_id : (b.tenant_id || b.bidder_id || b.tenant_email);
            const otherName = isMeTenant ? (b.landlord_name || 'Landlord') : (b.tenant_name || 'Tenant Bidder');

            const contact = getOrCreateContact(otherId, otherName, isMeTenant ? 'Landlord' : 'Tenant');
            contact.bids.push(b);
            if (b.id) contact.relatedConvIds.add(`bid_${b.id}`);

            const time = b.updated_at || b.created_at || new Date().toISOString();
            if (new Date(time) > new Date(contact.latestTimestamp)) {
                contact.latestTimestamp = time;
                contact.lastMessageText = `🏷️ Bid: R${(b.proposed_rent || b.bid_amount || 0).toLocaleString()}/mo (${String(b.status || 'pending').toUpperCase()})`;
            }
            if (b.status === 'pending' && !viewedSet.has(`bid_${b.id}`) && !viewedSet.has(String(b.id))) {
                contact.hasNewBid = true;
            }
        });

        // 2. Process Tour Schedules
        tourSchedules.forEach(t => {
            const isMeTenant = (normalizeStr(t.tenant_id) === myEmail || t.tenant_id === myId || normalizeStr(t.tenant_email) === myEmail);
            const otherId = isMeTenant ? t.landlord_id : (t.tenant_id || t.tenant_email);
            const otherName = isMeTenant ? (t.landlord_name || 'Landlord') : (t.tenant_name || 'Viewing Visitor');

            const contact = getOrCreateContact(otherId, otherName, isMeTenant ? 'Landlord' : 'Tenant');
            contact.tours.push(t);
            if (t.id) contact.relatedConvIds.add(`tour_${t.id}`);

            const time = t.updated_at || t.created_at || new Date().toISOString();
            if (new Date(time) > new Date(contact.latestTimestamp)) {
                contact.latestTimestamp = time;
                contact.lastMessageText = `📅 Viewing: ${t.requested_date} @ ${t.requested_time} (${String(t.status || 'pending').toUpperCase()})`;
            }
            if ((t.status === 'pending' || t.status === 'reschedule_requested') && !viewedSet.has(`tour_${t.id}`) && !viewedSet.has(String(t.id))) {
                contact.hasNewTour = true;
            }
        });

        // 3. Process Applications
        applications.forEach(a => {
            const isMeTenant = (normalizeStr(a.tenant_id) === myEmail || a.tenant_id === myId || normalizeStr(a.applicant_email) === myEmail);
            const otherId = isMeTenant ? a.landlord_id : (a.tenant_id || a.applicant_email);
            const otherName = isMeTenant ? (a.landlord_name || 'Landlord') : (a.applicant_name || a.tenant_name || 'Applicant');

            const contact = getOrCreateContact(otherId, otherName, isMeTenant ? 'Landlord' : 'Tenant');
            contact.applications.push(a);
            if (a.id) contact.relatedConvIds.add(`app_${a.id}`);

            const time = a.updated_at || a.created_at || new Date().toISOString();
            if (new Date(time) > new Date(contact.latestTimestamp)) {
                contact.latestTimestamp = time;
                contact.lastMessageText = `📄 Application for "${a.property_title || 'Listing'}" (${String(a.status || 'pending').toUpperCase()})`;
            }
            if ((a.status === 'pending' || a.status === 'under_review') && !viewedSet.has(`app_${a.id}`) && !viewedSet.has(String(a.id))) {
                contact.hasNewApp = true;
            }
        });

        // 4. Process Leases
        leases.forEach(l => {
            const isMeTenant = (normalizeStr(l.tenant_id) === myEmail || l.tenant_id === myId);
            const otherId = isMeTenant ? l.landlord_id : l.tenant_id;
            const otherName = isMeTenant ? (l.landlord_name || 'Landlord') : (l.tenant_name || 'Tenant');

            const contact = getOrCreateContact(otherId, otherName, isMeTenant ? 'Landlord' : 'Tenant');
            contact.leases.push(l);
            if (l.id) contact.relatedConvIds.add(`lease_${l.id}`);

            const time = l.created_at || l.created_date || new Date().toISOString();
            if (new Date(time) > new Date(contact.latestTimestamp)) {
                contact.latestTimestamp = time;
                contact.lastMessageText = `🏢 Active Lease: ${l.property_title || 'Rental Unit'}`;
            }
        });

        // 5. Process Direct Messages
        const readSet = getReadMessageIds(myEmail || myId);

        allUserMessages.forEach(m => {
            const sId = normalizeStr(m.sender_id);
            const rId = normalizeStr(m.receiver_id);
            const isMeSender = sId === myEmail || sId === myId;
            const otherId = isMeSender ? (m.receiver_id || 'user') : (m.sender_id || 'user');
            const otherName = isMeSender ? (m.receiver_name || m.receiver_id) : (m.sender_name || m.sender_id);

            const contact = getOrCreateContact(otherId, otherName);
            if (m.id) contact.directMessageIds.add(m.id);
            if (m.conversation_id) contact.relatedConvIds.add(m.conversation_id);

            const time = m.created_date || m.created_at || new Date().toISOString();
            if (new Date(time) > new Date(contact.latestTimestamp)) {
                contact.latestTimestamp = time;
                contact.lastMessageText = m.content || 'Attachment';
            }

            const isToMe = (rId === myEmail || rId === myId) && !isMeSender;
            if (isToMe && !readSet.has(String(m.id))) {
                contact.unreadCount += 1;
            }
        });

        const resultList = Array.from(contactMap.values());
        // Sort contacts by latest interaction timestamp DESC
        return resultList.sort((a, b) => new Date(b.latestTimestamp) - new Date(a.latestTimestamp));
    }, [bids, tourSchedules, applications, leases, allUserMessages, user, myEmail, myId, viewedSet]);

    // Auto-select first contact if none is selected
    useEffect(() => {
        if (!selectedConversationKey && unifiedConversations.length > 0) {
            setSelectedConversationKey(unifiedConversations[0].id);
        }
    }, [unifiedConversations, selectedConversationKey]);

    const activeContact = useMemo(() => {
        return unifiedConversations.find(c => c.id === selectedConversationKey) || null;
    }, [unifiedConversations, selectedConversationKey]);

    // Filter contacts based on Category tabs & Search Query
    const filteredContacts = useMemo(() => {
        let list = unifiedConversations;

        if (activeTab === 'bids') {
            list = list.filter(c => c.bids.length > 0);
        } else if (activeTab === 'tours') {
            list = list.filter(c => c.tours.length > 0);
        } else if (activeTab === 'applications') {
            list = list.filter(c => c.applications.length > 0);
        } else if (activeTab === 'chats') {
            list = list.filter(c => c.directMessageIds.size > 0 || c.leases.length > 0);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(c =>
                c.contactName?.toLowerCase().includes(q) ||
                c.otherId?.toLowerCase().includes(q) ||
                c.lastMessageText?.toLowerCase().includes(q)
            );
        }

        return list;
    }, [unifiedConversations, activeTab, searchQuery]);

    // Counts for Category Pills
    const counts = useMemo(() => {
        return {
            all: unifiedConversations.length,
            bids: unifiedConversations.filter(c => c.hasNewBid || c.bids.length > 0).length,
            tours: unifiedConversations.filter(c => c.hasNewTour || c.tours.length > 0).length,
            applications: unifiedConversations.filter(c => c.hasNewApp || c.applications.length > 0).length,
            chats: unifiedConversations.filter(c => c.directMessageIds.size > 0 || c.leases.length > 0).length,
        };
    }, [unifiedConversations]);

    // 🟢 Query & Gather ALL Messages for Selected Contact into ONE Continuous WhatsApp Stream
    const { data: messages = [] } = useQuery({
        queryKey: ['messages-stream', activeContact?.id, activeContact?.otherId],
        queryFn: async () => {
            if (!activeContact) return [];

            const relatedIds = Array.from(activeContact.relatedConvIds || []);
            const fetchedMessagePromises = relatedIds.map(cid =>
                appClient.entities.Message.filter({ conversation_id: cid }).catch(() => [])
            );

            // Also fetch direct messages between my email/id & contact email/id
            const oId = activeContact.otherId;
            if (oId) {
                if (myEmail) {
                    fetchedMessagePromises.push(appClient.entities.Message.filter({ sender_id: myEmail, receiver_id: oId }).catch(() => []));
                    fetchedMessagePromises.push(appClient.entities.Message.filter({ sender_id: oId, receiver_id: myEmail }).catch(() => []));
                }
                if (myId && myId !== myEmail) {
                    fetchedMessagePromises.push(appClient.entities.Message.filter({ sender_id: myId, receiver_id: oId }).catch(() => []));
                    fetchedMessagePromises.push(appClient.entities.Message.filter({ sender_id: oId, receiver_id: myId }).catch(() => []));
                }
            }

            const results = await Promise.all(fetchedMessagePromises);
            const flat = results.flat();

            // Deduplicate by message ID
            const msgMap = new Map();
            flat.forEach(m => {
                if (m && m.id) {
                    msgMap.set(String(m.id), m);
                }
            });

            return Array.from(msgMap.values());
        },
        enabled: !!activeContact,
        refetchInterval: 3000,
        staleTime: 0,
    });

    // 🟢 SORT MESSAGES CHRONOLOGICALLY (WhatsApp style: Oldest at TOP, Newest at BOTTOM)
    const sortedMessages = useMemo(() => {
        return [...messages].sort((a, b) => {
            const timeA = new Date(a.created_date || a.created_at || 0).getTime();
            const timeB = new Date(b.created_date || b.created_at || 0).getTime();
            return timeA - timeB;
        });
    }, [messages]);

    // Internal Chat Scroll ONLY (Prevents scrolling the main window/page down on load)
    const scrollToBottom = (instant = false) => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTo({
                top: chatContainerRef.current.scrollHeight,
                behavior: instant ? 'auto' : 'smooth'
            });
        }
    };

    useEffect(() => {
        if (activeContact) {
            // Scroll ONLY the chat container element, keep window scrollTop intact!
            setTimeout(() => scrollToBottom(true), 60);
        }
    }, [activeContact?.id, sortedMessages.length]);

    // Mark unread messages as read when viewing conversation
    useEffect(() => {
        if (!user || !activeContact || sortedMessages.length === 0) return;

        const unreadIds = sortedMessages
            .filter(m => {
                const rId = normalizeStr(m.receiver_id);
                const sId = normalizeStr(m.sender_id);
                return (rId === myEmail || rId === myId) && sId !== myEmail && sId !== myId;
            })
            .map(m => m.id);

        if (unreadIds.length > 0) {
            markMessagesAsRead(myEmail || myId, unreadIds);
        }

        // Also mark related bid/tour/app IDs as viewed
        const itemsToMark = Array.from(activeContact.relatedConvIds || []);
        markItemsAsViewed(myEmail || myId, itemsToMark);
    }, [user, activeContact, sortedMessages, myEmail, myId]);

    // Handle Sending Message
    const sendMessageMutation = useMutation({
        mutationFn: (data) => appClient.entities.Message.create(data),
        onMutate: async (newMsg) => {
            await queryClient.cancelQueries({ queryKey: ['messages-stream', activeContact?.id] });
            const previous = queryClient.getQueryData(['messages-stream', activeContact?.id]) || [];
            const tempMsg = {
                id: `temp_${Date.now()}`,
                conversation_id: newMsg.conversation_id,
                sender_id: String(newMsg.sender_id),
                receiver_id: String(newMsg.receiver_id),
                content: newMsg.content,
                file_url: newMsg.file_url || null,
                created_date: new Date().toISOString()
            };
            queryClient.setQueryData(['messages-stream', activeContact?.id], (old = []) => [...old, tempMsg]);
            return { previous };
        },
        onError: (err, newMsg, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['messages-stream', activeContact?.id], context.previous);
            }
            toast.error('Failed to send message');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['messages-stream', activeContact?.id] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
        },
    });

    const handleSendMessage = () => {
        if (!messageInput.trim() || !activeContact) return;

        const textToSend = messageInput.trim();
        setMessageInput('');

        sendMessageMutation.mutate({
            conversation_id: activeContact.id,
            sender_id: String(user?.email || user?.id || 'user'),
            receiver_id: String(activeContact.otherId || 'user'),
            content: textToSend,
        });
    };

    const handleUploadAttachment = async (type) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '*';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file || !activeContact) return;

            setUploading(true);
            try {
                const { file_url } = await appClient.integrations.Core.UploadFile({ file });

                await sendMessageMutation.mutateAsync({
                    conversation_id: activeContact.id,
                    sender_id: String(user?.email || user?.id || 'user'),
                    receiver_id: String(activeContact.otherId || 'user'),
                    content: `Shared a ${type}`,
                    file_url: file_url,
                });

                toast.success(`${type} uploaded successfully!`);
            } catch (error) {
                toast.error('Failed to upload attachment');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    return (
        <div className="max-w-7xl mx-auto space-y-4 w-full min-w-0 overflow-x-hidden">
            {/* Main WhatsApp Layout Container */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm grid lg:grid-cols-12 h-[calc(100dvh-175px)] min-h-[500px] sm:h-[650px] lg:h-[720px] max-h-[850px] overflow-hidden">
                
                {/* 🟢 LEFT SIDEBAR: WhatsApp Contacts List */}
                <div className={`lg:col-span-4 border-r border-zinc-200 flex flex-col h-full min-h-0 overflow-hidden bg-zinc-50/50 ${
                    selectedConversationKey ? 'hidden lg:flex' : 'flex'
                }`}>
                    
                    {/* Sidebar Header */}
                    <div className="p-3.5 sm:p-4 border-b border-zinc-200/90 bg-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Avatar className="w-10 h-10 border border-zinc-200 shadow-xs">
                                    <AvatarFallback className="bg-zinc-950 text-white font-bold text-sm">
                                        {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" title="Online" />
                            </div>
                            <div>
                                <h2 className="font-bold text-base text-zinc-900 leading-tight">Messages</h2>
                                <p className="text-[11px] text-zinc-500 capitalize">{user?.user_type || 'User'} Account</p>
                            </div>
                        </div>
                    </div>

                    {/* WhatsApp Search Bar */}
                    <div className="p-2.5 bg-white border-b border-zinc-200 shrink-0">
                        <div className="relative">
                            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
                            <Input
                                placeholder="Search contacts or chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-[16px] sm:text-xs bg-zinc-100/80 border-transparent focus-visible:bg-white focus-visible:ring-zinc-950 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="p-2 border-b border-zinc-200 bg-zinc-50 flex items-center gap-1 overflow-x-auto custom-scrollbar shrink-0">
                        <button
                            onClick={() => setActiveTab('all')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors shrink-0 ${
                                activeTab === 'all' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            All ({counts.all})
                        </button>
                        <button
                            onClick={() => setActiveTab('bids')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'bids' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Bids
                            {counts.bids > 0 && (
                                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                    {counts.bids}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('tours')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'tours' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Tours
                            {counts.tours > 0 && (
                                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                    {counts.tours}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 shrink-0 ${
                                activeTab === 'applications' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Apps
                            {counts.applications > 0 && (
                                <span className="px-1.5 py-0.2 bg-rose-600 text-white text-[10px] font-bold rounded-full min-w-[18px] text-center">
                                    {counts.applications}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Contacts List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar overscroll-contain min-h-0 divide-y divide-zinc-100">
                        {filteredContacts.map(contact => {
                            const isSelected = selectedConversationKey === contact.id;
                            const unread = contact.unreadCount;
                            const hasNotice = contact.hasNewBid || contact.hasNewTour || contact.hasNewApp;

                            return (
                                <button
                                    key={contact.id}
                                    onClick={() => setSelectedConversationKey(contact.id)}
                                    className={`w-full text-left p-3 sm:p-3.5 transition-all flex items-start gap-3 relative ${
                                        isSelected
                                            ? 'bg-zinc-200/80 border-l-4 border-zinc-900'
                                            : 'bg-white hover:bg-zinc-100/70'
                                    }`}
                                >
                                    {/* Contact Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="w-11 h-11 border border-zinc-200 overflow-hidden">
                                            <AvatarFallback className="bg-zinc-900 text-white font-bold text-xs">
                                                {contact.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                                    </div>

                                    {/* Contact & Thread Subtitle */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <h4 className="font-bold text-xs sm:text-sm text-zinc-900 truncate">
                                                {contact.contactName}
                                            </h4>
                                            <span className="text-[10px] text-zinc-400 shrink-0">
                                                {formatDate(contact.latestTimestamp, 'h:mm a')}
                                            </span>
                                        </div>

                                        <div className="flex items-center justify-between gap-2">
                                            <p className={`text-xs truncate ${unread > 0 || hasNotice ? 'text-zinc-900 font-bold' : 'text-zinc-500'}`}>
                                                {contact.lastMessageText || 'No recent messages'}
                                            </p>
                                            {unread > 0 ? (
                                                <span className="h-5 min-w-[20px] px-1.5 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shrink-0 shadow-xs">
                                                    {unread > 99 ? '99+' : unread}
                                                </span>
                                            ) : hasNotice ? (
                                                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0" title="New Activity" />
                                            ) : null}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {filteredContacts.length === 0 && (
                            <div className="text-center py-16 px-4 text-zinc-400">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-semibold text-zinc-600">No conversations found</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Filter criteria or search query returned no active contacts.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔵 RIGHT SIDEBAR: WhatsApp Chat Exchange Window */}
                <div className={`lg:col-span-8 flex flex-col h-full min-h-0 overflow-hidden bg-[#efeae2]/30 relative ${
                    !selectedConversationKey ? 'hidden lg:flex' : 'flex'
                }`}>
                    {activeContact ? (
                        <div className="flex flex-col h-full min-h-0 overflow-hidden flex-1 min-w-0">
                            
                            {/* WhatsApp Header Bar */}
                            <div className="p-3 sm:p-3.5 border-b border-zinc-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-xs z-10">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Mobile Back Arrow Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="lg:hidden p-1.5 h-8 w-8 text-zinc-700 hover:bg-zinc-100 rounded-full shrink-0"
                                        onClick={() => setSelectedConversationKey(null)}
                                        aria-label="Back to contacts list"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>

                                    <div className="relative shrink-0">
                                        <Avatar className="w-10 h-10 border border-zinc-200 overflow-hidden">
                                            <AvatarFallback className="bg-zinc-950 text-white font-bold text-xs">
                                                {activeContact.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm sm:text-base text-zinc-900 truncate">
                                            {activeContact.contactName}
                                        </h3>
                                        <p className="text-xs text-zinc-500 truncate">
                                            Direct Contact • {activeContact.otherId}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* WhatsApp Speech Bubbles Container (Internal Scroll Container) */}
                            <div 
                                ref={chatContainerRef}
                                className="flex-1 p-3 sm:p-5 overflow-y-auto custom-scrollbar overscroll-contain space-y-3.5 min-h-0 bg-[#f4f6f8] relative"
                            >
                                {/* Ambient Background Pattern */}
                                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

                                {/* Active Request Banners & Interactive Action Cards attached to this Contact */}

                                {/* 1. Active Bids Cards */}
                                {activeContact.bids.map(b => {
                                    const isTenantParty = (normalizeStr(b.tenant_id) === myEmail || b.tenant_id === myId || normalizeStr(b.bidder_id) === myEmail || b.bidder_id === myId);
                                    const isLandlordParty = !isTenantParty;

                                    return (
                                        <div key={`bid_card_${b.id}`} className={`flex ${isTenantParty ? 'justify-end' : 'justify-start'} relative z-10 my-2`}>
                                            <div className="w-[280px] sm:w-[370px] md:w-[420px] max-w-[88vw] shrink-0 min-w-0">
                                                <div className={`p-3.5 sm:p-4 text-xs sm:text-[13.5px] relative shadow-md rounded-2xl ${
                                                    isTenantParty
                                                        ? 'bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-tr-none border border-zinc-800/90'
                                                        : 'bg-white text-zinc-900 border border-zinc-200/90 rounded-tl-none'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                                            isTenantParty ? 'bg-emerald-900/60 text-emerald-200 border-emerald-800' : 'text-emerald-700 bg-emerald-50 border-emerald-100'
                                                        }`}>
                                                            PROPERTY RENT BID
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                                            b.status === 'accepted' ? 'bg-emerald-100 text-emerald-800' :
                                                            b.status === 'countered' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                                            b.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                                                            'bg-zinc-100 text-zinc-800'
                                                        }`}>
                                                            {b.status || 'pending'}
                                                        </span>
                                                    </div>

                                                    <p className={`text-xs sm:text-sm font-bold ${isTenantParty ? 'text-white' : 'text-zinc-900'}`}>
                                                        Proposed Rent: <span className="text-emerald-400 font-extrabold">R{Number(b.proposed_rent || b.bid_amount || 0).toLocaleString()}/month</span>
                                                    </p>
                                                    <p className={`text-xs mt-1 ${isTenantParty ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        Move-in Date: {b.move_in_date || 'Flexible'} • Duration: {b.lease_duration_months || 12} months
                                                    </p>
                                                    {b.message && (
                                                        <p className={`text-xs mt-1.5 italic ${isTenantParty ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                                            "{b.message}"
                                                        </p>
                                                    )}

                                                    {/* Landlord Action Controls */}
                                                    {isLandlordParty && (
                                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-200/40">
                                                            {b.status === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                                                                    onClick={() => updateBidMutation.mutate({ id: b.id, status: 'accepted' })}
                                                                    disabled={updateBidMutation.isPending}
                                                                >
                                                                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Accept & Initiate Lease
                                                                </Button>
                                                            )}
                                                            {(b.status === 'accepted' || b.status === 'pending') && (
                                                                <Button
                                                                    size="sm"
                                                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs flex items-center"
                                                                    onClick={() => createLeaseFromBidMutation.mutate(b)}
                                                                    disabled={createLeaseFromBidMutation.isPending}
                                                                >
                                                                    <FileText className="w-3.5 h-3.5 mr-1" /> Send Digital E-Lease
                                                                </Button>
                                                            )}
                                                            {b.status === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-zinc-300 text-zinc-800 hover:bg-zinc-100 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                                    onClick={() => {
                                                                        const counterVal = prompt('Enter counter proposed rent amount (R):', String(b.proposed_rent || 0));
                                                                        if (counterVal && !isNaN(parseFloat(counterVal))) {
                                                                            updateBidMutation.mutate({ id: b.id, status: 'countered', counterRent: parseFloat(counterVal) });
                                                                        }
                                                                    }}
                                                                    disabled={updateBidMutation.isPending}
                                                                >
                                                                    Counter Offer
                                                                </Button>
                                                            )}
                                                            {b.status === 'pending' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                                    onClick={() => updateBidMutation.mutate({ id: b.id, status: 'rejected' })}
                                                                    disabled={updateBidMutation.isPending}
                                                                >
                                                                    <X className="w-3.5 h-3.5 mr-1" /> Decline
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* Tenant Actions (when countered) */}
                                                    {isTenantParty && b.status === 'countered' && (
                                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-700">
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                                                                onClick={() => updateBidMutation.mutate({ id: b.id, status: 'accepted' })}
                                                                disabled={updateBidMutation.isPending}
                                                            >
                                                                <Check className="w-3.5 h-3.5 mr-1" /> Accept Counter Offer
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-rose-400 text-rose-200 hover:bg-rose-900/40 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                                onClick={() => updateBidMutation.mutate({ id: b.id, status: 'rejected' })}
                                                                disabled={updateBidMutation.isPending}
                                                            >
                                                                <X className="w-3.5 h-3.5 mr-1" /> Decline
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* 2. Active Tour Viewing Cards */}
                                {activeContact.tours.map(t => {
                                    const isTenantParty = (normalizeStr(t.tenant_id) === myEmail || t.tenant_id === myId || normalizeStr(t.tenant_email) === myEmail);
                                    const isLandlordParty = !isTenantParty;

                                    return (
                                        <div key={`tour_card_${t.id}`} className={`flex ${isTenantParty ? 'justify-end' : 'justify-start'} relative z-10 my-2`}>
                                            <div className="w-[280px] sm:w-[370px] md:w-[420px] max-w-[88vw] shrink-0 min-w-0">
                                                <div className={`p-3.5 sm:p-4 text-xs sm:text-[13.5px] relative shadow-md rounded-2xl ${
                                                    isTenantParty
                                                        ? 'bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-tr-none border border-zinc-800/90'
                                                        : 'bg-white text-zinc-900 border border-zinc-200/90 rounded-tl-none'
                                                }`}>
                                                    <div className="flex items-center justify-between gap-2 mb-2">
                                                        <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                                                            isTenantParty ? 'bg-blue-900/60 text-blue-200 border-blue-800' : 'text-blue-700 bg-blue-50 border-blue-100'
                                                        }`}>
                                                            PROPERTY VIEWING TOUR
                                                        </span>
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                                                            t.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                                            t.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                                                            t.status === 'reschedule_requested' ? 'bg-amber-100 text-amber-900 border border-amber-300' :
                                                            t.status === 'declined' ? 'bg-rose-100 text-rose-800' :
                                                            'bg-zinc-100 text-zinc-800'
                                                        }`}>
                                                            {t.status || 'pending'}
                                                        </span>
                                                    </div>

                                                    <p className={`text-xs sm:text-sm font-bold ${isTenantParty ? 'text-white' : 'text-zinc-900'}`}>
                                                        Viewing: <span className="text-blue-400 font-extrabold">{t.requested_date} @ {t.requested_time}</span>
                                                    </p>

                                                    {isLandlordParty && t.status === 'pending' && (
                                                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-zinc-200/40">
                                                            <Button
                                                                size="sm"
                                                                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                                                                onClick={() => updateTourMutation.mutate({ id: t.id, status: 'confirmed' })}
                                                                disabled={updateTourMutation.isPending}
                                                            >
                                                                <Check className="w-3.5 h-3.5 mr-1" /> Confirm Viewing
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                                onClick={() => updateTourMutation.mutate({ id: t.id, status: 'declined' })}
                                                                disabled={updateTourMutation.isPending}
                                                            >
                                                                <X className="w-3.5 h-3.5 mr-1" /> Decline
                                                            </Button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* 3. WhatsApp Messages Feed (Chronological Oldest at Top to Newest at Bottom) */}
                                {sortedMessages.length === 0 ? (
                                    <div className="text-center py-16 text-zinc-400 relative z-10">
                                        <div className="w-14 h-14 bg-white shadow-sm border border-zinc-200/80 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <MessageSquare className="w-7 h-7 text-zinc-700" />
                                        </div>
                                        <p className="text-sm font-bold text-zinc-800">Unified Conversation Thread</p>
                                        <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 leading-relaxed">
                                            Messages between you and {activeContact.contactName} will appear here in chronological order.
                                        </p>
                                    </div>
                                ) : (
                                    sortedMessages.map((msg) => {
                                        const sId = normalizeStr(msg.sender_id);
                                        const isOwn = sId === myEmail || sId === myId;

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 6, scale: 0.99 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.15 }}
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative z-10`}
                                            >
                                                {/* Chat Bubble Container */}
                                                <div className="w-[270px] sm:w-[350px] md:w-[400px] max-w-[88vw] shrink-0 min-w-0">
                                                    <div className={`p-3.5 sm:p-4 text-xs sm:text-[13.5px] break-words break-all [overflow-wrap:anywhere] whitespace-pre-wrap relative shadow-sm transition-shadow hover:shadow-md min-w-0 max-w-full overflow-hidden ${
                                                        isOwn
                                                            ? 'bg-emerald-950 text-white rounded-2xl rounded-tr-none border border-emerald-900/80'
                                                            : 'bg-white text-zinc-900 border border-zinc-200/90 rounded-2xl rounded-tl-none'
                                                    }`}>
                                                        {/* Speech Bubble Tail */}
                                                        {isOwn ? (
                                                            <svg className="absolute -right-2 top-0 w-2.5 h-3.5 text-emerald-950 fill-current pointer-events-none" viewBox="0 0 10 14">
                                                                <path d="M0,0 L10,0 L0,14 Z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="absolute -left-2 top-0 w-2.5 h-3.5 text-white fill-current pointer-events-none" viewBox="0 0 10 14">
                                                                <path d="M10,0 L0,0 L10,14 Z" />
                                                            </svg>
                                                        )}

                                                        {/* Sender Name for Received Message */}
                                                        {!isOwn && (
                                                            <p className="text-[11px] font-bold text-emerald-700 mb-1 tracking-tight">
                                                                {activeContact.contactName}
                                                            </p>
                                                        )}

                                                        <p className={`leading-relaxed font-normal ${isOwn ? 'text-emerald-50' : 'text-zinc-800'}`}>
                                                            {msg.content}
                                                        </p>

                                                        {/* Attached File Preview */}
                                                        {msg.file_url && (
                                                            <div className={`mt-2.5 rounded-xl overflow-hidden border ${isOwn ? 'border-emerald-800 bg-emerald-900/40' : 'border-zinc-200 bg-zinc-50'} p-1`}>
                                                                {msg.file_url.match(/\.(jpeg|jpg|gif|png|webp)/i) || msg.content?.toLowerCase().includes('image') ? (
                                                                    <img src={msg.file_url} alt="Attachment" className="max-h-60 w-full object-cover rounded-lg" />
                                                                ) : (
                                                                    <a href={msg.file_url} target="_blank" rel="noreferrer" className={`text-xs font-semibold underline p-2.5 flex items-center gap-2 ${isOwn ? 'text-emerald-200 hover:text-white' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                                                        <Paperclip className="w-3.5 h-3.5" /> View Attached Document
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Timestamp & Read Status Bar */}
                                                        <div className={`flex items-center justify-end gap-1.5 text-[10.5px] mt-2 pt-1 border-t ${
                                                            isOwn ? 'border-emerald-800/60 text-emerald-200' : 'border-zinc-100 text-zinc-400'
                                                        }`}>
                                                            <span className="font-medium tracking-tight">
                                                                {formatDate(msg.created_date || msg.created_at, 'MMM d, h:mm a')}
                                                            </span>
                                                            {isOwn && (
                                                                msg.id && String(msg.id).startsWith('temp_') ? (
                                                                    <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" title="Sending..." />
                                                                ) : (
                                                                    <CheckCheck 
                                                                        className={`w-3.5 h-3.5 shrink-0 ${
                                                                            msg.read || msg.is_read || getReadMessageIds(msg.receiver_id).has(String(msg.id))
                                                                                ? 'text-sky-300 drop-shadow-[0_0_3px_rgba(56,189,248,0.6)]'
                                                                                : 'text-emerald-300'
                                                                        }`} 
                                                                        title={msg.read || msg.is_read || getReadMessageIds(msg.receiver_id).has(String(msg.id)) ? 'Read' : 'Delivered'} 
                                                                    />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                            </div>

                            {/* WhatsApp Sticky Bottom Input Bar */}
                            <div className="p-2.5 sm:p-3.5 bg-white/95 backdrop-blur-md border-t border-zinc-200/90 shrink-0 sticky bottom-0 z-10">
                                <div className="flex items-center gap-2 max-w-full">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUploadAttachment('image')}
                                        disabled={uploading}
                                        className="h-10 w-10 p-0 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 shrink-0"
                                        title="Attach Image"
                                    >
                                        <ImageIcon className="w-4.5 h-4.5" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUploadAttachment('video')}
                                        disabled={uploading}
                                        className="h-10 w-10 p-0 rounded-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 shrink-0"
                                        title="Attach Video"
                                    >
                                        <Video className="w-4.5 h-4.5" />
                                    </Button>

                                    <Input
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="flex-1 h-10 text-[16px] sm:text-sm bg-zinc-100/80 hover:bg-zinc-100 focus-visible:bg-white text-zinc-900 font-medium border border-zinc-200/80 focus-visible:border-zinc-900 rounded-full px-4 min-w-0 transition-colors"
                                    />

                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                                        className="bg-emerald-700 hover:bg-emerald-800 text-white h-10 w-10 p-0 rounded-full shrink-0 shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50">
                            <div className="w-16 h-16 bg-zinc-200/70 rounded-full flex items-center justify-center mb-3">
                                <MessageSquare className="w-8 h-8 text-zinc-500" />
                            </div>
                            <h3 className="font-bold text-zinc-900 text-base mb-1">WhatsApp Style Messaging</h3>
                            <p className="text-xs text-zinc-500 max-w-xs leading-relaxed">
                                Select a contact from the left sidebar to start communicating in real time.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
