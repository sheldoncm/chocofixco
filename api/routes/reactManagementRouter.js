// FF02: Create, Read, Update and Delete.
// FF04: RESTful API for the React SPA.
// Existing Module 8 validation and SQL rules retained.


const express = require('express');
const router = express.Router();
const db = require('../db');

const {
    upload,
    validateUploadedImage,
    removeUpload,
    uploadedImagePath
} = require('../productUpload');

function validId(value) {
    return /^\d+$/.test(String(value)) &&
        Number.isSafeInteger(Number(value)) &&
        Number(value) > 0 &&
        Number(value) <= 4294967295;
}

/*
 * LEARNING NOTE: SERVER-SIDE VALIDATION
 *
 * Browser validation improves usability.
 * Server validation is still required because HTTP requests
 * can be submitted without using our HTML form.
 */
function validProduct(product) {
    const price = Number(product.price);
    const stock = Number(product.stock_quantity);

    return typeof product.name === 'string' &&
        product.name.trim().length > 0 &&
        product.name.length <= 150 &&
        typeof product.description === 'string' &&
        product.description.length <= 65535 &&
        typeof product.image_path === 'string' &&
        product.image_path.length <= 255 &&
        product.price !== '' &&
        Number.isFinite(price) &&
        price >= 0 &&
        price <= 99999999.99 &&
        product.stock_quantity !== '' &&
        Number.isSafeInteger(stock) &&
        stock >= 0 &&
        stock <= 4294967295;
}

function safeExistingImagePath(value) {
    const imagePath = String(value || '').trim();

    if (!imagePath) return '';

    // Only allow images served from our own application.
    // Reject traversal, query strings and backslashes.
    if (
        !imagePath.startsWith('/images/') &&
        !imagePath.startsWith('/uploads/products/')
    ) {
        throw new Error('Please enter a valid local image path.');
    }

    if (
        imagePath.includes('..') ||
        imagePath.includes('\\') ||
        imagePath.includes('?') ||
        imagePath.includes('#') ||
        imagePath.includes('%') ||
        /[\x00-\x1f]/.test(imagePath)
    ) {
        throw new Error('Invalid image path.');
    }

    return imagePath;
}

function uploadProductImage(req, res, next) {
    upload.single('product_image')(req, res, error => {
        if (error) {
            return res.status(400).send(
                'Image upload failed: ' + error.message
            );
        }

        next();
    });
}

async function prepareProduct(req) {
    await validateUploadedImage(req.file);

    const imagePath = req.file
        ? uploadedImagePath(req.file)
        : safeExistingImagePath(req.body.image_path);

    return {
        name: String(req.body.name || '').trim(),
        description: String(req.body.description || ''),
        price: req.body.price,
        stock_quantity: req.body.stock_quantity,
        image_path: imagePath,
        is_active: req.body.is_active === '0' ? 0 : 1
    };
}

// ------------------------------------------------------------
// READ + SEARCH
//
// The query supports two WHERE criteria:
// product name and active/inactive status.
// ------------------------------------------------------------


router.get('/', async (req, res, next) => {
    try {
        const name = String(req.query.name || '').trim().slice(0, 150);

        const availability = ['active', 'inactive'].includes(
            req.query.availability
        ) ? req.query.availability : '';

        const stock = ['low', 'out', 'available'].includes(
            req.query.stock
        ) ? req.query.stock : '';

        const minPrice = String(req.query.min_price || '').trim();
        const maxPrice = String(req.query.max_price || '').trim();

        const allowedSorts = {
            newest: 'product_id DESC',
            oldest: 'product_id ASC',
            name_asc: 'name ASC, product_id ASC',
            name_desc: 'name DESC, product_id DESC',
            price_asc: 'price ASC, product_id ASC',
            price_desc: 'price DESC, product_id DESC',
            stock_asc: 'stock_quantity ASC, product_id ASC',
            stock_desc: 'stock_quantity DESC, product_id DESC'
        };

        const sort = Object.hasOwn(allowedSorts, req.query.sort)
            ? req.query.sort
            : 'newest';

        const conditions = [];
        const params = [];

        if (name) {
            conditions.push('name LIKE ?');
            params.push('%' + name + '%');
        }

        if (availability) {
            conditions.push('is_active = ?');
            params.push(availability === 'active' ? 1 : 0);
        }

        if (stock === 'low') {
            conditions.push('stock_quantity BETWEEN 1 AND 10');
        } else if (stock === 'out') {
            conditions.push('stock_quantity = 0');
        } else if (stock === 'available') {
            conditions.push('stock_quantity > 0');
        }

        function priceFilter(value, operator) {
            if (!value) return;

            const number = Number(value);

            if (!Number.isFinite(number) ||
                number < 0 ||
                number > 99999999.99) {
                throw new Error('Invalid price filter.');
            }

            conditions.push('price ' + operator + ' ?');
            params.push(number);
        }

        priceFilter(minPrice, '>=');
        priceFilter(maxPrice, '<=');

        if (minPrice && maxPrice &&
            Number(minPrice) > Number(maxPrice)) {
            return res.status(400).send(
                'Minimum price cannot exceed maximum price.'
            );
        }

        const where = conditions.length
            ? ' WHERE ' + conditions.join(' AND ')
            : '';

        /*
         * LEARNING NOTE:
         * Multiple filters are combined using AND.
         * ORDER BY is restricted to server-approved columns.
         */
        const sql =
            'SELECT * FROM Products' +
            where +
            ' ORDER BY ' + allowedSorts[sort];

        const [products] = await db.execute(sql, params);

        const [summaryRows] = await db.execute(`
            SELECT
                COUNT(*) AS total,
                COALESCE(SUM(is_active = 1), 0) AS active,
                COALESCE(SUM(is_active = 0), 0) AS inactive,
                COALESCE(SUM(
                    stock_quantity BETWEEN 1 AND 10
                ), 0) AS low_stock
            FROM Products
        `);


        res.json({
            products,
            summary: summaryRows[0]
        });

    } catch (error) {
        if (error.message === 'Invalid price filter.') {
            return res.status(400).send(error.message);
        }

        next(error);
    }
});

