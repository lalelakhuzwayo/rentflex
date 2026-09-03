const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
require('dotenv').config({ path: '.env.production' });
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_BASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLIC_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE missing in environment.');
    process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

const TARGET_EMAIL = 'ntsako.khoza@yahoo.com';
const TARGET_PASSWORD = 'Versa950401tile';
const TARGET_USERNAME = 'sysAdmin';
const TARGET_ROLE = 'sysAdmin';

async function setupSuperUser() {
    console.log(`Connecting to Supabase at ${SUPABASE_URL}...`);
    
    // 1. Check if user already exists
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
        console.error('Error listing users:', listError);
        process.exit(1);
    }

    let user = users.find(u => u.email.toLowerCase() === TARGET_EMAIL.toLowerCase());
    let userId;

    if (user) {
        console.log(`User ${TARGET_EMAIL} already exists (ID: ${user.id}). Updating password and superuser metadata...`);
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                password: TARGET_PASSWORD,
                email_confirm: true,
                user_metadata: {
                    full_name: TARGET_USERNAME,
                    user_type: TARGET_ROLE
                }
            }
        );

        if (updateError) {
            console.error('Error updating auth user:', updateError);
            process.exit(1);
        }
        userId = updatedUser.user.id;
        console.log('Auth user updated successfully.');
    } else {
        console.log(`Creating new superuser account for ${TARGET_EMAIL}...`);
        const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: TARGET_EMAIL,
            password: TARGET_PASSWORD,
            email_confirm: true,
            user_metadata: {
                full_name: TARGET_USERNAME,
                user_type: TARGET_ROLE
            }
        });

        if (createError) {
            console.error('Error creating auth user:', createError);
            process.exit(1);
        }
        userId = created.user.id;
        console.log(`Auth user created successfully (ID: ${userId}).`);
    }

    // 2. Ensure profile exists in public.profiles with sysAdmin role
    console.log('Upserting sysAdmin profile in public.profiles...');
    const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
            id: userId,
            email: TARGET_EMAIL,
            full_name: TARGET_USERNAME,
            user_type: TARGET_ROLE,
            onboarding_completed: true,
            updated_at: new Date().toISOString()
        })
        .select()
        .single();

    if (profileError) {
        console.error('Error upserting profile:', profileError);
        process.exit(1);
    }

    console.log('Profile successfully configured:', profile);

    // 3. Verify login using anon key (simulating real frontend login)
    console.log('\nVerifying login with Supabase client (frontend simulation)...');
    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { data: authData, error: authError } = await client.auth.signInWithPassword({
        email: TARGET_EMAIL,
        password: TARGET_PASSWORD
    });

    if (authError) {
        console.error('Frontend login verification failed:', authError.message);
        process.exit(1);
    }

    console.log('>>> LOGIN VERIFIED SUCCESSFULLY! <<<');
    console.log('User ID:', authData.user.id);
    console.log('Email:', authData.user.email);
    console.log('Role:', authData.user.user_metadata.user_type);
    console.log('Access Token granted: Yes');
}

setupSuperUser().catch(e => {
    console.error('Unexpected error:', e);
    process.exit(1);
});
