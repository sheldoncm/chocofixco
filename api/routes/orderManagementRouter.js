
const express = require('express');
const router = express.Router();
const db = require('../db');

const ORDER_STATUSES = [
    'Pending',
    'Preparing',
    'Ready',
    'Completed',
    'Cancelled'
];

const PAYMENT_STATUSES = [
    'Unpaid',
    'Paid'
];

function validId(value) {
    return /^\d+$/.test(String(value)) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) > 0 &&
        Number(value) <= 4294967295;
}

// ------------------------------------------------------------
// READ + SEARCH + FILTER + AGGREGATION
//
// LEFT JOIN includes orders even when optional related
// information is absent.
//
// COUNT and SUM demonstrate aggregate SQL queries.
// ------------------------------------------------------------

router.get('/', async (req, res, next) => {
    try {
        const search = String(req.query.search || '').trim().slice(0, 150);
        const status = String(req.query.status || '');

        if (status && !ORDER_STATUSES.includes(status)) {
            return res.status(400).send('Invalid order status filter.');
        }

        let sql = `
            SELECT
                o.order_id,
                c.full_name,
                c.email,
                o.order_date,
                DATE_FORMAT(o.collection_date, '%d %M %Y')
                    AS collection_date,
                o.order_status,
                o.payment_status,
                o.total_amount,
                o.fulfilment_method,
                COUNT(oi.order_item_id) AS item_count,
                COALESCE(SUM(oi.quantity), 0) AS total_quantity
            FROM Orders o
            JOIN Customers c
                ON c.customer_id = o.customer_id
            LEFT JOIN OrderItems oi
                ON oi.order_id = o.order_id
            WHERE 1 = 1
        `;

        const params = [];

        if (search) {
            sql += `
                AND (
                    c.full_name LIKE ?
                    OR c.email LIKE ?
            `;

            params.push('%' + search + '%');
            params.push('%' + search + '%');

            if (validId(search)) {
                sql += ' OR o.order_id = ?';
                params.push(Number(search));
            }

            sql += ')';
        }

        if (status) {
            sql += ' AND o.order_status = ?';
            params.push(status);
        }

        sql += `
            GROUP BY
                o.order_id,
                c.full_name,
                c.email,
                o.order_date,
                o.collection_date,
                o.order_status,
                o.payment_status,
                o.total_amount,
                o.fulfilment_method
            ORDER BY o.order_id DESC
        `;

        const [orders] = await db.execute(sql, params);

        // A separate aggregate query gives us dashboard totals.
        const [summaryRows] = await db.execute(`
            SELECT
                COUNT(*) AS total_orders,
                COALESCE(SUM(
                    CASE WHEN order_status = 'Pending'
                         THEN 1 ELSE 0 END
                ), 0) AS pending_orders,
                COALESCE(SUM(
                    CASE WHEN order_status <> 'Cancelled'
                         THEN total_amount ELSE 0 END
                ), 0) AS active_order_value
            FROM Orders
        `);

        res.render('manage-orders/index', {
            title: 'Order Management | ChocoFixCo',
            orders,
            summary: summaryRows[0],
            search,
            status,
            statuses: ORDER_STATUSES
        });

    } catch (error) {
        next(error);
    }
});

// ------------------------------------------------------------
// READ ONE ORDER
//
// The first query retrieves the customer and order.
// The second retrieves its related order items.
// ------------------------------------------------------------

