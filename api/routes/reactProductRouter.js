// ============================================================
// CHOCOFIXCO - REACT PRODUCT REST API
//
// FF02: CRUD operations
// FF04: Single Page Applications and REST API integration
//
// LEARNING NOTES:
// Express handles HTTP requests.
// MariaDB stores persistent application data.
// REST endpoints return JSON instead of rendered EJS pages.
// React retrieves this JSON using Axios.
//
// GET    = Read
// POST   = Create
// PUT    = Update
// DELETE = Delete
// ============================================================

const express = require('express');
const db = require('../db');

const router = express.Router();

// READ: Retrieve active products for the customer storefront.
router.get('/', async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT product_id, name, description,
                   price, stock_quantity, image_path
            FROM Products
            WHERE is_active = 1
            ORDER BY product_id
        `);

        // res.json() sends structured data to the React frontend.
        res.json(products);

    } catch (error) {
        console.error('Unable to retrieve products:', error.message);

        res.status(500).json({
            error: 'Unable to retrieve chocolate products.'
        });
    }
});

module.exports = router;
