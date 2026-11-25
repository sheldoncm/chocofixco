// LEARNING NOTE: CONTROLLED ADMIN CREATION
// Administrators cannot register through the public website.
// Passwords are hashed before being stored in MariaDB.

require('dotenv').config({
    path: require('path').join(__dirname, '../.env')
});

const bcrypt = require('bcryptjs');
const db = require('../db');

async function main() {
    const email = String(process.env.ADMIN_EMAIL || '')
        .trim().toLowerCase();

    const password = process.env.ADMIN_PASSWORD;
    const name = String(process.env.ADMIN_NAME || 'Administrator')
        .trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        email.length > 255 || !name || name.length > 150 ||
        !password || password.length < 12 ||
        Buffer.byteLength(password, 'utf8') > 72) {
        throw new Error(
            'Valid administrator details and a strong password are required.'
        );
    }

    const hash = await bcrypt.hash(password, 12);

    await db.execute(
        `INSERT INTO Users
         (full_name, email, password_hash, role)
         VALUES (?, ?, ?, 'admin')`,
        [name, email, hash]
    );

    console.log('Administrator account created successfully.');
}

main()
    .catch(error => {
        console.error(
            error.code === 'ER_DUP_ENTRY'
                ? 'Email already registered.'
                : error.message
        );

        process.exitCode = 1;
    })
    .finally(() => db.end());
