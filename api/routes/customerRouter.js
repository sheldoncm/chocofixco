// LEARNING NOTE: REST API AND DATA OWNERSHIP
// The authenticated session determines customer identity.
// SQL WHERE clauses restrict access to owned records.
// The browser cannot select another customer's identity.

const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

router.use((req, res, next) => {
    if (req.user.role !== 'customer' ||
        !req.user.customer_id) {
        return res.status(403).json({
            error: 'Customer access required.'
        });
    }

    next();
});

// READ: retrieve the customer's order history.

router.get('/orders', async (req, res, next) => {
    try {
        const [orders] = await db.execute(
            `SELECT order_id, order_date, collection_date,
                    order_status, payment_status, total_amount,
                    fulfilment_method, delivery_fee
             FROM Orders
             WHERE customer_id = ?
             ORDER BY order_date DESC, order_id DESC`,
            [req.user.customer_id]
        );

        res.json({ orders });
    } catch (error) {
        next(error);
    }
});

// READ: retrieve one order and its associated items.

router.get('/orders/:id', async (req, res, next) => {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) ||
            id < 1 || id > 4294967295) {
            return res.status(400).json({
                error: 'Invalid order reference.'
            });
        }

        const [orders] = await db.execute(
            `SELECT order_id, order_date, collection_date,
                    order_status, payment_status, total_amount,
                    fulfilment_method, delivery_address,
                    postal_code, delivery_fee
             FROM Orders
             WHERE order_id = ? AND customer_id = ?`,
            [id, req.user.customer_id]
        );

        if (!orders.length) {
            return res.status(404).json({
                error: 'Order not found.'
            });
        }

        const [items] = await db.execute(
            `SELECT oi.product_id, p.name,
                    oi.quantity, oi.unit_price
             FROM OrderItems oi
             JOIN Products p
               ON p.product_id = oi.product_id
             WHERE oi.order_id = ?`,
            [id]
        );

        res.json({
            order: orders[0],
            items
        });
    } catch (error) {
        next(error);
    }
});

router.use((error, req, res, next) => {
    console.error('Customer API error:',
        error.code || error.name);

    res.status(500).json({
        error: 'Unable to retrieve your orders.'
    });
});

module.exports = router;
