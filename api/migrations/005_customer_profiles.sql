-- Customer account types are separate from security roles.
ALTER TABLE Customers
    ADD COLUMN IF NOT EXISTS account_type
        ENUM('individual', 'business')
        NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(200) NULL,
    ADD COLUMN IF NOT EXISTS business_registration VARCHAR(50) NULL;

-- Saved addresses belong to individual customer records.
CREATE TABLE IF NOT EXISTS CustomerAddresses (
    address_id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    label VARCHAR(50) NOT NULL DEFAULT 'Home',
    recipient_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NULL,
    delivery_address VARCHAR(255) NOT NULL,
    postal_code CHAR(6) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_customer_addresses (customer_id),
    CONSTRAINT fk_saved_address_customer
        FOREIGN KEY (customer_id)
        REFERENCES Customers(customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
