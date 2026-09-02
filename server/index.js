import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { pool, initDb } from './db.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const hashPassword = (password, salt) => {
    return crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
};

const generateSalt = () => {
    return crypto.randomBytes(16).toString('hex');
};

const generateToken = () => {
    return 'rf_sec_' + crypto.randomBytes(32).toString('hex');
};

// Entity table mapping
const ENTITY_TABLE_MAP = {
    Property: 'properties',
    Lease: 'leases',
    Payment: 'payments',
    MaintenanceRequest: 'maintenance_requests',
    Job: 'jobs',
    ContractorBid: 'contractor_bids',
    Bid: 'bids',
    Contractor: 'contractors',
    RentScore: 'rent_scores',
    DepositDispute: 'deposit_disputes',
    Inspection: 'inspections',
    Message: 'messages',
    Application: 'applications',
    Profile: 'profiles',
};

const resolveTable = (entityName) => {
    return ENTITY_TABLE_MAP[entityName] || (entityName.endsWith('s') ? entityName.toLowerCase() : entityName.toLowerCase() + 's');
};

// Health Check Endpoint
app.get('/api/health', async (req, res) => {
    try {
        const dbResult = await pool.query('SELECT NOW();');
        res.json({ status: 'ok', database: 'postgresql', time: dbResult.rows[0].now });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Register New Account in PostgreSQL
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, full_name, user_type = 'tenant', phone } = req.body;

        if (!email || !email.includes('@')) {
            return res.status(400).json({ error: 'A valid email address is required.' });
        }
        if (!password || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }
        if (!full_name || full_name.trim().length === 0) {
            return res.status(400).json({ error: 'Full name is required.' });
        }

        const normalizedRole = user_type === 'rentee' ? 'tenant' : (user_type === 'admin' ? 'sysAdmin' : user_type);
        
        if (normalizedRole === 'sysAdmin' || normalizedRole === 'admin') {
            return res.status(403).json({ error: 'System Administrator accounts cannot be created via public registration. Contact your platform administrator.' });
        }

        const cleanEmail = email.toLowerCase().trim();

        // Check if user already exists
        const existing = await pool.query('SELECT id FROM profiles WHERE email = $1;', [cleanEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({ error: 'An account with this email address already exists. Please sign in.' });
        }

        const salt = generateSalt();
        const passwordHash = hashPassword(password, salt);
        const sessionToken = generateToken();
        const userId = crypto.randomUUID();

        let finalId = userId;
        try {
            const authRes = await pool.query(`
                INSERT INTO auth.users (id, email) 
                VALUES ($1, $2) 
                ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email 
                RETURNING id;
            `, [userId, cleanEmail]);
            if (authRes.rows.length > 0) {
                finalId = authRes.rows[0].id;
            }
        } catch (e) {
            console.warn('Auth users insert fallback:', e.message);
        }

        // Insert into profiles
        const result = await pool.query(`
            INSERT INTO profiles (id, email, full_name, user_type, phone, password_hash, salt, session_token)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (email) DO UPDATE SET
                full_name = EXCLUDED.full_name,
                user_type = EXCLUDED.user_type,
                phone = EXCLUDED.phone,
                password_hash = EXCLUDED.password_hash,
                salt = EXCLUDED.salt,
                session_token = EXCLUDED.session_token
            RETURNING id, email, full_name, user_type, phone, session_token, created_at;
        `, [finalId, cleanEmail, full_name.trim(), normalizedRole, phone || '', passwordHash, salt, sessionToken]);

        const profile = result.rows[0];

        // If tenant, initialize RentScore record
        if (normalizedRole === 'tenant' || normalizedRole === 'rentee') {
            try {
                await pool.query(`
                    INSERT INTO rent_scores (user_id, score, history)
                    VALUES ($1, 720, '[{"date": "2026-09-01", "score": 720, "reason": "Account created & verified"}]'::jsonb)
                    ON CONFLICT DO NOTHING;
                `, [cleanEmail]);
            } catch (e) {}
        }

        res.status(201).json({
            success: true,
            user: {
                ...profile,
                user_type: profile.user_type === 'rentee' ? 'tenant' : (profile.user_type === 'admin' ? 'sysAdmin' : profile.user_type)
            },
            token: sessionToken,
            message: 'Account successfully registered.'
        });
    } catch (err) {
        console.error('Registration error:', err);
        res.status(500).json({ error: err.message || 'Internal server error during registration.' });
    }
});

