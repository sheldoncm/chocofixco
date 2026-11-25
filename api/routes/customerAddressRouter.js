const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');

    if (!req.user.customer_id) {
        return res.status(403).json({
            error: 'Customer profile required.'
        });
    }

    next();
});

function addressValues(body) {
    const values = [
        String(body.label || '').trim(),
        String(body.recipient_name || '').trim(),
        String(body.phone || '').trim(),
        String(body.delivery_address || '').trim(),
        String(body.postal_code || '').trim()
    ];

    if (!values[0] || values[0].length > 50 ||
        !values[1] || values[1].length > 150 ||
        values[2].length > 30 ||
        values[3].length < 5 || values[3].length > 255 ||
        !/^[0-9]{6}$/.test(values[4])) {
        return null;
    }

    return values;
}

// READ: retrieve only the signed-in customer's addresses.
router.get('/', async (req, res, next) => {
    try {
        const [rows] = await db.execute(
            `SELECT address_id, label, recipient_name, phone,
                    delivery_address, postal_code, is_default
             FROM CustomerAddresses
             WHERE customer_id = ?
             ORDER BY is_default DESC, address_id DESC`,
            [req.user.customer_id]
        );

        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// CREATE and UPDATE share transaction and validation logic.
async function saveAddress(req, res, next) {
    const values = addressValues(req.body);
    const customerId = req.user.customer_id;
    const id = req.params.id;
    let connection;

    if (!values) {
        return res.status(400).json({
            error: 'Please enter valid address details.'
        });
    }

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Serialize changes for this customer's address book.
        await connection.execute(
            'SELECT customer_id FROM Customers WHERE customer_id = ? FOR UPDATE',
            [customerId]
        );

        const [existing] = await connection.execute(
            `SELECT address_id, is_default FROM CustomerAddresses
             WHERE customer_id = ?`,
            [customerId]
        );

        const target = existing.find(
            item => String(item.address_id) === String(id)
        );

        if (id && !target) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Address not found.'
            });
        }

        const makeDefault =
            req.body.is_default === true ||
            existing.length === 0 ||
            Boolean(target?.is_default);

        if (makeDefault) {
            await connection.execute(
                `UPDATE CustomerAddresses SET is_default = 0
                 WHERE customer_id = ?`,
                [customerId]
            );
        }

        if (id) {
            await connection.execute(
                `UPDATE CustomerAddresses
                 SET label = ?, recipient_name = ?, phone = ?,
                     delivery_address = ?, postal_code = ?, is_default = ?
                 WHERE address_id = ? AND customer_id = ?`,
                [...values, makeDefault, id, customerId]
            );
        } else {
            await connection.execute(
                `INSERT INTO CustomerAddresses
                 (label, recipient_name, phone, delivery_address,
                  postal_code, is_default, customer_id)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [...values, makeDefault, customerId]
            );
        }

        await connection.commit();
        res.status(id ? 200 : 201).json({
            message: 'Address saved.'
        });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
}

router.post('/', saveAddress);
router.put('/:id', saveAddress);

// DELETE: saved addresses only, never user accounts.
// Historical orders retain their original delivery address.
router.delete('/:id', async (req, res, next) => {
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const customerId = req.user.customer_id;

        await connection.execute(
            'SELECT customer_id FROM Customers WHERE customer_id = ? FOR UPDATE',
            [customerId]
        );

        const [result] = await connection.execute(
            `DELETE FROM CustomerAddresses
             WHERE address_id = ? AND customer_id = ?`,
            [req.params.id, customerId]
        );

        if (!result.affectedRows) {
            await connection.rollback();
            return res.status(404).json({
                error: 'Address not found.'
            });
        }

        const [remaining] = await connection.execute(
            `SELECT address_id, is_default FROM CustomerAddresses
             WHERE customer_id = ? ORDER BY address_id`,
            [customerId]
        );

        if (remaining.length &&
            !remaining.some(item => item.is_default)) {
            await connection.execute(
                `UPDATE CustomerAddresses SET is_default = 1
                 WHERE address_id = ? AND customer_id = ?`,
                [remaining[0].address_id, customerId]
            );
        }

        await connection.commit();
        res.json({ message: 'Address removed.' });
    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

router.use((error, req, res, next) => {
    console.error('Address management:', error.code || error.name);
    res.status(500).json({
        error: 'Unable to complete address operation.'
    });
});

module.exports = router;
