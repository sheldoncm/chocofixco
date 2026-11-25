// LEARNING NOTE: ADMINISTRATOR AUTHENTICATION
// Administrators are provisioned privately.
// No public registration or Google SSO exists here.

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const {
    createSession,
    clearSession,
    requireAdmin
} = require('../middleware/auth');

const router = express.Router();

function publicAdmin(user) {
    return {
        user_id: user.user_id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
    };
}

router.post('/login', async (req, res, next) => {
    try {
        const email = String(req.body.email || '')
            .trim().toLowerCase();

        const password = req.body.password;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            typeof password !== 'string' ||
            Buffer.byteLength(password, 'utf8') > 72) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        const [rows] = await db.execute(
            `SELECT user_id, email, full_name,
                    password_hash, role, token_version
             FROM Users
             WHERE email = ?
               AND role = 'admin'
               AND is_active = 1`,
            [email]
        );

        const user = rows[0];

        if (!user || !user.password_hash ||
            !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(401).json({
                error: 'Invalid email or password.'
            });
        }

        createSession(res, user);

        res.json({
            message: 'Signed in successfully.',
            user: publicAdmin(user)
        });
    } catch (error) {
        next(error);
    }
});

router.get('/me', requireAdmin, (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ user: publicAdmin(req.admin) });
});

router.post('/logout', async (req, res, next) => {
    try {
        if (req.admin) {
            await db.execute(
                `UPDATE Users
                 SET token_version = token_version + 1
                 WHERE user_id = ? AND role = 'admin'`,
                [req.admin.user_id]
            );
        }

        clearSession(res, 'admin');
        res.json({ message: 'Signed out successfully.' });
    } catch (error) {
        next(error);
    }
});


// Administrators manage their own credentials.
// Password changes invalidate all existing admin sessions.
router.put('/password', requireAdmin, async (req, res, next) => {
    try {
        const { current_password, new_password, confirm_password } = req.body;

        if (typeof current_password !== 'string' ||
            typeof new_password !== 'string' ||
            Buffer.byteLength(current_password, 'utf8') > 72 ||
            Buffer.byteLength(new_password, 'utf8') > 72 ||
            new_password.length < 12 ||
            new_password !== confirm_password ||
            current_password === new_password) {
            return res.status(400).json({
                error: 'Enter matching new passwords of at least 12 characters.'
            });
        }

        const [rows] = await db.execute(
            `SELECT password_hash, token_version FROM Users
             WHERE user_id = ? AND role = 'admin' AND is_active = 1`,
            [req.admin.user_id]
        );

        const user = rows[0];

        if (!user?.password_hash ||
            user.token_version !== req.admin.token_version ||
            !(await bcrypt.compare(current_password, user.password_hash))) {
            return res.status(403).json({
                error: 'Current password is incorrect or session has expired.'
            });
        }

        const hash = await bcrypt.hash(new_password, 12);

        const [result] = await db.execute(
            `UPDATE Users SET password_hash = ?,
             token_version = token_version + 1
             WHERE user_id = ? AND role = 'admin'
             AND is_active = 1 AND token_version = ?`,
            [hash, req.admin.user_id, user.token_version]
        );

        if (result.affectedRows !== 1) {
            return res.status(409).json({
                error: 'Session changed. Please sign in again.'
            });
        }

        clearSession(res, 'admin');

        res.json({
            message: 'Password updated. Please sign in again.'
        });
    } catch (error) {
        next(error);
    }
});

router.use((error, req, res, next) => {
    console.error('Admin authentication:', error.code || error.name);
    res.status(500).json({
        error: 'Unable to complete your request.'
    });
});

module.exports = router;
