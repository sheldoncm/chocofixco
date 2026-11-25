// LEARNING NOTE: REST API AND AUTHENTICATION
// POST creates accounts and authentication sessions.
// GET retrieves the authenticated user's information.
// PUT updates existing account information.
// Parameterised SQL protects against SQL injection.

const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID
);
const db = require('../db');
const { businessDetails } = require('../customerProfile');

const {
    createSession,
    clearSession,
    requireAuth
} = require('../middleware/auth');

const router = express.Router();

function normaliseEmail(value) {
    return typeof value === 'string'
        ? value.trim().toLowerCase()
        : '';
}

function validEmail(email) {
    return email.length <= 255 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
    return typeof password === 'string' &&
        password.length >= 8 &&
        Buffer.byteLength(password, 'utf8') <= 72;
}

function publicUser(user) {
    return {
        user_id: user.user_id,
        customer_id: user.customer_id,
        full_name: user.full_name,
        email: user.email,
        role: user.role
    };
}

// CREATE: customer registration.
// A transaction ensures both records are created together.

router.post('/register', async (req, res, next) => {
    const name = String(req.body.full_name || '').trim();
    const email = normaliseEmail(req.body.email);
    const phone = String(req.body.phone || '').trim();
    const password = req.body.password;
    const business = businessDetails(req.body);

    if (!business) {
        return res.status(400).json({
            error: 'Please enter valid business details.'
        });
    }

    if (!name || name.length > 150 ||
        !validEmail(email) || phone.length > 30 ||
        !validPassword(password)) {
        return res.status(400).json({
            error: 'Please enter valid registration details.'
        });
    }

    if (password !== req.body.confirm_password) {
        return res.status(400).json({
            error: 'Passwords do not match.'
        });
    }

    let connection;

    try {
        // Password hashing is deliberately performed
        // before opening the database transaction.
        const passwordHash = await bcrypt.hash(password, 12);

        connection = await db.getConnection();
        await connection.beginTransaction();


        // Reactivation preserves the existing customer and order history.
        const [existing] = await connection.execute(
            `SELECT user_id, customer_id, full_name, email,
                    role, password_hash, token_version,
                    is_active, deactivated_by
             FROM Users
             WHERE email = ? AND role = 'customer'
             FOR UPDATE`,
            [email]
        );

        if (existing.length) {
            const account = existing[0];

            const canReactivate =
                !account.is_active &&
                Number(account.deactivated_by) === Number(account.user_id) &&
                account.password_hash &&
                await bcrypt.compare(password, account.password_hash);

            if (!canReactivate) {
                await connection.rollback();

                return res.status(409).json({
                    error: 'Unable to register this email. Sign in with your existing credentials or contact support.'
                });
            }

            await connection.execute(
                `UPDATE Users SET is_active = 1,
                    deactivated_at = NULL,
                    deactivated_by = NULL,
                    token_version = token_version + 1
                 WHERE user_id = ?`,
                [account.user_id]
            );

            const [profiles] = await connection.execute(
                `SELECT phone, account_type, company_name,
                        business_registration
                 FROM Customers WHERE customer_id = ?`,
                [account.customer_id]
            );

            await connection.commit();

            account.token_version += 1;
            createSession(res, account);

            return res.json({
                message: 'Welcome back. Your account has been reactivated.',
                user: {
                    ...publicUser(account),
                    ...profiles[0]
                }
            });
        }

        // Never link historical guest orders using email alone.
        const [customer] = await connection.execute(
            `INSERT INTO Customers
             (full_name, email, phone, account_type,
              company_name, business_registration)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [name, email, phone || null, ...business]
        );

        // Public registration always creates a customer.
        // The role is never accepted from the browser.
        const [result] = await connection.execute(
            `INSERT INTO Users
             (customer_id, full_name, email, password_hash, role)
             VALUES (?, ?, ?, ?, 'customer')`,
            [customer.insertId, name, email, passwordHash]
        );

        await connection.commit();

        const user = {
            user_id: result.insertId,
            customer_id: customer.insertId,
            full_name: name,
            email,
            role: 'customer',
            token_version: 0
        };

        createSession(res, user);

        res.status(201).json({
            message: 'Account created successfully.',
            user: {
                ...publicUser(user), phone,
                account_type: business[0],
                company_name: business[1],
                business_registration: business[2]
            }
        });

    } catch (error) {
        if (connection) await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Email address is already registered.'
            });
        }

        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// LEARNING NOTE: THIRD-PARTY AUTHENTICATION
// Google verifies identity; our backend verifies the ID token.
// The nonce binds the Google response to this browser.
// Our application still controls roles and session creation.

const googleNonceOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/auth/google'
};

router.get('/google/challenge', (req, res) => {
    if (!process.env.GOOGLE_CLIENT_ID) {
        return res.status(503).json({
            error: 'Google Sign-In is not configured.'
        });
    }

    const nonce = crypto.randomBytes(32).toString('hex');

    res.cookie('choco_google_nonce', nonce, {
        ...googleNonceOptions,
        maxAge: 10 * 60 * 1000
    });

    res.set('Cache-Control', 'no-store');
    res.json({ nonce });
});

router.post('/google', async (req, res, next) => {
    const origin = req.get('origin');

    if (!origin || ![
        'http://localhost:5173',
        process.env.APP_ORIGIN
    ].includes(origin)) {
        return res.status(403).json({
            error: 'Request origin not allowed.'
        });
    }

    const cookie = (req.headers.cookie || '')
        .split(';')
        .map(value => value.trim())
        .find(value => value.startsWith('choco_google_nonce='));

    const nonce = cookie?.slice('choco_google_nonce='.length);

    res.clearCookie('choco_google_nonce', googleNonceOptions);

    if (!nonce || typeof req.body.credential !== 'string' ||
        !process.env.GOOGLE_CLIENT_ID) {
        return res.status(400).json({
            error: 'Please refresh and try Google Sign-In again.'
        });
    }

    let identity;

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        identity = ticket.getPayload();
    } catch {
        return res.status(401).json({
            error: 'Google identity could not be verified.'
        });
    }

    const email = normaliseEmail(identity?.email);
    const name = String(identity?.name || '').trim();

    if (!identity?.sub || identity.nonce !== nonce ||
        identity.email_verified !== true ||
        !validEmail(email) || !name || name.length > 150) {
        return res.status(401).json({
            error: 'Google identity could not be verified.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT user_id, customer_id, full_name, email,
                    role, token_version, is_active, google_sub,
                    deactivated_by
             FROM Users
             WHERE role = 'customer' AND (google_sub = ? OR email = ?)
             FOR UPDATE`,
            [identity.sub, email]
        );

        let user = rows.find(
            row => row.google_sub === identity.sub
        );

        if (rows.length && !user) {
            await connection.rollback();

            return res.status(409).json({
                error: 'An account already exists. Please sign in using your password.'
            });
        }

        if (user && (
            user.role !== 'customer' ||
            rows.length > 1 ||
            (!user.is_active &&
             Number(user.deactivated_by) !== Number(user.user_id))
        )) {
            await connection.rollback();

            return res.status(403).json({
                error: 'Google Sign-In is unavailable for this account.'
            });
        }

        if (user && !user.is_active) {
            await connection.execute(
                `UPDATE Users SET is_active = 1,
                    deactivated_at = NULL,
                    deactivated_by = NULL,
                    token_version = token_version + 1
                 WHERE user_id = ?`,
                [user.user_id]
            );

            user.token_version += 1;
            user.is_active = 1;
        }

        if (!user) {
            const [customer] = await connection.execute(
                `INSERT INTO Customers (full_name, email)
                 VALUES (?, ?)`,
                [name, email]
            );

            const [result] = await connection.execute(
                `INSERT INTO Users
                 (customer_id, full_name, email, google_sub, role)
                 VALUES (?, ?, ?, ?, 'customer')`,
                [customer.insertId, name, email, identity.sub]
            );

            user = {
                user_id: result.insertId,
                customer_id: customer.insertId,
                full_name: name,
                email,
                role: 'customer',
                token_version: 0
            };
        }

        const [customers] = await connection.execute(
            `SELECT phone, account_type, company_name,
                    business_registration
             FROM Customers WHERE customer_id = ?`,
            [user.customer_id]
        );

        await connection.commit();

        createSession(res, user);

        res.json({
            message: 'Signed in with Google.',
            user: {
                ...publicUser(user),
                ...customers[0],
                phone: customers[0]?.phone || ''
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Account already exists. Please sign in again.'
            });
        }

        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// LOGIN: verify the password hash and create a session.

router.post('/login', async (req, res, next) => {
    try {
        const email = normaliseEmail(req.body.email);
        const password = req.body.password;

        if (!validEmail(email) ||
            !validPassword(password)) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        const [rows] = await db.execute(
            `SELECT user_id, customer_id, full_name, email,
                    password_hash, role, token_version
             FROM Users
             WHERE email = ? AND role = 'customer' AND is_active = 1`,
            [email]
        );

        const user = rows[0];

        if (!user || !user.password_hash ||
            !(await bcrypt.compare(
                password, user.password_hash
            ))) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        const [customers] = await db.execute(
            `SELECT phone, account_type, company_name,
                    business_registration
             FROM Customers WHERE customer_id = ?`,
            [user.customer_id]
        );

        createSession(res, user);

        res.json({
            message: 'Signed in successfully.',
            user: {
                ...publicUser(user),
                ...customers[0],
                phone: customers[0]?.phone || ''
            }
        });
    } catch (error) {
        next(error);
    }
});

// LOGOUT: invalidate existing sessions and clear the cookie.

router.post('/logout', async (req, res, next) => {
    try {
        if (req.user) {
            await db.execute(
                `UPDATE Users
                 SET token_version = token_version + 1
                 WHERE user_id = ?`,
                [req.user.user_id]
            );
        }

        clearSession(res);

        res.json({
            message: 'Signed out successfully.'
        });
    } catch (error) {
        next(error);
    }
});

// READ: retrieve the current authenticated user.

router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT phone, account_type, company_name,
                    business_registration FROM Customers
             WHERE customer_id = ?`,
            [req.user.customer_id]
        );

        res.json({
            user: {
                ...publicUser(req.user),
                ...rows[0],
                phone: rows[0]?.phone || ''
            }
        });
    } catch (error) {
        next(error);
    }
});

// UPDATE: edit the authenticated user's profile.

router.put('/profile', requireAuth, async (req, res, next) => {
    const name = String(req.body.full_name || '').trim();
    const phone = String(req.body.phone || '').trim();

    const business = businessDetails(req.body);

    if (!business || !name || name.length > 150 || phone.length > 30) {
        return res.status(400).json({
            error: 'Invalid profile details.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        await connection.execute(
            'UPDATE Users SET full_name = ? WHERE user_id = ?',
            [name, req.user.user_id]
        );

        if (req.user.customer_id) {
            await connection.execute(
                `UPDATE Customers SET full_name = ?, phone = ?,
                 account_type = ?, company_name = ?,
                 business_registration = ?
                 WHERE customer_id = ?`,
                [name, phone || null, ...business, req.user.customer_id]
            );
        }

        await connection.commit();

        res.json({
            message: 'Profile updated successfully.',
            user: {
                ...publicUser(req.user),
                full_name: name,
                phone,
                account_type: business[0],
                company_name: business[1],
                business_registration: business[2]
            }
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE: change the authenticated user's password.
// Verify the existing password before accepting a new one.
// Incrementing token_version invalidates previous sessions.

router.put('/password', requireAuth, async (req, res, next) => {
    const current = req.body.current_password;
    const password = req.body.new_password;

    if (!validPassword(current) ||
        !validPassword(password) ||
        password !== req.body.confirm_password ||
        current === password) {
        return res.status(400).json({
            error: 'Please enter valid and matching new passwords.'
        });
    }

    try {
        const [rows] = await db.execute(
            `SELECT password_hash, token_version
             FROM Users
             WHERE user_id = ? AND is_active = 1`,
            [req.user.user_id]
        );

        const user = rows[0];

        if (!user || !user.password_hash ||
            user.token_version !== req.user.token_version ||
            !(await bcrypt.compare(current, user.password_hash))) {
            return res.status(401).json({
                error: 'Current password is incorrect.'
            });
        }

        const hash = await bcrypt.hash(password, 12);

        const [result] = await db.execute(
            `UPDATE Users
             SET password_hash = ?,
                 token_version = token_version + 1
             WHERE user_id = ? AND token_version = ?
               AND is_active = 1`,
            [hash, req.user.user_id, user.token_version]
        );

        if (result.affectedRows !== 1) {
            return res.status(409).json({
                error: 'Session changed. Please sign in again.'
            });
        }

        clearSession(res);

        res.json({
            message: 'Password updated. Please sign in again.'
        });
    } catch (error) {
        next(error);
    }
});

router.use((error, req, res, next) => {
    console.error('Authentication error:', error.code || error.name);

    res.status(500).json({
        error: 'Unable to complete your request.'
    });
});

module.exports = router;
