const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const db = require('../db');
const {
    requireAuth,
    clearSession
} = require('../middleware/auth');

const router = express.Router();
const google = new OAuth2Client();

router.use(requireAuth);

const cookieName = 'choco_security_challenge';

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/api/security'
};

function validPassword(value) {
    return typeof value === 'string' &&
        value.length >= 8 &&
        Buffer.byteLength(value, 'utf8') <= 72;
}

async function getAccount(req) {
    const [rows] = await db.execute(
        `SELECT user_id, email, password_hash, google_sub,
                token_version
         FROM Users
         WHERE user_id = ? AND role = 'customer'
         AND is_active = 1 AND token_version = ?`,
        [req.user.user_id, req.user.token_version]
    );

    return rows[0];
}

// Issue a short-lived challenge bound to the account,
// current session and intended security operation.
router.post('/challenge', async (req, res, next) => {
    try {
        const { purpose, password } = req.body;

        if (!['link', 'set-password'].includes(purpose)) {
            return res.status(400).json({
                error: 'Invalid security operation.'
            });
        }

        if (!process.env.GOOGLE_CLIENT_ID) {
            return res.status(503).json({
                error: 'Google verification is unavailable.'
            });
        }

        const account = await getAccount(req);

        if (!account) {
            return res.status(401).json({
                error: 'Please sign in again.'
            });
        }

        if (purpose === 'link') {
            if (account.google_sub ||
                !account.password_hash ||
                !validPassword(password) ||
                !(await bcrypt.compare(password, account.password_hash))) {
                return res.status(403).json({
                    error: 'Unable to link Google. Verify your current password.'
                });
            }
        }

        if (purpose === 'set-password' &&
            (!account.google_sub || account.password_hash)) {
            return res.status(403).json({
                error: 'Password setup is unavailable for this account.'
            });
        }

        const nonce = crypto.randomBytes(32).toString('hex');

        const challenge = jwt.sign({
            sub: String(account.user_id),
            version: account.token_version,
            purpose,
            nonce
        }, process.env.JWT_SECRET, {
            algorithm: 'HS256',
            issuer: 'chocofixco',
            audience: 'account-security',
            expiresIn: '5m'
        });

        res.cookie(cookieName, challenge, {
            ...cookieOptions,
            maxAge: 300000
        });

        res.set('Cache-Control', 'no-store');
        res.json({ nonce });
    } catch (error) {
        next(error);
    }
});

// Verify Google identity before changing login credentials.
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
        .find(value => value.startsWith(cookieName + '='));

    res.clearCookie(cookieName, cookieOptions);

    let challenge;
    let identity;

    try {
        challenge = jwt.verify(
            cookie?.slice(cookieName.length + 1),
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256'],
                issuer: 'chocofixco',
                audience: 'account-security'
            }
        );

        if (!process.env.GOOGLE_CLIENT_ID ||
            challenge.sub !== String(req.user.user_id) ||
            challenge.version !== req.user.token_version ||
            typeof req.body.credential !== 'string') {
            throw new Error('Invalid challenge');
        }

        const ticket = await google.verifyIdToken({
            idToken: req.body.credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        identity = ticket.getPayload();

        if (!identity?.sub ||
            identity.nonce !== challenge.nonce ||
            identity.email_verified !== true) {
            throw new Error('Invalid identity');
        }
    } catch {
        return res.status(401).json({
            error: 'Google verification failed. Start again.'
        });
    }

    try {
        const account = await getAccount(req);

        if (!account) {
            return res.status(401).json({
                error: 'Please sign in again.'
            });
        }

        let result;

        if (challenge.purpose === 'link') {
            if (account.google_sub || !account.password_hash ||
                identity.email?.toLowerCase() !== account.email.toLowerCase()) {
                return res.status(403).json({
                    error: 'Google email must match your account email.'
                });
            }

            [result] = await db.execute(
                `UPDATE Users SET google_sub = ?,
                    token_version = token_version + 1
                 WHERE user_id = ? AND role = 'customer'
                   AND is_active = 1 AND token_version = ?
                   AND google_sub IS NULL
                   AND password_hash IS NOT NULL`,
                [identity.sub, account.user_id, account.token_version]
            );
        } else if (challenge.purpose === 'set-password') {
            const password = req.body.new_password;

            if (account.google_sub !== identity.sub ||
                account.password_hash ||
                !validPassword(password) ||
                password !== req.body.confirm_password) {
                return res.status(400).json({
                    error: 'Invalid Google identity or password details.'
                });
            }

            const hash = await bcrypt.hash(password, 12);

            [result] = await db.execute(
                `UPDATE Users SET password_hash = ?,
                    token_version = token_version + 1
                 WHERE user_id = ? AND role = 'customer'
                   AND is_active = 1 AND token_version = ?
                   AND google_sub = ?
                   AND password_hash IS NULL`,
                [
                    hash, account.user_id,
                    account.token_version, identity.sub
                ]
            );
        } else {
            return res.status(400).json({
                error: 'Invalid security operation.'
            });
        }

        if (result.affectedRows !== 1) {
            return res.status(409).json({
                error: 'Account changed. Please sign in again.'
            });
        }

        clearSession(res, 'customer');

        res.json({
            message: 'Login methods updated. Please sign in again.'
        });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'This Google identity is already linked.'
            });
        }

        next(error);
    }
});

// Never remove the customer's last available login method.
router.post('/unlink', async (req, res, next) => {
    try {
        const account = await getAccount(req);
        const password = req.body.password;

        if (!account?.google_sub ||
            !account.password_hash ||
            !validPassword(password) ||
            !(await bcrypt.compare(password, account.password_hash))) {
            return res.status(403).json({
                error: 'A valid account password is required to unlink Google.'
            });
        }

        const [result] = await db.execute(
            `UPDATE Users SET google_sub = NULL,
                token_version = token_version + 1
             WHERE user_id = ? AND role = 'customer'
               AND is_active = 1 AND token_version = ?
               AND password_hash IS NOT NULL
               AND google_sub IS NOT NULL`,
            [account.user_id, account.token_version]
        );

        if (result.affectedRows !== 1) {
            return res.status(409).json({
                error: 'Account changed. Please sign in again.'
            });
        }

        clearSession(res, 'customer');

        res.json({
            message: 'Google disconnected. Sign in using your password.'
        });
    } catch (error) {
        next(error);
    }
});

router.use((error, req, res, next) => {
    console.error('Account security:', error.code || error.name);

    res.status(500).json({
        error: 'Unable to complete security operation.'
    });
});

module.exports = router;