router.get('/:id', async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).send('Invalid order reference.');
        }

        const [orders] = await db.execute(`
            SELECT
                o.*,
                c.full_name,
                c.email,
                c.phone,
                DATE_FORMAT(o.collection_date, '%Y-%m-%d')
                    AS collection_date_display
            FROM Orders o
            JOIN Customers c
                ON c.customer_id = o.customer_id
            WHERE o.order_id = ?
        `, [Number(req.params.id)]);

        if (!orders.length) {
            return res.status(404).send('Order not found.');
        }

        const [items] = await db.execute(`
            SELECT
                oi.order_item_id,
                oi.product_id,
                oi.quantity,
                oi.unit_price,
                p.name AS product_name,
                p.image_path
            FROM OrderItems oi
            JOIN Products p
                ON p.product_id = oi.product_id
            WHERE oi.order_id = ?
            ORDER BY oi.order_item_id
        `, [Number(req.params.id)]);

        res.render('manage-orders/detail', {
            title: 'Order Details | ChocoFixCo',
            order: orders[0],
            items,
            statuses: ORDER_STATUSES,
            paymentStatuses: PAYMENT_STATUSES,
            error: null
        });

    } catch (error) {
        next(error);
    }
});

// ------------------------------------------------------------
// UPDATE ORDER STATUS
//
// LEARNING NOTE: DATABASE TRANSACTIONS
//
// BEGIN TRANSACTION starts a protected group of SQL changes.
// SELECT ... FOR UPDATE locks the order during modification.
// COMMIT makes the changes permanent.
// ROLLBACK reverses them if an error occurs.
//
// If an order becomes Cancelled, stock is restored.
// The old status is checked under a lock, preventing the
// same cancellation from restoring stock more than once.
// ------------------------------------------------------------

router.post('/:id/update', async (req, res, next) => {
    if (!validId(req.params.id)) {
        return res.status(400).send('Invalid order reference.');
    }

    const orderId = Number(req.params.id);
    const newStatus = String(req.body.order_status || '');
    const newPayment = String(req.body.payment_status || '');

    if (!ORDER_STATUSES.includes(newStatus) ||
        !PAYMENT_STATUSES.includes(newPayment)) {
        return res.status(400).send('Invalid order update.');
    }

    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const [orders] = await connection.execute(`
            SELECT order_id, order_status, payment_status
            FROM Orders
            WHERE order_id = ?
            FOR UPDATE
        `, [orderId]);

        if (!orders.length) {
            await connection.rollback();
            return res.status(404).send('Order not found.');
        }

        const oldStatus = orders[0].order_status;

        // A cancelled order remains cancelled.
        // Reopening would require another controlled stock
        // reservation workflow, which is outside this module.
        if (oldStatus === 'Cancelled' &&
            newStatus !== 'Cancelled') {
            await connection.rollback();
            return res.status(409).send(
                'Cancelled orders cannot be reopened.'
            );
        }

        // Completed orders cannot be cancelled automatically,
        // because their products may already be collected.
        if (oldStatus === 'Completed' &&
            newStatus === 'Cancelled') {
            await connection.rollback();
            return res.status(409).send(
                'Completed orders cannot be cancelled automatically.'
            );
        }

        if (newStatus === 'Cancelled' &&
            newPayment === 'Paid') {
            await connection.rollback();
            return res.status(409).send(
                'Set payment status to Unpaid before cancelling. ' +
                'Any actual refund must be handled separately.'
            );
        }

        if (newStatus === 'Cancelled' &&
            oldStatus !== 'Cancelled') {

            const [items] = await connection.execute(`
                SELECT product_id, quantity
                FROM OrderItems
                WHERE order_id = ?
                ORDER BY product_id
            `, [orderId]);

            // Restore each product's quantity.
            for (const item of items) {
                await connection.execute(`
                    UPDATE Products
                    SET stock_quantity = stock_quantity + ?
                    WHERE product_id = ?
                `, [item.quantity, item.product_id]);
            }
        }

        await connection.execute(`
            UPDATE Orders
            SET order_status = ?,
                payment_status = ?
            WHERE order_id = ?
        `, [newStatus, newPayment, orderId]);

        await connection.commit();

        res.redirect('/manage/orders/' + orderId + '?saved=1');

    } catch (error) {
        if (connection) {
            await connection.rollback();
        }
        next(error);
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;
