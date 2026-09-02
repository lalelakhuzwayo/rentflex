import { pool, initDb } from './db.js';

const seed = async () => {
    try {
        console.log('🌱 Seeding RentFlex PostgreSQL Database...');

        // 0. Ensure schema DDL tables exist
        await initDb();

        // 1. Clear existing records
        await pool.query('TRUNCATE public.properties, public.leases, public.payments, public.rent_scores, public.profiles CASCADE;');

        // 2. Seed Auth Users
        await pool.query(`
            INSERT INTO auth.users (id, email) VALUES
            ('00000000-0000-0000-0000-000000000001', 'john@example.com'),
            ('00000000-0000-0000-0000-000000000002', 'tenant@example.com'),
            ('00000000-0000-0000-0000-000000000003', 'contractor@example.com')
            ON CONFLICT (id) DO NOTHING;
        `);

        // 3. Seed Profiles
        await pool.query(`
            INSERT INTO public.profiles (id, email, full_name, user_type) VALUES
            ('00000000-0000-0000-0000-000000000001', 'john@example.com', 'John Landlord', 'landlord'),
            ('00000000-0000-0000-0000-000000000002', 'tenant@example.com', 'Sarah Tenant', 'tenant'),
            ('00000000-0000-0000-0000-000000000003', 'contractor@example.com', 'Pro Repairs Co.', 'contractor')
            ON CONFLICT (id) DO NOTHING;
        `);

        // 4. Seed Properties
        await pool.query(`
            INSERT INTO public.properties (
                id, landlord_id, title, description, address, city, state, zip_code,
                property_type, bedrooms, bathrooms, sqft, monthly_rent, deposit_amount,
                min_rentscore, amenities, images, status, accepts_bidding, flexible_payments
            ) VALUES 
            (
                '10000000-0000-0000-0000-000000000001',
                'john@example.com',
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
            ),
            (
                '10000000-0000-0000-0000-000000000002',
                'john@example.com',
                'Modern Minimalist Studio Loft',
                'Sleek industrial loft apartment in the heart of the city center.',
                '88 Long Street',
                'Cape Town',
                'Western Cape',
                '8001',
                'studio',
                1, 1, 55, 12000.00, 24000.00, 600,
                '["WiFi", "Air Conditioning", "Security"]'::jsonb,
                '["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"]'::jsonb,
                'available', true, true
            ) ON CONFLICT (id) DO NOTHING;
        `);

        // 5. Seed Leases
        await pool.query(`
            INSERT INTO public.leases (
                id, property_id, property_title, landlord_id, tenant_id,
                monthly_rent, deposit_amount, start_date, end_date, status
            ) VALUES (
                '20000000-0000-0000-0000-000000000001',
                '10000000-0000-0000-0000-000000000001',
                'Luxury 2BR Sea-View Apartment',
                'john@example.com',
                'tenant@example.com',
                18500.00, 37000.00, '2026-01-01', '2026-12-31', 'active'
            ) ON CONFLICT (id) DO NOTHING;
        `);

        // 6. Seed Payments
        await pool.query(`
            INSERT INTO public.payments (
                id, lease_id, tenant_id, landlord_id, amount, due_date, status, type
            ) VALUES 
            (
                '30000000-0000-0000-0000-000000000001',
                '20000000-0000-0000-0000-000000000001',
                'tenant@example.com',
                'john@example.com',
                18500.00, '2026-09-01', 'pending', 'rent'
            ),
            (
                '30000000-0000-0000-0000-000000000002',
                '20000000-0000-0000-0000-000000000001',
                'tenant@example.com',
                'john@example.com',
                18500.00, '2026-08-01', 'paid', 'rent'
            ) ON CONFLICT (id) DO NOTHING;
        `);

        // 7. Seed Rent Scores
        await pool.query(`
            INSERT INTO public.rent_scores (
                id, user_id, score, history
            ) VALUES (
                '40000000-0000-0000-0000-000000000001',
                'tenant@example.com',
                720,
                '[{"date": "2026-08-01", "score": 720, "reason": "On-time rent payment"}]'::jsonb
            ) ON CONFLICT (id) DO NOTHING;
        `);

        console.log('✅ RentFlex PostgreSQL Database seeded successfully with actual records!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    }
};

seed();
