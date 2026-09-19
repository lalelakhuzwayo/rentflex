import React, { useState, useEffect } from 'react';
import { appClient } from '@/api/appClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { formatDate } from '@/utils';
import {
    Send,
    Image as ImageIcon,
    Video,
    Home,
    AlertTriangle,
    ChevronLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Messages() {
    const queryClient = useQueryClient();
    const [user, setUser] = useState(null);
    const [selectedConversation, setSelectedConversation] = useState(null);
    const [messageInput, setMessageInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [noticeDialogOpen, setNoticeDialogOpen] = useState(false);
    const [vacateDate, setVacateDate] = useState('');

    useEffect(() => {
        appClient.auth.me().then(setUser).catch(() => { });
    }, []);

    const isLandlord = user?.user_type === 'landlord';
    const isSysAdmin = user?.user_type === 'sysAdmin';

    const { data: leases = [] } = useQuery({
        queryKey: ['conversations-leases', user?.email, user?.id, user?.user_type],
        queryFn: async () => {
            if (!user) return [];
            if (isSysAdmin) {
                return await appClient.entities.Lease.list();
            }
            if (isLandlord) {
                const byEmail = await appClient.entities.Lease.filter({ landlord_id: user.email });
                const byId = user.id ? await appClient.entities.Lease.filter({ landlord_id: user.id }) : [];
                const merged = [...byEmail, ...byId];
                return Array.from(new Map(merged.map(item => [item.id, item])).values());
            }
            // Tenant or Contractor
            const byEmail = await appClient.entities.Lease.filter({ tenant_id: user.email });
            const byId = user.id ? await appClient.entities.Lease.filter({ tenant_id: user.id }) : [];
            const merged = [...byEmail, ...byId];
            if (merged.length > 0) return Array.from(new Map(merged.map(item => [item.id, item])).values());
            // Fallback: list all leases if user participates in any
            return await appClient.entities.Lease.list();
        },
        enabled: !!user?.email || !!user?.id,
    });

    const { data: allUserMessages = [] } = useQuery({
        queryKey: ['user-all-messages', user?.email, user?.id],
        queryFn: async () => {
            if (!user) return [];
            try {
                const userEmail = user.email;
                const userId = user.id;
                const list1 = userEmail ? await appClient.entities.Message.filter({ receiver_id: userEmail }) : [];
                const list2 = userEmail ? await appClient.entities.Message.filter({ sender_id: userEmail }) : [];
                const list3 = userId && userId !== userEmail ? await appClient.entities.Message.filter({ receiver_id: userId }) : [];
                const list4 = userId && userId !== userEmail ? await appClient.entities.Message.filter({ sender_id: userId }) : [];
                const combined = [...list1, ...list2, ...list3, ...list4];
                return Array.from(new Map(combined.map(item => [item.id, item])).values());
            } catch (err) {
                return [];
            }
        },
        enabled: !!user?.email || !!user?.id,
    });

    const conversations = React.useMemo(() => {
        const map = new Map();

        // 1. Add conversations from leases
        leases.forEach(l => {
            map.set(l.id, {
                id: l.id,
                title: l.property_title || 'Rental Unit',
                subtitle: l.property_address || 'Lease Agreement',
                lease: l,
            });
        });

        // 2. Add conversations from direct messages (bids, schedules, inquiries)
        allUserMessages.forEach(m => {
            const cid = m.conversation_id || m.lease_id || m.id;
            if (!map.has(cid)) {
                map.set(cid, {
                    id: cid,
                    title: m.property_title || m.sender_name || 'Property Inquiry',
                    subtitle: m.content || 'Message history',
                    lastMessage: m,
                });
            }
        });

        return Array.from(map.values());
    }, [leases, allUserMessages]);

    // Auto select first conversation if none selected
    useEffect(() => {
        if (!selectedConversation && conversations.length > 0) {
            setSelectedConversation(conversations[0].id);
        }
    }, [conversations, selectedConversation]);

    const { data: messages = [] } = useQuery({
        queryKey: ['messages', selectedConversation],
        queryFn: () => appClient.entities.Message.filter({ conversation_id: selectedConversation }),
        enabled: !!selectedConversation,
        initialData: [],
    });

    const sendMessageMutation = useMutation({
        mutationFn: (data) => appClient.entities.Message.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['messages']);
            queryClient.invalidateQueries(['user-all-messages']);
            setMessageInput('');
        },
    });

    const handleSendMessage = () => {
        if (!messageInput.trim() || !selectedConversation) return;

        const activeConv = conversations.find(c => c.id === selectedConversation);
        const lease = activeConv?.lease;
        const lastMsg = activeConv?.lastMessage;
        
        let receiverId = isLandlord ? lease?.tenant_id : lease?.landlord_id;
        if (!receiverId && lastMsg) {
            const myId = user?.email || user?.id;
            receiverId = lastMsg.sender_id === myId ? lastMsg.receiver_id : lastMsg.sender_id;
        }

        sendMessageMutation.mutate({
            conversation_id: selectedConversation,
            property_id: lease?.property_id || lastMsg?.property_id,
            property_title: lease?.property_title || lastMsg?.property_title || 'Property',
            lease_id: lease?.id,
            sender_id: user?.email || user?.id,
            sender_name: user?.full_name || user?.email,
            sender_type: user?.user_type || (isLandlord ? 'landlord' : 'tenant'),
            receiver_id: receiverId || 'landlord',
            message_type: 'text',
            content: messageInput,
            attachments: [],
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
                const lease = leases.find(l => l.id === selectedConversation);
                const receiverId = isLandlord ? lease?.tenant_id : lease?.landlord_id;

                await sendMessageMutation.mutateAsync({
                    conversation_id: selectedConversation,
                    property_id: lease?.property_id,
                    property_title: lease?.property_title,
                    lease_id: lease?.id,
                    sender_id: user?.email || user?.id,
                    sender_name: user?.full_name || user?.email,
                    sender_type: user?.user_type || 'tenant',
                    receiver_id: receiverId,
                    message_type: 'text',
                    content: `Shared a ${type}`,
                    attachments: [{
                        type,
                        url: file_url,
                        filename: file.name
                    }],
                });

                toast.success(`${type} uploaded`);
            } catch (error) {
                toast.error('Failed to upload');
            } finally {
                setUploading(false);
            }
        };
        input.click();
    };

    const handleSubmitNotice = () => {
        if (!vacateDate || !selectedConversation) return;

        const lease = leases.find(l => l.id === selectedConversation);

        sendMessageMutation.mutate({
            conversation_id: selectedConversation,
            property_id: lease?.property_id,
            property_title: lease?.property_title,
            lease_id: lease?.id,
            sender_id: user?.email || user?.id,
            sender_name: user?.full_name || user?.email,
            sender_type: user?.user_type || 'tenant',
            receiver_id: lease?.landlord_id,
            message_type: 'notice_to_vacate',
            content: `Notice to Vacate - Moving out on ${formatDate(vacateDate)}`,
            notice_vacate_date: vacateDate,
        });

        setNoticeDialogOpen(false);
        setVacateDate('');
        toast.success('Notice to vacate submitted');
    };

    const sortedMessages = [...messages].sort((a, b) =>
        new Date(a.created_date) - new Date(b.created_date)
    );

    return (
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">Messages</h1>

            <div className="grid lg:grid-cols-3 gap-6">
                {/* Conversations List (hidden on mobile if conversation is selected) */}
                <div className={`lg:col-span-1 ${selectedConversation ? 'hidden lg:block' : 'block'}`}>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-200">
                            <h2 className="font-semibold text-slate-900">Conversations</h2>
                        </div>
                        <ScrollArea className="h-[calc(100vh-280px)] sm:h-[600px]">
                            <div className="p-2">
                                {conversations.map(conv => (
                                    <button
                                        key={conv.id}
                                        onClick={() => setSelectedConversation(conv.id)}
                                        className={`w-full text-left p-3.5 mb-2 transition-colors border ${selectedConversation === conv.id
                                                ? 'bg-zinc-100 border-zinc-900'
                                                : 'hover:bg-zinc-50 border-transparent'
                                            }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="w-9 h-9 bg-zinc-100 flex items-center justify-center shrink-0 rounded-lg">
                                                <Home className="w-5 h-5 text-slate-600" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-slate-900 truncate">{conv.title}</p>
                                                <p className="text-xs text-slate-500 truncate">{conv.subtitle}</p>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                {/* Chat Area (hidden on mobile if no conversation is selected) */}
                <div className={`lg:col-span-2 ${!selectedConversation ? 'hidden lg:block' : 'block'}`}>
                    {selectedConversation ? (
                        <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[calc(100vh-280px)] sm:h-[600px]">
                            {/* Header */}
                            <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="lg:hidden p-1.5 h-8 w-8 text-zinc-700 hover:bg-zinc-100 shrink-0"
                                        onClick={() => setSelectedConversation(null)}
                                        aria-label="Back to conversations"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </Button>
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-sm sm:text-base text-slate-900 truncate">
                                            {conversations.find(c => c.id === selectedConversation)?.title || 'Property Conversation'}
                                        </h3>
                                        <p className="text-xs text-slate-500 truncate">Chat with landlord</p>
                                    </div>
                                </div>
                                <Dialog open={noticeDialogOpen} onOpenChange={setNoticeDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" size="sm">
                                            <AlertTriangle className="w-4 h-4 mr-2" />
                                            Submit Notice to Vacate
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Notice to Vacate</DialogTitle>
                                            <DialogDescription>
                                                Submit your intent to move out. Check your lease for notice period requirements.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="space-y-4 pt-4">
                                            <div>
                                                <Label htmlFor="vacate-date">Move-Out Date</Label>
                                                <Input
                                                    id="vacate-date"
                                                    type="date"
                                                    value={vacateDate}
                                                    onChange={(e) => setVacateDate(e.target.value)}
                                                    min={new Date().toISOString().split('T')[0]}
                                                />
                                            </div>
                                            <Button
                                                onClick={handleSubmitNotice}
                                                className="w-full bg-red-600 hover:bg-red-700"
                                                disabled={!vacateDate}
                                            >
                                                Submit Notice
                                            </Button>
                                        </div>
                                    </DialogContent>
                                </Dialog>
                            </div>

                            {/* Messages */}
                            <ScrollArea className="flex-1 p-4">
                                <div className="space-y-4">
                                    {sortedMessages.map((msg) => {
                                        const isOwn = msg.sender_id === user?.email;
                                        const isNotice = msg.message_type === 'notice_to_vacate';

                                        return (
                                            <motion.div
                                                key={msg.id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                            >
                                                <div className={`max-w-[70%] ${isNotice ? 'w-full max-w-none' : ''}`}>
                                                    <div className={`p-3.5 ${isNotice
                                                            ? 'bg-amber-50 border border-amber-200'
                                                            : isOwn
                                                                ? 'bg-zinc-900 text-white'
                                                                : 'bg-zinc-100 text-zinc-900'
                                                        }`}>
                                                        {isNotice && (
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <AlertTriangle className="w-4 h-4 text-amber-600" />
                                                                <span className="font-bold text-xs text-amber-900">Notice to Vacate</span>
                                                            </div>
                                                        )}
                                                        <p className={`text-xs ${isNotice ? 'text-amber-900' : ''}`}>
                                                            {msg.content}
                                                        </p>

                                                        {msg.attachments?.length > 0 && (
                                                            <div className="mt-3 space-y-2">
                                                                {msg.attachments.map((att, idx) => (
                                                                    <div key={idx}>
                                                                        {att.type === 'image' && (
                                                                            <img
                                                                                src={att.url}
                                                                                alt={att.filename}
                                                                                className="rounded-lg max-w-full"
                                                                            />
                                                                        )}
                                                                        {att.type === 'video' && (
                                                                            <video
                                                                                src={att.url}
                                                                                controls
                                                                                className="rounded-lg max-w-full"
                                                                            />
                                                                        )}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        <p className={`text-[10px] mt-1.5 ${isOwn ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                                            {formatDate(msg.created_date, 'h:mm a')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>

                            {/* Input */}
                            <div className="p-4 border-t border-slate-200">
                                <div className="flex gap-2 mb-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUploadAttachment('image')}
                                        disabled={uploading}
                                    >
                                        <ImageIcon className="w-4 h-4 mr-2" />
                                        Image
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleUploadAttachment('video')}
                                        disabled={uploading}
                                    >
                                        <Video className="w-4 h-4 mr-2" />
                                        Video
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder="Type a message..."
                                        value={messageInput}
                                        onChange={(e) => setMessageInput(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                                    />
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={!messageInput.trim() || sendMessageMutation.isPending}
                                        className="bg-zinc-900 hover:bg-zinc-800 text-white"
                                    >
                                        <Send className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl border border-slate-200 h-[600px] flex items-center justify-center">
                            <div className="text-center text-slate-500">
                                <Home className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p>Select a conversation to start messaging</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
