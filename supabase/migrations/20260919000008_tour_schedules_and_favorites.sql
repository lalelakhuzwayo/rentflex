-- ====================================================================
-- RENTFLEX - TOUR SCHEDULES & FAVORITES MIGRATION
-- ====================================================================

-- 1. TOUR SCHEDULES TABLE (Viewing requests between tenant & landlord)
CREATE TABLE IF NOT EXISTS public.tour_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    tenant_name TEXT,
    landlord_id TEXT NOT NULL,
    requested_date DATE NOT NULL,
    requested_time TEXT NOT NULL,
    status TEXT CHECK (status IN ('pending', 'confirmed', 'reschedule_requested', 'declined', 'cancelled')) DEFAULT 'pending',
    reschedule_date DATE,
    reschedule_time TEXT,
    rescheduled_by TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. FAVORITES TABLE (Saved properties per user)
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, property_id)
);

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tour_schedules_tenant ON public.tour_schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_landlord ON public.tour_schedules(landlord_id);
CREATE INDEX IF NOT EXISTS idx_tour_schedules_property ON public.tour_schedules(property_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.tour_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

-- POLICIES
DROP POLICY IF EXISTS "Authenticated full access tour_schedules" ON public.tour_schedules;
DROP POLICY IF EXISTS "Authenticated full access favorites" ON public.favorites;

CREATE POLICY "Authenticated full access tour_schedules" ON public.tour_schedules FOR ALL USING (true);
CREATE POLICY "Authenticated full access favorites" ON public.favorites FOR ALL USING (true);

-- GRANTS
GRANT ALL ON public.tour_schedules TO anon, authenticated, service_role;
GRANT ALL ON public.favorites TO anon, authenticated, service_role;
