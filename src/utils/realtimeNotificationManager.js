import { supabase, isSupabaseConfigured } from '@/lib/supabaseClient';

/**
 * Web Audio API synthesizer that generates a WhatsApp-style incoming message chime.
 * Uses a crisp, two-stage resonant harmonic (830Hz & 1660Hz) with smooth decay.
 * Zero external audio files required, works across all modern browsers & mobile PWA.
 */
export function playWhatsAppChime() {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        const now = ctx.currentTime;

        // Fundamental tone: 830Hz
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(830, now);
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.16);

        // Harmonic overtone: 1660Hz (WhatsApp distinct high pop)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1660, now + 0.06);
        gain2.gain.setValueAtTime(0.22, now + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.32);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(now + 0.06);
        osc2.stop(now + 0.32);
    } catch (_) {
        // Silently catch audio policy blocks
    }
}

/**
 * Retrieves the set of message IDs marked as read by the user.
 */
export function getReadMessageIds(userId) {
    if (!userId) return new Set();
    try {
        const cleanId = String(userId).toLowerCase().trim();
        const key = `rentflex_read_msgs_${cleanId}`;
        const raw = localStorage.getItem(key);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch (_) {
        return new Set();
    }
}

/**
 * Marks a list of message IDs as read for the user, persists to localStorage,
 * and broadcasts an event to sync unread counts across all active components.
 */
export function markMessagesAsRead(userId, messageIds) {
    if (!userId || !Array.isArray(messageIds) || messageIds.length === 0) return;
    try {
        const cleanId = String(userId).toLowerCase().trim();
        const key = `rentflex_read_msgs_${cleanId}`;
        const current = getReadMessageIds(cleanId);
        let changed = false;

        messageIds.forEach(id => {
            if (id) {
                const strId = String(id);
                if (!current.has(strId)) {
                    current.add(strId);
                    changed = true;
                }
            }
        });

        if (changed) {
            localStorage.setItem(key, JSON.stringify(Array.from(current)));
            window.dispatchEvent(new CustomEvent('rentflex:messages-read', {
                detail: { userId: cleanId, count: current.size }
            }));
        }
    } catch (_) {}
}

/**
 * Checks whether a specific message has been marked as read by the recipient.
 */
export function isMessageRead(userId, message) {
    if (!message || !message.id) return false;
    const readSet = getReadMessageIds(userId);
    return readSet.has(String(message.id));
}

/**
 * Sets up a persistent Supabase Realtime channel subscription for instant messages
 * and notifications across the entire app.
 *
 * @param {object} user - The current authenticated user
 * @param {function} onNewMessage - Callback when an incoming message is received
 * @param {function} onUpdate - Callback when any relevant entity is changed
 * @returns {function} Cleanup function to unsubscribe from channel
 */
export function subscribeToRealtimeNotifications(user, onNewMessage, onUpdate) {
    if (!isSupabaseConfigured || !user) {
        return () => {};
    }

    const myEmail = user.email?.toLowerCase().trim();
    const myId = user.id ? String(user.id) : null;
    const channelName = `rentflex_instant_messaging_${myId || myEmail || 'anon'}_${Date.now()}`;

    const channel = supabase.channel(channelName);

    // 1. Instant Messages
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
            if (payload.eventType === 'INSERT') {
                const newMsg = payload.new;
                const recId = newMsg?.receiver_id?.toLowerCase()?.trim();
                const sndId = newMsg?.sender_id?.toLowerCase()?.trim();

                // Check if this message was sent to current user by someone else
                const isIncomingToMe = recId && (recId === myEmail || recId === myId) && sndId !== myEmail && sndId !== myId;

                if (isIncomingToMe) {
                    playWhatsAppChime();
                    if (typeof onNewMessage === 'function') {
                        onNewMessage(newMsg);
                    }
                }
            }

            if (typeof onUpdate === 'function') {
                onUpdate('messages', payload);
            }
        }
    );

    // 2. Instant Bids
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bids' },
        (payload) => {
            if (typeof onUpdate === 'function') {
                onUpdate('bids', payload);
            }
        }
    );

    // 3. Instant Tour Schedules
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tour_schedules' },
        (payload) => {
            if (typeof onUpdate === 'function') {
                onUpdate('tour_schedules', payload);
            }
        }
    );

    // 4. Instant Applications
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'applications' },
        (payload) => {
            if (typeof onUpdate === 'function') {
                onUpdate('applications', payload);
            }
        }
    );

    // 5. Instant Leases
    channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leases' },
        (payload) => {
            if (typeof onUpdate === 'function') {
                onUpdate('leases', payload);
            }
        }
    );

    channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
            // Connected to Supabase Realtime
        }
    });

    return () => {
        try {
            supabase.removeChannel(channel);
        } catch (_) {}
    };
}
