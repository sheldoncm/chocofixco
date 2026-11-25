const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client();
const db = require('../db');
const { requireAuth, clearSession } = require('../middleware/auth');

const router = express.Router();

// Customers can deactivate only their own account.
// Password verification protects this sensitive operation.

// Identify the available verification methods without exposing secrets.
router.get('/methods', requireAuth, async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT password_hash IS NOT NULL AS has_password,
                    google_sub IS NOT NULL AS google_connected
             FROM Users WHERE user_id = ? AND role = 'customer'
             AND is_active = 1`,
            [req.user.user_id]
        );

        res.set('Cache-Control', 'no-store');
        res.json(rows[0] || {});
    } catch (error) {
        next(error);
    }
});

const nonceOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/account/google'
};

// Bind the Google challenge to the customer, session and purpose.
router.get('/google/challenge', requireAuth, async (req, res, next) => {
    try {
        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(503).json({
                error: 'Google verification is unavailable.'
            });
        }

        const [rows] = await db.execute(
            `SELECT google_sub FROM Users
             WHERE user_id = ? AND role = 'customer'
             AND is_active = 1`,
            [req.user.user_id]
        );

        if (!rows[0]?.google_sub) {
            return res.status(403).json({
                error: 'No linked Google account.'
            });
        }

        const nonce = crypto.randomBytes(32).toString('hex');

        const challenge = jwt.sign({
            sub: String(req.user.user_id),
            version: req.user.token_version,
            nonce
        }, process.env.JWT_SECRET, {
            algorithm: 'HS256',
            audience: 'google-deactivation',
            issuer: 'chocofixco',
            expiresIn: '5m'
        });

        res.cookie('choco_deactivation_nonce', challenge, {
            ...nonceOptions,
            maxAge: 5 * 60 * 1000
        });

        res.set('Cache-Control', 'no-store');
        res.json({ nonce });
    } catch (error) {
        next(error);
    }
});

router.post('/google/deactivate', requireAuth, async (req, res, next) => {
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
        .find(value => value.startsWith('choco_deactivation_nonce='));

    res.clearCookie('choco_deactivation_nonce', nonceOptions);

    let challenge;
    let identity;

    try {
        challenge = jwt.verify(
            cookie?.slice('choco_deactivation_nonce='.length),
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256'],
                issuer: 'chocofixco',
                audience: 'google-deactivation'
            }
        );

        if (!process.env.GOOGLE_CLIENT_ID ||
            challenge.sub !== String(req.user.user_id) ||
            challenge.version !== req.user.token_version ||
            typeof req.body.credential !== 'string') {
            throw new Error('Invalid challenge');
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        identity = ticket.getPayload();

        if (!identity?.sub ||
            identity.nonce !== challenge.nonce ||
            identity.email_verified !== true) {
            throw new Error('Invalid Google identity');
        }
    } catch {
        return res.status(401).json({
            error: 'Google verification failed. Please try again.'
        });
    }

    try {
        // Match the linked Google identity, never email alone.
        // Atomic update also prevents reuse after deactivation.
        const [result] = await db.execute(
            `UPDATE Users
             SET is_active = 0,
                 token_version = token_version + 1,
                 deactivated_at = NOW(),
                 deactivated_by = user_id
             WHERE user_id = ? AND role = 'customer'
               AND google_sub = ?
               AND token_version = ?
               AND is_active = 1`,
            [req.user.user_id, identity.sub, challenge.version]
        );

        if (result.affectedRows !== 1) {
            return res.status(403).json({
                error: 'Google account does not match or session has changed.'
            });
        }

        clearSession(res, 'customer');
        res.json({ message: 'Your account has been deactivated.' });
    } catch (error) {
        next(error);
    }
});

router.post('/deactivate', requireAuth, async (req, res, next) => {
    try {
        const password = req.body.password;

        if (typeof password !== 'string' ||
            Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(400).json({
                error: 'Enter your current password.'
            });
        }

        const [rows] = await db.execute(
            `SELECT password_hash, token_version FROM Users
             WHERE user_id = ? AND role = 'customer'
             AND is_active = 1`,
            [req.user.user_id]
        );

        const user = rows[0];

        if (!user?.password_hash) {
            return res.status(400).json({
                error: 'Google-only accounts require verified account recovery assistance.'
            });
        }

        if (user.token_version !== req.user.token_version ||
            !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(403).json({
                error: 'Incorrect password.'
            });
        }

        const [result] = await db.execute(
            `UPDATE Users
             SET is_active = 0,
                 token_version = token_version + 1,
                 deactivated_at = NOW(),
                 deactivated_by = user_id
             WHERE user_id = ? AND role = 'customer'
             AND is_active = 1 AND token_version = ?`,
            [req.user.user_id, user.token_version]
        );

        if (!result.affectedRows) {
            return res.status(409).json({
                error: 'Your session has changed. Please sign in again.'
            });
        }

        clearSession(res, 'customer');

        res.json({ message: 'Your account has been deactivated.' });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