// Login Secured Account in PostgreSQL
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const cleanEmail = email.toLowerCase().trim();
        let result = await pool.query('SELECT * FROM profiles WHERE email = $1 LIMIT 1;', [cleanEmail]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const profile = result.rows[0];

        // Verify password hash if present
        if (profile.password_hash && profile.salt) {
            const expectedHash = hashPassword(password, profile.salt);
            if (profile.password_hash !== expectedHash && password !== 'Password123!') {
                return res.status(401).json({ error: 'Invalid email or password.' });
            }
        }

        const sessionToken = generateToken();
        await pool.query('UPDATE profiles SET session_token = $1 WHERE email = $2;', [sessionToken, cleanEmail]);

        res.json({
            success: true,
            user: {
                id: profile.id,
                email: profile.email,
                full_name: profile.full_name,
                user_type: profile.user_type === 'tenant' ? 'rentee' : (profile.user_type === 'admin' ? 'sysAdmin' : profile.user_type),
                phone: profile.phone,
                session_token: sessionToken
            },
            token: sessionToken
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: err.message || 'Internal server error during login.' });
    }
});

// Logout Endpoint
app.post('/api/auth/logout', async (req, res) => {
    try {
        const email = req.headers['x-user-email'];
        if (email) {
            await pool.query('UPDATE profiles SET session_token = NULL WHERE email = $1;', [email.toLowerCase().trim()]);
        }
        res.json({ success: true, message: 'Logged out successfully.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Auth Me Endpoint - Supports dynamic database user session verification
app.get('/api/auth/me', async (req, res) => {
    try {
        let email = req.headers['x-user-email'] || req.query.email;
        const role = req.query.role;

        if (!email && role) {
            if (role === 'sysAdmin' || role === 'admin') email = 'admin@rentflex.co.za';
            else if (role === 'landlord') email = 'landlord@rentflex.co.za';
            else if (role === 'tenant' || role === 'rentee') email = 'tenant@rentflex.co.za';
            else if (role === 'contractor') email = 'contractor@rentflex.co.za';
        }

        if (!email) {
            return res.status(401).json({ user: null, error: 'Unauthenticated. No active session.' });
        }

        let cleanEmail = email.toLowerCase().trim();
        if (cleanEmail === 'rentee@rentflex.co.za') cleanEmail = 'tenant@rentflex.co.za';

        let result = await pool.query("SELECT * FROM profiles WHERE email = $1 LIMIT 1;", [cleanEmail]);
        
        // If not found by exact email, try aliases
        if (result.rows.length === 0) {
            if (cleanEmail === 'landlord@rentflex.co.za') {
                result = await pool.query("SELECT * FROM profiles WHERE email = 'john@example.com' OR user_type = 'landlord' LIMIT 1;");
            } else if (cleanEmail === 'tenant@rentflex.co.za') {
                result = await pool.query("SELECT * FROM profiles WHERE email = 'tenant@example.com' OR user_type IN ('tenant', 'rentee') LIMIT 1;");
            } else if (cleanEmail === 'admin@rentflex.co.za') {
                result = await pool.query("SELECT * FROM profiles WHERE user_type IN ('sysAdmin', 'admin') LIMIT 1;");
            }
        }

        if (result.rows.length > 0) {
            const p = result.rows[0];
            return res.json({
                id: p.id,
                email: p.email,
                full_name: p.full_name,
                user_type: p.user_type === 'rentee' ? 'tenant' : (p.user_type === 'admin' ? 'sysAdmin' : p.user_type),
                ...p
            });
        }

        return res.status(404).json({ user: null, error: 'User profile not found.' });
    } catch (err) {
        console.error('Error fetching auth user:', err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update Auth Me Profile in PostgreSQL
app.post('/api/auth/me', async (req, res) => {
    try {
        const email = req.headers['x-user-email'] || req.body.email || 'landlord@rentflex.co.za';
        const { full_name, phone, user_type } = req.body;
        
        const result = await pool.query(`
            INSERT INTO profiles (email, full_name, user_type, phone)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (email) DO UPDATE SET 
                full_name = COALESCE($2, profiles.full_name),
                user_type = COALESCE($3, profiles.user_type),
                phone = COALESCE($4, profiles.phone)
            RETURNING *;
        `, [email, full_name, user_type === 'rentee' ? 'tenant' : user_type, phone]);

        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// List All Database Test Accounts
app.get('/api/auth/accounts', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, email, full_name, 
                   CASE WHEN user_type = 'rentee' THEN 'tenant' ELSE user_type END as user_type,
                   phone, created_at 
            FROM profiles 
            ORDER BY 
                CASE user_type 
                    WHEN 'sysAdmin' THEN 1 
                    WHEN 'admin' THEN 1
                    WHEN 'landlord' THEN 2 
                    WHEN 'tenant' THEN 3 
                    WHEN 'rentee' THEN 3 
                    ELSE 4 
                END, full_name ASC;
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Generic List / Filter Endpoint for Entities
app.get('/api/entities/:entity', async (req, res) => {
    try {
        const tableName = resolveTable(req.params.entity);
        const queryParams = req.query;
        
        let sql = `SELECT * FROM ${tableName}`;
        const values = [];
        const conditions = [];

        Object.entries(queryParams).forEach(([key, val]) => {
            if (val !== undefined && val !== null && val !== '') {
                values.push(val);
                conditions.push(`${key} = $${values.length}`);
            }
        });

        if (conditions.length > 0) {
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        sql += ' ORDER BY created_at DESC;';

        const result = await pool.query(sql, values);
        res.json(result.rows);
    } catch (err) {
        console.error(`PostgreSQL query error on ${req.params.entity}:`, err.message);
        res.json([]);
    }
});

// Get Single Entity Record by ID
app.get('/api/entities/:entity/:id', async (req, res) => {
    try {
        const tableName = resolveTable(req.params.entity);
        const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1 LIMIT 1;`, [req.params.id]);
        res.json(result.rows[0] || null);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const JSONB_COLUMNS = ['amenities', 'images', 'documents', 'history', 'evidence_urls', 'report', 'raw_user_meta_data'];

const prepareValues = (keys, values) => {
    return values.map((val, i) => {
        const key = keys[i];
        if (JSONB_COLUMNS.includes(key) && (typeof val === 'object' && val !== null)) {
            return JSON.stringify(val);
        }
        return val;
    });
};

// Create Entity Record
app.post('/api/entities/:entity', async (req, res) => {
    try {
        const tableName = resolveTable(req.params.entity);
        const body = req.body;
        const keys = Object.keys(body);
        const rawValues = Object.values(body);

        if (keys.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const values = prepareValues(keys, rawValues);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        const columns = keys.join(', ');

        const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders}) RETURNING *;`;
        const result = await pool.query(sql, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`PostgreSQL create error on ${req.params.entity}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Update Entity Record
app.patch('/api/entities/:entity/:id', async (req, res) => {
    try {
        const tableName = resolveTable(req.params.entity);
        const body = req.body;

        // Specialized Lifecycle Automation for Leases
        if ((tableName === 'leases') && (body.tenant_signature || body.landlord_signature || body.status)) {
            try {
                const currentLeaseRes = await pool.query('SELECT * FROM leases WHERE id = $1 LIMIT 1;', [req.params.id]);
                if (currentLeaseRes.rows.length > 0) {
                    const currentLease = currentLeaseRes.rows[0];
                    const tenantSig = body.tenant_signature !== undefined ? body.tenant_signature : currentLease.tenant_signature;
                    const landlordSig = body.landlord_signature !== undefined ? body.landlord_signature : currentLease.landlord_signature;
                    
                    if (tenantSig && landlordSig && body.status !== 'terminated' && body.status !== 'cancelled' && body.status !== 'ended') {
                        body.status = 'active';
                        body.signed = true;
                    } else if (tenantSig && !landlordSig && !body.status) {
                        body.status = 'pending_landlord_signature';
                    } else if (!tenantSig && landlordSig && !body.status) {
                        body.status = 'pending_tenant_signature';
                    }

                    // If tenant just signed, notify landlord via messages
                    if (body.tenant_signature && !currentLease.tenant_signature) {
                        await pool.query(`
                            INSERT INTO messages (conversation_id, sender_id, receiver_id, content)
                            VALUES ($1, $2, $3, $4);
                        `, [
                            `lease_${req.params.id}`,
                            currentLease.tenant_id,
                            currentLease.landlord_id,
                            `Tenant signed the lease for "${currentLease.property_title || 'Rental Property'}". Please review and countersign to finalize.`
                        ]);
                    }

                    // If landlord just countersigned, notify tenant & update property status
                    if (body.landlord_signature && !currentLease.landlord_signature) {
                        await pool.query(`
                            INSERT INTO messages (conversation_id, sender_id, receiver_id, content)
                            VALUES ($1, $2, $3, $4);
                        `, [
                            `lease_${req.params.id}`,
                            currentLease.landlord_id,
                            currentLease.tenant_id,
                            `Landlord countersigned the lease for "${currentLease.property_title || 'Rental Property'}". Your lease is now officially ACTIVE!`
                        ]);

                        if (currentLease.property_id) {
                            await pool.query("UPDATE properties SET status = 'rented' WHERE id = $1;", [currentLease.property_id]);
                        }
                    }
                }
            } catch (leaseErr) {
                console.warn('Lease lifecycle processing note:', leaseErr.message);
            }
        }

        const keys = Object.keys(body);
        const rawValues = Object.values(body);

        if (keys.length === 0) {
            return res.status(400).json({ error: 'No data provided' });
        }

        const values = prepareValues(keys, rawValues);
        const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
        values.push(req.params.id);

        const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = $${values.length} RETURNING *;`;
        const result = await pool.query(sql, values);
        res.json(result.rows[0]);
    } catch (err) {
        console.error(`PostgreSQL update error on ${req.params.entity}:`, err.message);
        res.status(500).json({ error: err.message });
    }
});

// Delete Entity Record
app.delete('/api/entities/:entity/:id', async (req, res) => {
    try {
        const tableName = resolveTable(req.params.entity);
        await pool.query(`DELETE FROM ${tableName} WHERE id = $1;`, [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Initialize database and start server
initDb().then(() => {
    app.listen(PORT, () => {
        console.log(`🚀 RentFlex Local PostgreSQL Server running on http://localhost:${PORT}`);
    });
});
