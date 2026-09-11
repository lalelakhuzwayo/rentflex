-- ====================================================================
-- RENTFLEX - USER NOTIFICATION PREFERENCES & PWA PUSH SUBSCRIPTIONS
-- ====================================================================

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
    "push_enabled": false,
    "payment_reminders": true,
    "lease_updates": true,
    "maintenance_updates": true,
    "marketing": false,
    "sound_enabled": true
}'::jsonb;

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT '{}'::jsonb;
