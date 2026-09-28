-- ====================================================================
-- RENTFLEX - SCHEMA SYNCHRONIZATION MIGRATION
-- Bids, Rescheduled Tours, Leases, Room Rentals, Applications, & Realtime
-- ====================================================================

-- 1. BIDS TABLE ENHANCEMENTS
-- Add columns required for full bidding lifecycle and landlord responses
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS landlord_id TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS property_title TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS property_image TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tenant_email TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS bid_amount NUMERIC(12, 2);
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS proposed_lease_months INTEGER DEFAULT 12;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS bidder_id TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS counter_rent NUMERIC(12, 2);
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS landlord_notes TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS response_notes TEXT;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS responded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.bids ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update bids status check constraint to support countered, rejected, accepted, cancelled
DO $$
BEGIN
    ALTER TABLE public.bids DROP CONSTRAINT IF EXISTS bids_status_check;
    ALTER TABLE public.bids ADD CONSTRAINT bids_status_check 
        CHECK (status IN ('pending', 'accepted', 'rejected', 'countered', 'cancelled', 'expired'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Bids indexes
CREATE INDEX IF NOT EXISTS idx_bids_landlord_id ON public.bids(landlord_id);
CREATE INDEX IF NOT EXISTS idx_bids_tenant_id ON public.bids(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_id ON public.bids(bidder_id);
CREATE INDEX IF NOT EXISTS idx_bids_property_id ON public.bids(property_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON public.bids(status);


-- 2. TOUR SCHEDULES TABLE ENHANCEMENTS
-- Add columns for tenant response, rescheduling flow, and completion
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS property_title TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS tenant_email TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS tenant_response TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS tenant_notes TEXT;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS tenant_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.tour_schedules ADD COLUMN IF NOT EXISTS declined_reason TEXT;

-- Update tour_schedules status check constraint to support rescheduled and completed
DO $$
BEGIN
    ALTER TABLE public.tour_schedules DROP CONSTRAINT IF EXISTS tour_schedules_status_check;
    ALTER TABLE public.tour_schedules ADD CONSTRAINT tour_schedules_status_check 
        CHECK (status IN ('pending', 'confirmed', 'reschedule_requested', 'rescheduled', 'declined', 'cancelled', 'completed'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Tour schedules indexes
CREATE INDEX IF NOT EXISTS idx_tour_schedules_status ON public.tour_schedules(status);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_rescheduled_by ON public.tour_schedules(rescheduled_by);


-- 3. APPLICATIONS TABLE ENHANCEMENTS
-- Add columns for detailed application screening & status updates
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS property_title TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS property_address TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tenant_email TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tenant_name TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS tenant_phone TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS move_in_date DATE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS monthly_income NUMERIC(12, 2);
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employment_status TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS employer TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS credit_score INTEGER;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Update applications status check constraint to support 'under_review' and 'withdrawn'
DO $$
BEGIN
    ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
    ALTER TABLE public.applications ADD CONSTRAINT applications_status_check 
        CHECK (status IN ('pending', 'under_review', 'approved', 'rejected', 'withdrawn'));
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Applications indexes
CREATE INDEX IF NOT EXISTS idx_applications_tenant_id ON public.applications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_applications_landlord_id ON public.applications(landlord_id);
CREATE INDEX IF NOT EXISTS idx_applications_property_id ON public.applications(property_id);
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);


-- 4. LEASES TABLE ENHANCEMENTS
-- Support room rentals, bid references, and occupancy duration monitoring
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS created_from_bid_id UUID;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS is_room_rental BOOLEAN DEFAULT FALSE;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS occupancy_status TEXT DEFAULT 'active';
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS active_months_monitored INTEGER DEFAULT 0;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS last_rentscore_reward_date DATE;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS termination_date DATE;
ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS terminated_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_leases_status ON public.leases(status);
CREATE INDEX IF NOT EXISTS idx_leases_occupancy ON public.leases(occupancy_status);


-- 5. PROPERTIES TABLE ENHANCEMENTS
-- Room capacity and competitive bidding support
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 1;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS is_room_rental BOOLEAN DEFAULT FALSE;
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS min_bid_amount NUMERIC(12, 2);

CREATE INDEX IF NOT EXISTS idx_properties_available_rooms ON public.properties(available_rooms);


-- 6. CONTRACTORS TABLE ENHANCEMENTS
-- JobScore and contractor company profiling
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS job_score INTEGER DEFAULT 500;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS completed_tasks_count INTEGER DEFAULT 0;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS average_completion_time_days NUMERIC(5, 1) DEFAULT 1.0;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS company_profile TEXT;
ALTER TABLE public.contractors ADD COLUMN IF NOT EXISTS reviews_count INTEGER DEFAULT 0;


-- 7. MESSAGES TABLE ENHANCEMENTS
-- Status tracking (sent, delivered, read)
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);


-- 8. REALTIME REPLICATION PUBLICATION
-- Enable Supabase Realtime for instant messaging and state synchronizations
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tour_schedules;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.applications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.leases;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.properties;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
END $$;


-- 9. PERMISSIONS & RLS GRANTS
-- Ensure anon, authenticated, and service_role have full operational access
GRANT ALL ON public.bids TO anon, authenticated, service_role;
GRANT ALL ON public.tour_schedules TO anon, authenticated, service_role;
GRANT ALL ON public.applications TO anon, authenticated, service_role;
GRANT ALL ON public.leases TO anon, authenticated, service_role;
GRANT ALL ON public.properties TO anon, authenticated, service_role;
GRANT ALL ON public.messages TO anon, authenticated, service_role;
GRANT ALL ON public.contractors TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public full access bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated full access bids" ON public.bids;
CREATE POLICY "Public full access bids" ON public.bids FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access tour_schedules" ON public.tour_schedules;
DROP POLICY IF EXISTS "Authenticated full access tour_schedules" ON public.tour_schedules;
CREATE POLICY "Public full access tour_schedules" ON public.tour_schedules FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access applications" ON public.applications;
DROP POLICY IF EXISTS "Authenticated full access applications" ON public.applications;
CREATE POLICY "Public full access applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public full access messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated full access messages" ON public.messages;
CREATE POLICY "Public full access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