// ------------------------------------------------------------
// CREATE
// ------------------------------------------------------------



router.post('/', uploadProductImage, async (req, res, next) => {
    try {
        const product = await prepareProduct(req);

        if (!validProduct(product)) {
            await removeUpload(req.file);
            return res.status(400).send('Invalid product details.');
        }

        await db.execute(
            `INSERT INTO Products
             (name, description, price, stock_quantity,
              image_path, is_active)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                product.name,
                product.description,
                product.price,
                product.stock_quantity,
                product.image_path || null,
                product.is_active
            ]
        );

        res.json({ success: true });
    } catch (error) {
        await removeUpload(req.file);

        if (error.message.includes('image') ||
            error.message.includes('Image')) {
            return res.status(400).send(error.message);
        }

        next(error);
    }
});

// ------------------------------------------------------------
// UPDATE
// ------------------------------------------------------------



router.put('/:id', uploadProductImage, async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            await removeUpload(req.file);
            return res.status(400).send('Invalid product ID.');
        }

        const [rows] = await db.execute(
            'SELECT * FROM Products WHERE product_id = ?',
            [Number(req.params.id)]
        );

        if (!rows.length) {
            await removeUpload(req.file);
            return res.status(404).send('Product not found.');
        }

        const product = await prepareProduct(req);

        // Keep the existing picture when neither a new file
        // nor a new path has been provided.
        if (!req.file && !product.image_path) {
            product.image_path = rows[0].image_path || '';
        }

        if (!validProduct(product)) {
            await removeUpload(req.file);
            return res.status(400).send('Invalid product details.');
        }

        await db.execute(
            `UPDATE Products
             SET name = ?, description = ?, price = ?,
                 stock_quantity = ?, image_path = ?, is_active = ?
             WHERE product_id = ?`,
            [
                product.name,
                product.description,
                product.price,
                product.stock_quantity,
                product.image_path || null,
                product.is_active,
                Number(req.params.id)
            ]
        );

        res.json({ success: true });
    } catch (error) {
        await removeUpload(req.file);

        if (error.message.includes('image') ||
            error.message.includes('Image')) {
            return res.status(400).send(error.message);
        }

        next(error);
    }
});

// ------------------------------------------------------------
// DELETE WITH CONFIRMATION
//
// Foreign keys prevent deleting a product referenced by an
// existing order. This protects historical order records.
// ------------------------------------------------------------



router.delete('/:id', async (req, res, next) => {
    try {
        if (!validId(req.params.id)) {
            return res.status(400).send('Invalid product ID.');
        }

        const [result] = await db.execute(
            'DELETE FROM Products WHERE product_id = ?',
            [Number(req.params.id)]
        );

        if (!result.affectedRows) {
            return res.status(404).send('Product not found.');
        }

        // Uploaded images are retained for now to avoid
        // deleting a file that another product may use.
        res.json({ success: true });
    } catch (error) {
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(409).send(
                'This product belongs to an existing order ' +
                'and cannot be deleted.'
            );
        }

        next(error);
    }
});


// FF04: REST API error handling.
router.use((error, req, res, next) => {
    console.error(error.message);
    res.status(500).json({
        error: 'Unable to complete the product operation.'
    });
});

module.exports = router;
