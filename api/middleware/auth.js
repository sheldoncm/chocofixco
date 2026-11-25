// LEARNING NOTE: REUSABLE EXPRESS MIDDLEWARE
// Middleware runs before the route handler.
// Authentication identifies the user.
// Authorisation determines what the user may access.
// Reusing middleware avoids duplicating security logic.

const jwt = require('jsonwebtoken');
const db = require('../db');

// LEARNING NOTE: SESSION ISOLATION
// Customer and administrator sessions use different cookies.
// JWT audiences and database roles prevent cross-portal access.

const COOKIES = {
    customer: 'chocofix_session',
    admin: 'chocofix_admin_session'
};

const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/'
};

function createSession(res, user) {
    const role = user.role;

    if (!COOKIES[role]) {
        throw new Error('Invalid account role.');
    }

    const token = jwt.sign(
        {
            sub: String(user.user_id),
            version: user.token_version
        },
        process.env.JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: role === 'admin' ? '1h' : '4h',
            issuer: 'chocofixco',
            audience: role
        }
    );

    res.cookie(COOKIES[role], token, {
        ...cookieOptions,
        maxAge: (role === 'admin' ? 1 : 4) * 60 * 60 * 1000
    });
}

function clearSession(res, role = 'customer') {
    res.clearCookie(COOKIES[role], cookieOptions);
}

async function readSession(req, res, role) {
    const name = COOKIES[role];

    const cookie = (req.headers.cookie || '')
        .split(';')
        .map(value => value.trim())
        .find(value => value.startsWith(name + '='));

    if (!cookie) return null;

    let payload;

    try {
        payload = jwt.verify(
            cookie.slice(name.length + 1),
            process.env.JWT_SECRET,
            {
                algorithms: ['HS256'],
                issuer: 'chocofixco',
                audience: role
            }
        );
    } catch {
        clearSession(res, role);
        return null;
    }

    const [rows] = await db.execute(
        `SELECT user_id, customer_id, full_name,
                email, role, token_version
         FROM Users
         WHERE user_id = ? AND role = ?
           AND is_active = 1`,
        [payload.sub, role]
    );

    if (rows.length &&
        rows[0].token_version === payload.version) {
        return rows[0];
    }

    clearSession(res, role);
    return null;
}

async function optionalAuth(req, res, next) {
    try {
        req.user = await readSession(req, res, 'customer');
        req.admin = await readSession(req, res, 'admin');
        next();
    } catch (error) {
        next(error);
    }
}

function requireAuth(req, res, next) {
    if (!req.user || req.user.role !== 'customer') {
        return res.status(401).json({
            error: 'Please sign in.'
        });
    }

    next();
}

// LEARNING NOTE: ROLE-BASED ACCESS CONTROL
// Frontend navigation is not a security boundary.
// Express independently verifies administrator access.

function requireAdmin(req, res, next) {
    if (!req.admin || req.admin.role !== 'admin') {
        return res.status(req.user ? 403 : 401).json({
            error: 'Administrator access required.'
        });
    }

    next();
}

// Reject cross-origin browser requests that modify data.
// This supplements SameSite cookie protection.

function sameOriginWrites(req, res, next) {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    const allowed = new Set([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        process.env.APP_ORIGIN
    ].filter(Boolean));

    const origin = req.get('origin');

    if (origin && !allowed.has(origin)) {
        return res.status(403).json({
            error: 'Request origin not allowed.'
        });
    }

    if (req.get('sec-fetch-site') === 'cross-site') {
        return res.status(403).json({
            error: 'Cross-site request rejected.'
        });
    }

    next();
}

module.exports = {
    createSession,
    clearSession,
    optionalAuth,
    requireAuth,
    requireAdmin,
    sameOriginWrites
};
