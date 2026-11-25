-- LEARNING NOTE: DATABASE DESIGN
-- Authentication is separated from customer records.
-- Foreign keys maintain relationships between tables.
-- UNIQUE constraints prevent duplicate user accounts.
-- Existing customer and order records remain unchanged.

CREATE TABLE IF NOT EXISTS Users (
    user_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NULL,
    role ENUM('customer', 'admin') NOT NULL DEFAULT 'customer',
    google_sub VARCHAR(255) NULL UNIQUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    token_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_users_email_role (email, role),
    CONSTRAINT fk_users_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
COLLATE=utf8mb4_general_ci;
