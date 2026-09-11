-- ====================================================================
-- RENTFLEX - REMOVE DEPOSIT DISPUTES & CLEAN UP NOTIFICATION PREFERENCES
-- ====================================================================

-- 1. Drop the deposit disputes table and related objects
DROP TABLE IF EXISTS public.deposit_disputes CASCADE;

-- 2. Update default notification preferences on profiles to remove dispute_alerts
ALTER TABLE public.profiles 
ALTER COLUMN notification_preferences SET DEFAULT '{
    "push_enabled": false,
    "payment_reminders": true,
    "lease_updates": true,
    "maintenance_updates": true,
    "marketing": false,
    "sound_enabled": true
}'::jsonb;

-- 3. Clean up existing profiles by stripping dispute_alerts key if present
UPDATE public.profiles
SET notification_preferences = notification_preferences - 'dispute_alerts'
WHERE notification_preferences ? 'dispute_alerts';
