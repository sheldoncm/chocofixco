
const express = require('express');
const router = express.Router();
const db = require('../db');

function validDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return false;

    const parsed = new Date(value + 'T00:00:00Z');

    if (Number.isNaN(parsed.getTime()) ||
        parsed.toISOString().slice(0, 10) !== value) return false;

    const today = new Date();
    const singaporeToday = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Singapore',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(today);

    return value >= singaporeToday;
}

function validId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 && id <= 4294967295;
}

// READ: retrieve one active product for the order form.
router.get('/:id', async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).send('Invalid product ID.');
        }

        const [rows] = await db.execute(
            `SELECT product_id, name, description, price,
                    stock_quantity, image_path
             FROM Products
             WHERE product_id = ? AND is_active = 1`,
            [req.params.id]
        );

        if (!rows.length) {
            return res.status(404).send('Product not found.');
        }

        res.json({
            title: 'Place Order | ChocoFixCo',
            product: rows[0],
            error: null
        });
    } catch (error) {
        next(error);
    }
});

// CREATE: insert customer, order and order item.
router.post('/:id', async (req, res, next) => {
    const name = String(req.body.full_name || '').trim();
    const email = String(req.body.email || '').trim();
    const phone = String(req.body.phone || '').trim();
    const quantity = Number(req.body.quantity);
    const collectionDate = String(req.body.collection_date || '');

    // LEARNING NOTE:
    // Never trust the browser's displayed price or delivery fee.
    // The server validates the selected fulfilment method.
    // LEARNING NOTE: SERVER-SIDE VALIDATION
    // Never silently assume Self Collection when a customer
    // has not submitted a valid fulfilment method.
    // Both Collection and Delivery must be explicitly selected.
    const fulfilmentMethod =
        String(req.body.fulfilment_method || '').trim();

    const isDelivery = fulfilmentMethod === 'Delivery';

    const deliveryAddress =
        String(req.body.delivery_address || '').trim();

    const postalCode =
        String(req.body.postal_code || '').trim();

    const deliveryDetailsValid = !isDelivery || (
        deliveryAddress.length >= 5 &&
        deliveryAddress.length <= 255 &&
        /^[0-9]{6}$/.test(postalCode)
    );

    // Validate all user input before starting the transaction.
    if (!validId(req.params.id) ||
        !name || name.length > 150 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 255 ||
        phone.length > 30 ||
        !Number.isSafeInteger(quantity) ||
        quantity < 1 || quantity > 10 ||
        !validDate(collectionDate) ||
        !['Collection', 'Delivery'].includes(fulfilmentMethod) ||
        !deliveryDetailsValid) {
        return res.status(400).send(
            'Invalid order details. Please check your information.'
        );
    }

    let connection;

    try {
        connection = await db.getConnection();

        // A transaction protects related database writes.
        await connection.beginTransaction();

        const [products] = await connection.execute(
            `SELECT product_id, name, price, stock_quantity
             FROM Products
             WHERE product_id = ? AND is_active = 1
             FOR UPDATE`,
            [req.params.id]
        );

        if (!products.length) {
            await connection.rollback();
            return res.status(404).send('Product unavailable.');
        }

        const product = products[0];

        if (product.stock_quantity < quantity) {
            await connection.rollback();
            return res.status(409).send(
                'Not enough stock for the requested quantity.'
            );
        }

        // DECIMAL prices are converted into integer cents to
        // avoid floating-point errors in monetary calculations.
        const priceCents = Math.round(Number(product.price) * 100);
        // Delivery is a fixed S$10 per order.
        // Calculate using cents to avoid floating-point errors.
        const deliveryFeeCents = isDelivery ? 1000 : 0;
        const totalCents =
            priceCents * quantity + deliveryFeeCents;

        if (!Number.isSafeInteger(totalCents) ||
            totalCents > 9999999999) {
            await connection.rollback();
            return res.status(400).send('Invalid order amount.');
        }

        const unitPrice = (priceCents / 100).toFixed(2);
        const totalAmount = (totalCents / 100).toFixed(2);
        const deliveryFee = (deliveryFeeCents / 100).toFixed(2);

        // DML INSERT 1: Customer.
        // LEARNING NOTE: AUTHENTICATION AND DATA OWNERSHIP
        // Registered customers reuse their linked customer ID.
        // Guest customers receive a separate customer record.
        // Never trust a customer ID supplied by the browser.

        let customerId;

        if (req.user?.role === 'customer') {
            customerId = req.user.customer_id;

            if (!customerId) {
                await connection.rollback();
                return res.status(409).json({
                    error: 'Customer account is incomplete.'
                });
            }
        } else {
            const [customerResult] = await connection.execute(
                `INSERT INTO Customers (full_name, email, phone)
                 VALUES (?, ?, ?)`,
                [name, email, phone || null]
            );

            customerId = customerResult.insertId;
        }

        // DML INSERT 2: Order linked to Customer.
        const [orderResult] = await connection.execute(
            `INSERT INTO Orders
             (customer_id, collection_date, order_status,
              payment_status, total_amount,
              fulfilment_method, delivery_address,
              postal_code, delivery_fee)
             VALUES (?, ?, 'Pending', 'Unpaid', ?, ?, ?, ?, ?)`,
            [
                customerId,
                collectionDate,
                totalAmount,
                fulfilmentMethod,
                isDelivery ? deliveryAddress : null,
                isDelivery ? postalCode : null,
                deliveryFee
            ]
        );

        // DML INSERT 3: Order item linked to Order and Product.
        await connection.execute(
            `INSERT INTO OrderItems
             (order_id, product_id, quantity, unit_price)
             VALUES (?, ?, ?, ?)`,
            [orderResult.insertId, product.product_id,
             quantity, unitPrice]
        );

        // DML UPDATE: deduct purchased stock.
        await connection.execute(
            `UPDATE Products
             SET stock_quantity = stock_quantity - ?
             WHERE product_id = ?`,
            [quantity, product.product_id]
        );

        await connection.commit();

        // Redirect prevents accidental duplicate submission
        // when the customer refreshes the confirmation page.
        res.status(201).json({
            order_id: orderResult.insertId,
            product_name: product.name,
            quantity,
            total_amount: totalAmount,
            delivery_fee: deliveryFee,
            fulfilment_method: fulfilmentMethod,
            collection_date: collectionDate,
            delivery_address: isDelivery ? deliveryAddress : null,
            postal_code: isDelivery ? postalCode : null,
            order_status: 'Pending',
            payment_status: 'Unpaid'
        });

    } catch (error) {
        if (connection) await connection.rollback();
        next(error);
    } finally {
        if (connection) connection.release();
    }
});

// READ: confirmation by order reference.
//
// Privacy note: a sequential ID is not a secure access token.
// This page intentionally does not expose customer details.
// Before public deployment, use an unguessable confirmation
// token or an authenticated customer session.


router.use((error, req, res, next) => {
    console.error(error.message);
    res.status(500).json({
        error: 'Unable to complete the order operation.'
    });
});

module.exports = router;
