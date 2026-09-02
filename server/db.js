import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Prevent pg from auto-shifting DATE and TIMESTAMP columns to UTC Date objects
pg.types.setTypeParser(1082, (val) => val); // DATE -> 'YYYY-MM-DD'
pg.types.setTypeParser(1114, (val) => val); // TIMESTAMP -> 'YYYY-MM-DD HH:mm:ss'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const pool = new Pool({
    host: process.env.PGHOST || 'localhost',
    port: parseInt(process.env.PGPORT || '5432', 10),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'rentflex_db',
});

export const initDb = async () => {
    try {
        console.log('🔄 Connecting to PostgreSQL and initializing schema...');
        
        // Read DDL file from supabase_schema.sql
        const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
        if (fs.existsSync(schemaPath)) {
            const sql = fs.readFileSync(schemaPath, 'utf8');
            // Execute schema DDL
            await pool.query(sql);
            console.log('✅ PostgreSQL Schema initialized successfully!');
        } else {
            console.warn('⚠️ supabase_schema.sql not found at project root.');
        }

        // Update check constraint on profiles to support sysAdmin and rentee
        await pool.query(`
            ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_type_check;
            ALTER TABLE public.profiles ADD CONSTRAINT profiles_user_type_check 
            CHECK (user_type IN ('tenant', 'rentee', 'landlord', 'contractor', 'admin', 'sysAdmin'));
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS salt TEXT;
            ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS session_token TEXT;

            -- Update leases table constraints & signature tracking columns
            ALTER TABLE public.leases DROP CONSTRAINT IF EXISTS leases_status_check;
            ALTER TABLE public.leases ADD CONSTRAINT leases_status_check 
            CHECK (status IN ('active', 'pending', 'pending_landlord_signature', 'pending_tenant_signature', 'ended', 'cancelled', 'terminated', 'lapsed'));
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS signed BOOLEAN DEFAULT FALSE;
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_signature TEXT;
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS tenant_signed_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS landlord_signature TEXT;
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS landlord_signed_at TIMESTAMP WITH TIME ZONE;
            ALTER TABLE public.leases ADD COLUMN IF NOT EXISTS terms TEXT;
        `);

        // Migration: Clean up legacy duplicate accounts and reassign existing records to canonical accounts
        await pool.query(`
            -- Normalize user_type 'rentee' to 'tenant' across all profiles
            UPDATE public.profiles SET user_type = 'tenant', full_name = 'Sarah Tenant' WHERE user_type = 'rentee' OR email = 'rentee@rentflex.co.za' OR email = 'tenant@rentflex.co.za';

            -- Reassign properties
            UPDATE public.properties SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            -- Reassign leases
            UPDATE public.leases SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            UPDATE public.leases SET tenant_id = 'tenant@rentflex.co.za' WHERE tenant_id IN ('rentee@rentflex.co.za', 'tenant@example.com');
            -- Reassign payments
            UPDATE public.payments SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            UPDATE public.payments SET tenant_id = 'tenant@rentflex.co.za' WHERE tenant_id IN ('rentee@rentflex.co.za', 'tenant@example.com');
            -- Reassign maintenance requests
            UPDATE public.maintenance_requests SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            UPDATE public.maintenance_requests SET tenant_id = 'tenant@rentflex.co.za' WHERE tenant_id IN ('rentee@rentflex.co.za', 'tenant@example.com');
            -- Reassign rent scores
            UPDATE public.rent_scores SET user_id = 'tenant@rentflex.co.za' WHERE user_id IN ('rentee@rentflex.co.za', 'tenant@example.com');
            -- Reassign deposit disputes
            UPDATE public.deposit_disputes SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            UPDATE public.deposit_disputes SET tenant_id = 'tenant@rentflex.co.za' WHERE tenant_id IN ('rentee@rentflex.co.za', 'tenant@example.com');
            -- Reassign applications
            UPDATE public.applications SET landlord_id = 'landlord@rentflex.co.za' WHERE landlord_id IN ('john@example.com', 'landlord@example.com');
            UPDATE public.applications SET tenant_id = 'tenant@rentflex.co.za' WHERE tenant_id IN ('rentee@rentflex.co.za', 'tenant@example.com');

            -- Remove duplicate legacy mock accounts & old rentee email
            DELETE FROM public.profiles WHERE email IN ('john@example.com', 'tenant@example.com', 'contractor@example.com', 'rentee@rentflex.co.za');
            DELETE FROM auth.users WHERE email IN ('john@example.com', 'tenant@example.com', 'contractor@example.com', 'rentee@rentflex.co.za');
        `);

        // Always ensure canonical core account profiles exist in PostgreSQL
        await pool.query(`
            INSERT INTO auth.users (id, email) VALUES
            ('a0000000-0000-0000-0000-000000000001', 'admin@rentflex.co.za'),
            ('b0000000-0000-0000-0000-000000000001', 'landlord@rentflex.co.za'),
            ('c0000000-0000-0000-0000-000000000001', 'tenant@rentflex.co.za'),
            ('d0000000-0000-0000-0000-000000000001', 'contractor@rentflex.co.za')
            ON CONFLICT (email) DO NOTHING;

            INSERT INTO public.profiles (id, email, full_name, user_type, phone) VALUES
            ('a0000000-0000-0000-0000-000000000001', 'admin@rentflex.co.za', 'Doc SysAdmin', 'sysAdmin', '+27 11 000 0001'),
            ('b0000000-0000-0000-0000-000000000001', 'landlord@rentflex.co.za', 'John Landlord', 'landlord', '+27 82 555 1234'),
            ('c0000000-0000-0000-0000-000000000001', 'tenant@rentflex.co.za', 'Sarah Tenant', 'tenant', '+27 83 777 9876'),
            ('d0000000-0000-0000-0000-000000000001', 'contractor@rentflex.co.za', 'Pro Repairs Co.', 'contractor', '+27 84 999 0000')
            ON CONFLICT (email) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                user_type = EXCLUDED.user_type,
                phone = EXCLUDED.phone;
        `);

        // Seed initial data if properties table is empty
        const propCheck = await pool.query("SELECT COUNT(*) FROM properties;");
        if (parseInt(propCheck.rows[0].count, 10) === 0) {
            console.log('🌱 Seeding initial database records into PostgreSQL...');

            // Seed properties
            await pool.query(`
                INSERT INTO public.properties (
                    id, landlord_id, title, description, address, city, state, zip_code,
                    property_type, bedrooms, bathrooms, sqft, monthly_rent, deposit_amount,
                    min_rentscore, amenities, images, status, accepts_bidding, flexible_payments
                ) VALUES (
                    '10000000-0000-0000-0000-000000000001',
                    'landlord@rentflex.co.za',
                    'Luxury 2BR Sea-View Apartment',
                    'Stunning 2-bedroom apartment with ocean views and modern finishes.',
                    '12 Beach Road, Sea Point',
                    'Cape Town',
                    'Western Cape',
                    '8005',
                    'apartment',
                    2, 2, 95, 18500.00, 37000.00, 650,
                    '["Parking", "WiFi", "Security", "Balcony"]'::jsonb,
                    '["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80"]'::jsonb,
                    'available', true, true
                ) ON CONFLICT (id) DO NOTHING;
            `);

            // Seed leases
            await pool.query(`
                INSERT INTO public.leases (
                    id, property_id, property_title, landlord_id, tenant_id,
                    monthly_rent, deposit_amount, start_date, end_date, status, signed
                ) VALUES (
                    '20000000-0000-0000-0000-000000000001',
                    '10000000-0000-0000-0000-000000000001',
                    'Luxury 2BR Sea-View Apartment',
                    'landlord@rentflex.co.za',
                    'tenant@rentflex.co.za',
                    18500.00, 37000.00, '2026-01-01', '2026-12-31', 'active', true
                ) ON CONFLICT (id) DO NOTHING;
            `);

            // Seed payments
            await pool.query(`
                INSERT INTO public.payments (
                    id, lease_id, tenant_id, landlord_id, amount, due_date, status, type
                ) VALUES (
                    '30000000-0000-0000-0000-000000000001',
                    '20000000-0000-0000-0000-000000000001',
                    'tenant@rentflex.co.za',
                    'landlord@rentflex.co.za',
                    18500.00, '2026-09-01', 'pending', 'rent'
                ) ON CONFLICT (id) DO NOTHING;
            `);

            // Seed rent scores
            await pool.query(`
                INSERT INTO public.rent_scores (
                    id, user_id, score, history
                ) VALUES (
                    '40000000-0000-0000-0000-000000000001',
                    'tenant@rentflex.co.za',
                    720,
                    '[{"date": "2026-08-01", "score": 720, "reason": "On-time rent payment"}]'::jsonb
                ) ON CONFLICT (id) DO NOTHING;
            `);

            console.log('✅ PostgreSQL initial data seeded successfully!');
        }
    } catch (err) {
        console.error('❌ Error initializing database:', err);
    }
};

export default {
    pool,
    initDb
};
