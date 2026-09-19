import React, { useState, useEffect, useRef } from 'react';
import { appClient } from '@/api/appClient';
import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Send,
    Image as ImageIcon,
    Video,
    ChevronLeft,
    Gavel,
    Calendar,
    FileText,
    Users,
    MessageSquare,
    Check,
    CheckCheck,
    X,
    Building2,
    Search,
    Paperclip,
    User,
    ShieldCheck,
    Sparkles,
    Circle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

export default function Messages() {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [activeTab, setActiveTab] = useState('all'); // 'all', 'bids', 'tours', 'applications', 'chats'
    const [searchQuery, setSearchQuery] = useState('');
    const [messageInput, setMessageInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    // ⚡ Supabase Realtime WebSocket Listener for Instant Zero-Reload Updates
    useEffect(() => {
        if (!isSupabaseConfigured) return;

        const channel = supabase
            .channel('whatsapp_realtime_messages_channel')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages'] });
                    queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
                    queryClient.invalidateQueries({ queryKey: ['layout-notifications'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'bids' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages-bids'] });
                    queryClient.invalidateQueries({ queryKey: ['layout-notifications'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'tour_schedules' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages-tours'] });
                    queryClient.invalidateQueries({ queryKey: ['layout-notifications'] });
                }
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'applications' },
                () => {
                    queryClient.invalidateQueries({ queryKey: ['messages-applications'] });
                    queryClient.invalidateQueries({ queryKey: ['layout-notifications'] });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [queryClient]);

    const isLandlord = user?.user_type === 'landlord';
    const isSysAdmin = user?.user_type === 'sysAdmin';
    const isTenant = !isLandlord && !isSysAdmin;

    // 1. Leases Query
    const { data: leases = [] } = useQuery({
        queryKey: ['conversations-leases', user?.email, user?.id, user?.user_type],
        queryFn: async () => {
            if (!user) return [];
            try {
                if (isSysAdmin) return await appClient.entities.Lease.list();
                if (isLandlord) {
                    const list1 = await appClient.entities.Lease.filter({ landlord_id: user.email });
                    const list2 = user.id ? await appClient.entities.Lease.filter({ landlord_id: user.id }) : [];
                    const merged = [...list1, ...list2];
                    return Array.from(new Map(merged.map(item => [item.id, item])).values());
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

    // 2. Property Bids Query
    const { data: bids = [] } = useQuery({
        queryKey: ['messages-bids', user?.email, user?.id, isLandlord],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.Bid.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;
                if (isTenant) {
                    return list.filter(b => b.tenant_id === user.email || b.tenant_id === user.id || b.bidder_id === user.email);
                }
                return list.filter(b => b.landlord_id === user.email || b.landlord_id === user.id || true);
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 3. Tour Schedules Query
    const { data: tourSchedules = [] } = useQuery({
        queryKey: ['messages-tours', user?.email, user?.id, isLandlord],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.TourSchedule.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;
                if (isTenant) {
                    return list.filter(t => t.tenant_id === user.email || t.tenant_id === user.id);
                }
                return list.filter(t => t.landlord_id === user.email || t.landlord_id === user.id || true);
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 4. Applications Query
    const { data: applications = [] } = useQuery({
        queryKey: ['messages-applications', user?.email, user?.id, isLandlord],
        queryFn: async () => {
            if (!user) return [];
            try {
                const list = await appClient.entities.Application.list();
                if (!Array.isArray(list)) return [];
                if (isSysAdmin) return list;
                if (isTenant) {
                    return list.filter(a => a.tenant_id === user.email || a.tenant_id === user.id || a.applicant_email === user.email);
                }
                return list.filter(a => a.landlord_id === user.email || a.landlord_id === user.id || true);
            } catch (e) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    // 5. Direct Messages Query
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
    });

    // Bid Actions Mutation
    const updateBidMutation = useMutation({
        mutationFn: async ({ id, status, counterRent }) => {
            const payload = { status };
            if (counterRent) payload.proposed_rent = counterRent;
            const updated = await appClient.entities.Bid.update(id, payload);
            try {
                await appClient.entities.Message.create({
                    conversation_id: `bid_${id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: updated.tenant_id || updated.bidder_id,
                    content: status === 'accepted'
                        ? `🎉 Bid Accepted! Landlord approved your bid of R${(updated.proposed_rent || updated.bid_amount)?.toLocaleString()}/month.`
                        : status === 'countered'
                            ? `💬 Counter Offer: Landlord proposed R${counterRent?.toLocaleString()}/month.`
                            : `❌ Bid Declined.`
                });
            } catch (e) {}
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['messages-bids']);
            queryClient.invalidateQueries(['messages']);
            queryClient.invalidateQueries(['layout-notifications']);
            toast.success('Bid status updated!');
        },
    });

    // Tour Actions Mutation
    const updateTourMutation = useMutation({
        mutationFn: async ({ id, status, rescheduleDate, rescheduleTime }) => {
            const payload = { status };
            if (rescheduleDate) payload.requested_date = rescheduleDate;
            if (rescheduleTime) payload.requested_time = rescheduleTime;
            const updated = await appClient.entities.TourSchedule.update(id, payload);
            try {
                await appClient.entities.Message.create({
                    conversation_id: `tour_${id}`,
                    sender_id: user?.email || 'user',
                    receiver_id: updated.tenant_id,
                    content: status === 'confirmed'
                        ? `✅ Viewing Confirmed for ${updated.requested_date} at ${updated.requested_time}.`
                        : status === 'reschedule_requested'
                            ? `🔄 Reschedule Proposed for ${rescheduleDate} at ${rescheduleTime}.`
                            : `❌ Viewing Request Declined.`
                });
            } catch (e) {}
            return updated;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['messages-tours']);
            queryClient.invalidateQueries(['messages']);
            queryClient.invalidateQueries(['layout-notifications']);
            toast.success('Tour schedule updated!');
        },
    });

    // Structured Contact Conversations (WhatsApp Contact Cards Format)
    const conversations = React.useMemo(() => {
        const list = [];

        // Helper to extract initials
        const getInitials = (name) => {
            if (!name) return 'U';
            const parts = name.split(' ').filter(Boolean);
            if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
            return name.substring(0, 2).toUpperCase();
        };

        // 1. Add Bids
        bids.forEach(b => {
            const contactName = isLandlord ? (b.tenant_name || b.tenant_id || 'Tenant Bidder') : (b.landlord_name || 'Property Owner');
            list.push({
                id: `bid_${b.id}`,
                rawId: b.id,
                contactName,
                initials: getInitials(contactName),
                category: 'bids',
                type: 'bid',
                title: `Bid: R${(b.proposed_rent || b.bid_amount || 0).toLocaleString()}/mo`,
                subtitle: `Move-in: ${b.move_in_date || 'Flexible'} • Status: ${String(b.status || 'pending').toUpperCase()}`,
                isNew: b.status === 'pending',
                data: b,
                updatedAt: b.created_at || b.created_date || new Date().toISOString()
            });
        });

        // 2. Add Tour Schedules
        tourSchedules.forEach(t => {
            const contactName = isLandlord ? (t.tenant_name || t.tenant_id || 'Viewing Visitor') : (t.landlord_name || 'Property Owner');
            list.push({
                id: `tour_${t.id}`,
                rawId: t.id,
                contactName,
                initials: getInitials(contactName),
                category: 'tours',
                type: 'tour',
                title: `Viewing: ${t.requested_date} @ ${t.requested_time}`,
                subtitle: `Visitor: ${t.tenant_name || t.tenant_id || 'Tenant'} • Status: ${String(t.status || 'pending').toUpperCase()}`,
                isNew: t.status === 'pending',
                data: t,
                updatedAt: t.created_at || t.created_date || new Date().toISOString()
            });
        });

        // 3. Add Applications
        applications.forEach(a => {
            const contactName = isLandlord ? (a.applicant_name || a.tenant_id || 'Applicant') : (a.landlord_name || 'Property Owner');
            list.push({
                id: `app_${a.id}`,
                rawId: a.id,
                contactName,
                initials: getInitials(contactName),
                category: 'applications',
                type: 'application',
                title: `Application: ${a.property_title || 'Listing'}`,
                subtitle: `By ${a.applicant_name || a.tenant_id || 'Tenant'} • ${String(a.status || 'pending').toUpperCase()}`,
                isNew: a.status === 'pending' || a.status === 'under_review',
                data: a,
                updatedAt: a.created_at || a.created_date || new Date().toISOString()
            });
        });

        // 4. Add Leases
        leases.forEach(l => {
            const contactName = isLandlord ? (l.tenant_name || l.tenant_id || 'Lease Tenant') : (l.landlord_name || 'Landlord');
            list.push({
                id: `lease_${l.id}`,
                rawId: l.id,
                contactName,
                initials: getInitials(contactName),
                category: 'chats',
                type: 'lease',
                title: `Lease: ${l.property_title || 'Rental Unit'}`,
                subtitle: l.property_address || 'Lease Agreement',
                isNew: false,
                data: l,
                updatedAt: l.created_date || new Date().toISOString()
            });
        });

        // 5. Add Direct Messages
        const msgMap = new Map();
        allUserMessages.forEach(m => {
            const cid = m.conversation_id || m.lease_id || m.id;
            if (!msgMap.has(cid) && !list.some(item => item.id === cid)) {
                const contactName = isLandlord ? (m.sender_name || m.sender_id || 'Tenant Contact') : (m.receiver_name || m.receiver_id || 'Landlord Contact');
                msgMap.set(cid, {
                    id: cid,
                    rawId: cid,
                    contactName,
                    initials: getInitials(contactName),
                    category: 'chats',
                    type: 'chat',
                    title: m.property_title || contactName || 'Direct Message',
                    subtitle: m.content || 'Chat history',
                    isNew: false,
                    lastMessage: m,
                    updatedAt: m.created_date || new Date().toISOString()
                });
            }
        });
        msgMap.forEach(v => list.push(v));

        // Sort latest first
        return list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }, [bids, tourSchedules, applications, leases, allUserMessages, isLandlord]);

    // Counts for WhatsApp Category Filters
    const counts = React.useMemo(() => {
        return {
            all: conversations.length,
            bids: conversations.filter(c => c.category === 'bids' && c.isNew).length,
            tours: conversations.filter(c => c.category === 'tours' && c.isNew).length,
            applications: conversations.filter(c => c.category === 'applications' && c.isNew).length,
            chats: conversations.filter(c => c.category === 'chats').length,
        };
    }, [conversations]);

    // Filter conversations by active tab and search query
    const filteredConversations = React.useMemo(() => {
        let result = conversations;
        if (activeTab !== 'all') {
            result = result.filter(c => c.category === activeTab);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => 
                c.contactName?.toLowerCase().includes(q) ||
                c.title?.toLowerCase().includes(q) ||
                c.subtitle?.toLowerCase().includes(q)
            );
        }
        return result;
    }, [conversations, activeTab, searchQuery]);

    // Auto select first contact if none is active on desktop
    useEffect(() => {
        if (!selectedConversation && filteredConversations.length > 0 && window.innerWidth >= 1024) {
            setSelectedConversation(filteredConversations[0].id);
        }
    }, [filteredConversations, selectedConversation]);

    const activeConv = conversations.find(c => c.id === selectedConversation);

    // Strictly isolated query for active conversation messages
    const { data: messages = [] } = useQuery({
        queryKey: ['messages', selectedConversation],
        queryFn: () => appClient.entities.Message.filter({ conversation_id: selectedConversation }),
        enabled: !!selectedConversation,
        initialData: [],
    });

    const sendMessageMutation = useMutation({
        mutationFn: (data) => appClient.entities.Message.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages', selectedConversation] });
            queryClient.invalidateQueries({ queryKey: ['user-all-messages'] });
            setMessageInput('');
        },
    });

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConversation) return;

        let receiverId = isLandlord 
            ? (activeConv?.data?.tenant_id || activeConv?.data?.bidder_id || activeConv?.data?.applicant_email || activeConv?.data?.created_by) 
            : (activeConv?.data?.landlord_id || activeConv?.data?.owner_id);

        if (!receiverId && activeConv?.lastMessage) {
            const myId = user?.email || user?.id;
            receiverId = activeConv.lastMessage.sender_id === myId ? activeConv.lastMessage.receiver_id : activeConv.lastMessage.sender_id;
        }

        if (!receiverId) {
            receiverId = isLandlord ? 'tenant' : 'landlord';
        }

        sendMessageMutation.mutate({
            conversation_id: String(selectedConversation),
            sender_id: String(user?.email || user?.id || 'user'),
            receiver_id: String(receiverId || 'user'),
            content: messageInput.trim(),
        });
    };

    const handleUploadAttachment = async (type) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = type === 'image' ? 'image/*' : type === 'video' ? 'video/*' : '*';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            setUploading(true);
            try {
                const { file_url } = await appClient.integrations.Core.UploadFile({ file });
                let receiverId = isLandlord 
                    ? (activeConv?.data?.tenant_id || activeConv?.data?.bidder_id || activeConv?.data?.applicant_email) 
                    : (activeConv?.data?.landlord_id || activeConv?.data?.owner_id);

                if (!receiverId && activeConv?.lastMessage) {
                    const myId = user?.email || user?.id;
                    receiverId = activeConv.lastMessage.sender_id === myId ? activeConv.lastMessage.receiver_id : activeConv.lastMessage.sender_id;
                }

                await sendMessageMutation.mutateAsync({
                    conversation_id: String(selectedConversation),
                    sender_id: String(user?.email || user?.id || 'user'),
                    receiver_id: String(receiverId || 'user'),
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

    const sortedMessages = [...messages].sort((a, b) =>
        new Date(a.created_date || a.created_at) - new Date(b.created_date || b.created_at)
    );

    // Auto-scroll to latest message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [sortedMessages.length, selectedConversation]);

    return (
        <div className="max-w-7xl mx-auto space-y-4 w-full min-w-0 overflow-x-hidden">
            {/* Main WhatsApp Grid Container */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm grid lg:grid-cols-12 h-[calc(100vh-170px)] sm:h-[650px] lg:h-[720px] overflow-hidden">
                
                {/* 🟢 LEFT SIDEBAR: WhatsApp Contacts & Threads List */}
                <div className={`lg:col-span-4 border-r border-zinc-200 flex flex-col h-full bg-zinc-50/50 ${
                    selectedConversation ? 'hidden lg:flex' : 'flex'
                }`}>
                    
                    {/* Sidebar Header with Profile Info */}
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
                                className="pl-9 h-9 text-xs bg-zinc-100/80 border-transparent focus-visible:bg-white focus-visible:ring-zinc-950 rounded-lg"
                            />
                        </div>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="p-2 border-b border-zinc-200 bg-zinc-50 flex items-center gap-1 overflow-x-auto scrollbar-none shrink-0">
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
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 shrink-0 ${
                                activeTab === 'bids' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Bids
                            {counts.bids > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('tours')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 shrink-0 ${
                                activeTab === 'tours' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Tours
                            {counts.tours > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
                        </button>
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1 shrink-0 ${
                                activeTab === 'applications' ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-200/70'
                            }`}
                        >
                            Apps
                            {counts.applications > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />}
                        </button>
                    </div>

                    {/* Contacts & Conversation Threads List */}
                    <div className="flex-1 overflow-y-auto min-h-0 divide-y divide-zinc-100">
                        {filteredConversations.map(conv => {
                            const isSelected = selectedConversation === conv.id;
                            return (
                                <button
                                    key={conv.id}
                                    onClick={() => setSelectedConversation(conv.id)}
                                    className={`w-full text-left p-3 sm:p-3.5 transition-all flex items-start gap-3 relative ${
                                        isSelected
                                            ? 'bg-zinc-200/80 border-l-4 border-zinc-900'
                                            : 'bg-white hover:bg-zinc-100/70'
                                    }`}
                                >
                                    {/* Contact Avatar */}
                                    <div className="relative shrink-0">
                                        <Avatar className="w-11 h-11 border border-zinc-200">
                                            <AvatarFallback className="bg-zinc-900 text-white font-bold text-xs">
                                                {conv.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-white ${
                                            conv.type === 'bid' ? 'bg-rose-500 text-white' :
                                            conv.type === 'tour' ? 'bg-blue-500 text-white' :
                                            conv.type === 'application' ? 'bg-purple-500 text-white' :
                                            'bg-zinc-700 text-white'
                                        }`}>
                                            {conv.type === 'bid' && <Gavel className="w-3 h-3" />}
                                            {conv.type === 'tour' && <Calendar className="w-3 h-3" />}
                                            {conv.type === 'application' && <FileText className="w-3 h-3" />}
                                            {conv.type === 'lease' && <Building2 className="w-3 h-3" />}
                                            {conv.type === 'chat' && <MessageSquare className="w-3 h-3" />}
                                        </div>
                                    </div>

                                    {/* Contact & Thread Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-1 mb-0.5">
                                            <h4 className="font-bold text-xs sm:text-sm text-zinc-900 truncate">
                                                {conv.contactName}
                                            </h4>
                                            <span className="text-[10px] text-zinc-400 shrink-0">
                                                {formatDate(conv.updatedAt, 'h:mm a')}
                                            </span>
                                        </div>

                                        <p className="text-xs font-semibold text-zinc-700 truncate mb-0.5">
                                            {conv.title}
                                        </p>

                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-xs text-zinc-500 truncate">
                                                {conv.subtitle}
                                            </p>
                                            {conv.isNew && (
                                                <span className="w-2.5 h-2.5 bg-rose-500 rounded-full shrink-0 animate-pulse" title="New notification" />
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}

                        {filteredConversations.length === 0 && (
                            <div className="text-center py-16 px-4 text-zinc-400">
                                <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-xs font-semibold text-zinc-600">No conversations found</p>
                                <p className="text-[11px] text-zinc-400 mt-0.5">Filter criteria or search query returned no active contacts.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 🔵 RIGHT SIDE: WhatsApp Chat Exchange Window */}
                <div className={`lg:col-span-8 flex flex-col h-full bg-[#efeae2]/30 relative ${
                    !selectedConversation ? 'hidden lg:flex' : 'flex'
                }`}>
                    {activeConv ? (
                        <div className="flex flex-col h-full min-w-0">
                            
                            {/* WhatsApp Header Bar */}
                            <div className="p-3 sm:p-3.5 border-b border-zinc-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-xs z-10">
                                <div className="flex items-center gap-3 min-w-0">
                                    {/* Mobile Back Arrow Button */}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="lg:hidden p-1.5 h-8 w-8 text-zinc-700 hover:bg-zinc-100 rounded-full shrink-0"
                                        onClick={() => setSelectedConversation(null)}
                                        aria-label="Back to contacts list"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>

                                    <div className="relative shrink-0">
                                        <Avatar className="w-10 h-10 border border-zinc-200">
                                            <AvatarFallback className="bg-zinc-950 text-white font-bold text-xs">
                                                {activeConv.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white" />
                                    </div>

                                    <div className="min-w-0">
                                        <h3 className="font-bold text-sm sm:text-base text-zinc-900 truncate">
                                            {activeConv.contactName}
                                        </h3>
                                        <p className="text-xs text-zinc-500 truncate">
                                            {activeConv.title}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Badge className="bg-zinc-100 text-zinc-800 border-zinc-200 capitalize text-[10px] px-2 py-0.5 font-semibold">
                                        {activeConv.category}
                                    </Badge>
                                </div>
                            </div>

                            {/* WhatsApp Speech Bubbles Container */}
                            <div className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3.5 min-h-0 bg-[#f4f6f8] relative">
                                {/* Ambient Background Pattern */}
                                <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-35 pointer-events-none" />

                                {/* Actionable Bid Offer Chat Bubble */}
                                {activeConv.type === 'bid' && activeConv.data && (
                                    <div className="flex justify-start relative z-10 my-1">
                                        <div className="w-[270px] sm:w-[350px] md:w-[400px] max-w-[88vw] shrink-0">
                                            <div className="p-3.5 sm:p-4 text-xs sm:text-[13.5px] relative shadow-md rounded-2xl rounded-tl-none bg-white border border-zinc-200/90 text-zinc-900">
                                                {/* Inverted Triangle Pointer Tail (Top-Left) */}
                                                <svg className="absolute -left-2 top-0 w-2.5 h-3.5 text-white fill-current pointer-events-none" viewBox="0 0 10 14">
                                                    <path d="M10,0 L0,0 L10,14 Z" />
                                                </svg>
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">
                                                        PROPERTY BID OFFER
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm font-bold text-zinc-900">
                                                    Proposed Rent: <span className="text-rose-600 font-extrabold">R{(activeConv.data.proposed_rent || activeConv.data.bid_amount || 0).toLocaleString()}</span>
                                                </p>
                                                {isLandlord && activeConv.data.status === 'pending' && (
                                                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-100">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                                                            onClick={() => updateBidMutation.mutate({ id: activeConv.rawId, status: 'accepted' })}
                                                            disabled={updateBidMutation.isPending}
                                                        >
                                                            <Check className="w-3.5 h-3.5 mr-1" /> Accept Bid
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                            onClick={() => updateBidMutation.mutate({ id: activeConv.rawId, status: 'rejected' })}
                                                            disabled={updateBidMutation.isPending}
                                                        >
                                                            <X className="w-3.5 h-3.5 mr-1" /> Decline
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Actionable Viewing Request Chat Bubble */}
                                {activeConv.type === 'tour' && activeConv.data && (
                                    <div className="flex justify-start relative z-10 my-1">
                                        <div className="w-[270px] sm:w-[350px] md:w-[400px] max-w-[88vw] shrink-0">
                                            <div className="p-3.5 sm:p-4 text-xs sm:text-[13.5px] relative shadow-md rounded-2xl rounded-tl-none bg-white border border-zinc-200/90 text-zinc-900">
                                                {/* Inverted Triangle Pointer Tail (Top-Left) */}
                                                <svg className="absolute -left-2 top-0 w-2.5 h-3.5 text-white fill-current pointer-events-none" viewBox="0 0 10 14">
                                                    <path d="M10,0 L0,0 L10,14 Z" />
                                                </svg>
                                                <div className="flex items-center justify-between gap-2 mb-2">
                                                    <span className="text-[10px] uppercase font-bold tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                                        VIEWING REQUEST
                                                    </span>
                                                </div>
                                                <p className="text-xs sm:text-sm font-bold text-zinc-900">
                                                    Viewing: <span className="text-blue-600 font-extrabold">{activeConv.data.requested_date} @ {activeConv.data.requested_time}</span>
                                                </p>
                                                {isLandlord && activeConv.data.status === 'pending' && (
                                                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-zinc-100">
                                                        <Button
                                                            size="sm"
                                                            className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs h-7.5 px-3 rounded-lg shadow-xs"
                                                            onClick={() => updateTourMutation.mutate({ id: activeConv.rawId, status: 'confirmed' })}
                                                            disabled={updateTourMutation.isPending}
                                                        >
                                                            <Check className="w-3.5 h-3.5 mr-1" /> Confirm
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs h-7.5 px-3 rounded-lg"
                                                            onClick={() => updateTourMutation.mutate({ id: activeConv.rawId, status: 'declined' })}
                                                            disabled={updateTourMutation.isPending}
                                                        >
                                                            <X className="w-3.5 h-3.5 mr-1" /> Decline
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {sortedMessages.length === 0 ? (
                                    <div className="text-center py-16 text-zinc-400 relative z-10">
                                        <div className="w-14 h-14 bg-white shadow-sm border border-zinc-200/80 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                            <MessageSquare className="w-7 h-7 text-zinc-700" />
                                        </div>
                                        <p className="text-sm font-bold text-zinc-800">Isolated Conversation Thread</p>
                                        <p className="text-xs text-zinc-500 max-w-xs mx-auto mt-1 leading-relaxed">
                                            All messages sent here are strictly isolated to this contact and thread.
                                        </p>
                                    </div>
                                ) : (
                                    sortedMessages.map((msg) => {
                                        const isOwn = msg.sender_id === user?.email || msg.sender_id === user?.id;
                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                                transition={{ duration: 0.2 }}
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative z-10`}
                                            >
                                                {/* Fixed Width Chat Bubble Container per Device Breakpoint */}
                                                <div className="w-[270px] sm:w-[350px] md:w-[400px] max-w-[88vw] shrink-0">
                                                    <div className={`p-3.5 sm:p-4 text-xs sm:text-[13.5px] break-words whitespace-pre-wrap relative shadow-sm transition-shadow hover:shadow-md ${
                                                        isOwn
                                                            ? 'bg-gradient-to-br from-slate-900 via-zinc-900 to-slate-950 text-white rounded-2xl rounded-tr-none border border-zinc-800/90'
                                                            : 'bg-white text-zinc-900 border border-zinc-200/90 rounded-2xl rounded-tl-none'
                                                    }`}>
                                                        {/* Speech Bubble Triangle Tail */}
                                                        {isOwn ? (
                                                            <svg className="absolute -right-2 top-0 w-2.5 h-3.5 text-slate-950 fill-current pointer-events-none" viewBox="0 0 10 14">
                                                                <path d="M0,0 L10,0 L0,14 Z" />
                                                            </svg>
                                                        ) : (
                                                            <svg className="absolute -left-2 top-0 w-2.5 h-3.5 text-white fill-current pointer-events-none" viewBox="0 0 10 14">
                                                                <path d="M10,0 L0,0 L10,14 Z" />
                                                            </svg>
                                                        )}

                                                        {/* Incoming Sender Name */}
                                                        {!isOwn && (
                                                            <p className="text-[11px] font-bold text-emerald-600 mb-1 tracking-tight">
                                                                {activeConv?.contactName}
                                                            </p>
                                                        )}

                                                        <p className={`leading-relaxed font-normal ${isOwn ? 'text-slate-100' : 'text-zinc-800'}`}>
                                                            {msg.content}
                                                        </p>

                                                        {/* Attached File Preview */}
                                                        {msg.file_url && (
                                                            <div className={`mt-2.5 rounded-xl overflow-hidden border ${isOwn ? 'border-slate-800 bg-slate-950/60' : 'border-zinc-200 bg-zinc-50'} p-1`}>
                                                                {msg.file_url.match(/\.(jpeg|jpg|gif|png|webp)/i) || msg.content?.toLowerCase().includes('image') ? (
                                                                    <img src={msg.file_url} alt="Attachment" className="max-h-60 w-full object-cover rounded-lg" />
                                                                ) : (
                                                                    <a href={msg.file_url} target="_blank" rel="noreferrer" className={`text-xs font-semibold underline p-2.5 flex items-center gap-2 ${isOwn ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                                                        📁 View Attached Document
                                                                    </a>
                                                                )}
                                                            </div>
                                                        )}

                                                        {/* Legacy Attachments Array Support */}
                                                        {msg.attachments && msg.attachments.length > 0 && !msg.file_url && (
                                                            <div className="mt-2.5 space-y-1.5">
                                                                {msg.attachments.map((att, idx) => (
                                                                    <div key={idx} className={`rounded-xl overflow-hidden border ${isOwn ? 'border-slate-800 bg-slate-950/60' : 'border-zinc-200 bg-zinc-50'} p-1`}>
                                                                        {att.type === 'image' ? (
                                                                            <img src={att.url} alt="Attachment" className="max-h-52 w-full object-cover rounded-lg" />
                                                                        ) : (
                                                                            <a href={att.url} target="_blank" rel="noreferrer" className={`text-xs font-semibold underline p-2.5 flex items-center gap-2 ${isOwn ? 'text-indigo-300 hover:text-indigo-200' : 'text-indigo-600 hover:text-indigo-700'}`}>
                                                                                📁 View Attached Document
                                                                            </a>
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Timestamp & Read Status Bar */}
                                                        <div className={`flex items-center justify-end gap-1.5 text-[10.5px] mt-2 pt-1 border-t ${
                                                            isOwn ? 'border-white/10 text-slate-300' : 'border-zinc-100 text-zinc-400'
                                                        }`}>
                                                            <span className="font-medium tracking-tight">
                                                                {formatDate(msg.created_date || msg.created_at, 'h:mm a')}
                                                            </span>
                                                            {isOwn && (
                                                                <CheckCheck className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)] shrink-0" />
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* WhatsApp Style Sticky Bottom Input Bar */}
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
                                        placeholder="Type your message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                                        className="flex-1 h-10 text-xs sm:text-sm bg-zinc-100/80 hover:bg-zinc-100 focus-visible:bg-white text-zinc-900 font-medium border border-zinc-200/80 focus-visible:border-zinc-900 rounded-full px-4 min-w-0 transition-colors"
                                    />

                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                                        className="bg-gradient-to-r from-zinc-950 to-zinc-900 hover:from-zinc-900 hover:to-zinc-800 text-white h-10 w-10 p-0 rounded-full shrink-0 shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center"
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
                                Select a contact thread from the left list to view message exchanges and communicate in real time.
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
