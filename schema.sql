-- ============================================================
-- CHOCOFIXCO - MODULE 8 DATABASE SCHEMA
-- Backend Development: Express + MariaDB + EJS
--
-- LEARNING NOTES:
-- CREATE TABLE defines the structure of a database table.
-- PRIMARY KEY uniquely identifies each record.
-- AUTO_INCREMENT generates a new ID automatically.
-- UNSIGNED prevents negative integer values.
-- FOREIGN KEY links records between related tables.
-- DECIMAL is suitable for storing monetary amounts.
-- ============================================================

CREATE DATABASE IF NOT EXISTS chocofixco;
USE chocofixco;

-- TABLE 1: PRODUCTS
-- Stores the chocolates displayed in the B2C storefront.
CREATE TABLE IF NOT EXISTS Products (
    product_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    stock_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    image_path VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- TABLE 2: CUSTOMERS
-- Customers can place orders without creating an account.
CREATE TABLE IF NOT EXISTS Customers (
    customer_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- TABLE 3: ORDERS
-- Each order belongs to one customer.
-- The foreign key establishes a one-to-many relationship.
CREATE TABLE IF NOT EXISTS Orders (
    order_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    order_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    collection_date DATE,
    order_status VARCHAR(30) NOT NULL DEFAULT 'Pending',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'Unpaid',
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    -- LEARNING NOTE:
    -- Fulfilment determines whether an order is collected
    -- for free or delivered for an additional S$10.
    fulfilment_method VARCHAR(20) NOT NULL DEFAULT 'Collection',
    delivery_address VARCHAR(255),
    postal_code VARCHAR(6),
    delivery_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,

    CONSTRAINT fk_orders_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
);

-- TABLE 4: ORDER ITEMS
-- Each order can contain multiple chocolate products.
-- unit_price records the product price at purchase time.
CREATE TABLE IF NOT EXISTS OrderItems (
    order_item_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,

    CONSTRAINT fk_items_order
        FOREIGN KEY (order_id)
        REFERENCES Orders(order_id),

    CONSTRAINT fk_items_product
        FOREIGN KEY (product_id)
        REFERENCES Products(product_id)
);

-- ============================================================
-- VERIFICATION
-- SHOW TABLES lists the tables in the current database.
-- ============================================================
SHOW TABLES;
