const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { businessDetails } = require('../customerProfile');

const router = express.Router();

// LEARNING NOTE: REST APIs and parameterised SQL.
// Return account information without exposing credentials.

router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

router.get('/', async (req, res, next) => {
    try {
        const [users] = await db.execute(`
            SELECT u.user_id, u.full_name, u.email,
                   u.role, u.is_active, u.created_at,
                   u.deactivated_at, c.phone, c.account_type,
                   c.company_name, c.business_registration,
                   u.password_hash IS NOT NULL AS has_password,
                   u.google_sub IS NOT NULL AS google_connected
            FROM Users u
            LEFT JOIN Customers c ON c.customer_id = u.customer_id
            ORDER BY u.user_id DESC
        `);

        res.json(users);
    } catch (error) {
        next(error);
    }
});

// CREATE: administrators can provision accounts privately.

router.post('/', async (req, res, next) => {
    const name = String(req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const role = req.body.role;
    const business = businessDetails(req.body);

    if (role === 'customer' && !business) {
        return res.status(400).json({
            error: 'Invalid business details.'
        });
    }
    const password = req.body.password;
    const phone = String(req.body.phone || '').trim();

    if (!name || name.length > 150 ||
        email.length > 255 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !['admin', 'customer'].includes(role) ||
        typeof password !== 'string' ||
        password.length < 12 ||
        Buffer.byteLength(password, 'utf8') > 72 ||
        phone.length > 30) {
        return res.status(400).json({
            error: 'Please provide valid account details and a password of at least 12 characters.'
        });
    }

    let connection;

    try {
        const hash = await bcrypt.hash(password, 12);

        connection = await db.getConnection();
        await connection.beginTransaction();

        let customerId = null;

        if (role === 'customer') {
            const [result] = await connection.execute(
                `INSERT INTO Customers
                 (full_name, email, phone, account_type,
                  company_name, business_registration)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [name, email, phone || null, ...business]
            );

            customerId = result.insertId;
        }

        const [result] = await connection.execute(
            `INSERT INTO Users
             (customer_id, full_name, email, password_hash, role)
             VALUES (?, ?, ?, ?, ?)`,
            [customerId, name, email, hash, role]
        );

        await connection.commit();

        res.status(201).json({
            user_id: result.insertId,
            message: 'Account created successfully.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// UPDATE: edit profile information without changing identity or role.

router.put('/:id', async (req, res, next) => {
    const name = String(req.body.full_name || '').trim();
    const phone = String(req.body.phone || '').trim();

    if (!name || name.length > 150 || phone.length > 30) {
        return res.status(400).json({
            error: 'Invalid profile information.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [rows] = await connection.execute(
            `SELECT customer_id, role FROM Users
             WHERE user_id = ? FOR UPDATE`,
            [req.params.id]
        );

        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Account not found.'
            });
        }

        await connection.execute(
            'UPDATE Users SET full_name = ? WHERE user_id = ?',
            [name, req.params.id]
        );

        if (rows[0].customer_id) {
            const business = businessDetails(req.body);

            if (!business) {
                await connection.rollback();
                return res.status(400).json({
                    error: 'Invalid business details.'
                });
            }

            await connection.execute(
                `UPDATE Customers SET full_name = ?, phone = ?,
                 account_type = ?, company_name = ?,
                 business_registration = ?
                 WHERE customer_id = ?`,
                [name, phone || null, ...business, rows[0].customer_id]
            );
        }

        await connection.commit();

        res.json({ message: 'Account updated successfully.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// Account lifecycle: deactivate instead of permanently deleting.
// Incrementing token_version invalidates existing sessions.

router.patch('/:id/status', async (req, res, next) => {
    const active = req.body.is_active;
    const id = Number(req.params.id);

    if (typeof active !== 'boolean' ||
        !Number.isSafeInteger(id) || id < 1) {
        return res.status(400).json({
            error: 'Invalid account status.'
        });
    }

    if (!active && id === Number(req.admin.user_id)) {
        return res.status(403).json({
            error: 'You cannot deactivate your own administrator account.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Lock administrators consistently to protect
        // against concurrent administrator deactivation.
        const [admins] = await connection.execute(`
            SELECT user_id, is_active FROM Users
            WHERE role = 'admin'
            ORDER BY user_id FOR UPDATE
        `);

        const actingAdmin = admins.find(
            user => Number(user.user_id) === Number(req.admin.user_id)
        );

        if (!actingAdmin?.is_active) {
            await connection.rollback();
            return res.status(403).json({
                error: 'Administrator account is inactive.'
            });
        }

        const [rows] = await connection.execute(
            `SELECT user_id, role, is_active FROM Users
             WHERE user_id = ? FOR UPDATE`,
            [id]
        );

        if (!rows.length) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Account not found.'
            });
        }

        if (!active && rows[0].role === 'admin' &&
            rows[0].is_active &&
            admins.filter(user => user.is_active).length <= 1) {
            await connection.rollback();
            return res.status(403).json({
                error: 'The last active administrator cannot be deactivated.'
            });
        }

        await connection.execute(
            `UPDATE Users
             SET is_active = ?,
                 token_version = token_version + 1,
                 deactivated_at = IF(?, NULL, NOW()),
                 deactivated_by = IF(?, NULL, ?)
             WHERE user_id = ?`,
            [active, active, active, req.admin.user_id, id]
        );

        await connection.commit();

        res.json({
            message: active
                ? 'Account reactivated.'
                : 'Account deactivated.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// Permanent deletion is deliberately unsupported.
router.delete('/:id', (req, res) => {
    res.status(405).json({
        error: 'Permanent account deletion is not permitted here.'
    });
});

router.use((error, req, res, next) => {
    if (error.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            error: 'An account with this email and role already exists.'
        });
    }

    console.error('User management:', error.code || error.name);

    res.status(500).json({
        error: 'Unable to complete the request.'
    });
});

module.exports = router;
