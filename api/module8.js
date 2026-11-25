// ============================================================
// CHOCOFIXCO - MODULE 8 EXPRESS APPLICATION
// Backend Development: Express + MariaDB + EJS
//
// LEARNING NOTES:
// Express handles HTTP requests and responses.
// EJS generates HTML on the server using dynamic data.
// express-ejs-layouts provides a reusable page layout.
// express.static serves CSS, JavaScript and image files.
// Routers help organise related application features.
//
// Module 5's MongoDB application remains in api/index.js.
// ============================================================

require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const db = require('./db');

const {
    optionalAuth,
    requireAdmin,
    sameOriginWrites
} = require('./middleware/auth');

if (!process.env.JWT_SECRET ||
    process.env.JWT_SECRET.length < 64) {
    throw new Error('A strong JWT_SECRET is required.');
}


const app = express();
const PORT = process.env.MODULE8_PORT || 3001;

// EJS is the view engine used to render dynamic HTML.
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// All pages share the same reusable layout.
app.use(expressLayouts);
app.set('layout', 'layouts/base');

// Read HTML form submissions and JSON request bodies.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// LEARNING NOTE: REUSABLE AUTHENTICATION MIDDLEWARE
// Identify the current user before protected routes execute.
app.use(sameOriginWrites);
app.use(optionalAuth);

app.use('/api/auth', require('./routes/authRouter'));
app.use('/api/security', require('./routes/accountSecurityRouter'));
app.use('/api/admin/auth', require('./routes/adminAuthRouter'));
app.use('/api/customer/addresses', require('./routes/customerAddressRouter'));
app.use('/api/customer', require('./routes/customerRouter'));
app.use('/api/manage/users', requireAdmin, require('./routes/adminUserRouter'));
app.use('/api/account', require('./routes/accountLifecycleRouter'));



// Make our existing storefront assets available to browsers.
app.use(express.static(path.join(__dirname, 'public')));

// HOME PAGE
// GET requests retrieve information without modifying data.
// The SQL query reads active chocolates from MariaDB.
app.get('/', async (req, res) => {
    try {
        const [products] = await db.execute(`
            SELECT product_id, name, description,
                   price, stock_quantity, image_path
            FROM Products
            WHERE is_active = 1
            ORDER BY product_id
        `);

        // res.render() passes SQL results into an EJS template.
        res.render('shop/index', {
            title: 'ChocoFixCo | Chocolate Shop',
            products
        });
    } catch (error) {
        console.error('Unable to load storefront:', error.message);
        res.status(500).send('Unable to load the chocolate shop.');
    }
});

// BACKEND DASHBOARD
// GET displays the central management page using EJS.
app.get('/backend', requireAdmin, (req, res) => {
    res.render('backend/index', {
        title: 'Backend | ChocoFixCo'
    });
});

// MODULE 8 PRODUCT CRUD
// Mount the router at /manage/products.
// Individual CRUD routes are defined in routes/productRouter.js.
app.use('/manage/products', requireAdmin, require('./routes/productRouter'));

// Customer ordering: GET form, POST order, GET confirmation.
app.use('/order', require('./routes/orderRouter'));

// Order Management: read, search, update and cancel.
app.use('/manage/orders', requireAdmin, require('./routes/orderManagementRouter'));

// Modern Frameworks: JSON REST API for the React frontend.
app.use('/api/products', require('./routes/reactProductRouter'));

app.use('/api/manage/products', requireAdmin, require('./routes/reactManagementRouter'));

app.use('/api/order', require('./routes/reactOrderRouter'));

app.use('/api/manage/orders', requireAdmin, require('./routes/reactOrderManagementRouter'));

// Start the server after Express has registered its routes.
app.listen(PORT, () => {
    console.log(`ChocoFixCo Module 8 running at http://localhost:${PORT}`);
});
