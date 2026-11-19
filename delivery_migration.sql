-- ============================================================
-- CHOCOFIXCO - MODULE 8 HOME DELIVERY MIGRATION
--
-- LEARNING NOTES:
-- ALTER TABLE modifies an existing database table.
-- DEFAULT supplies a value when one is not specified.
-- NULL allows an optional field.
-- DECIMAL stores monetary amounts accurately.
-- ============================================================

ALTER TABLE Orders
    ADD COLUMN IF NOT EXISTS fulfilment_method
        VARCHAR(20) NOT NULL DEFAULT 'Collection',

    ADD COLUMN IF NOT EXISTS delivery_address
        VARCHAR(255) NULL,

    ADD COLUMN IF NOT EXISTS postal_code
        VARCHAR(6) NULL,

    ADD COLUMN IF NOT EXISTS delivery_fee
        DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- Verify the resulting table structure.
DESCRIBE Orders;

-- Verify existing orders are preserved.
SELECT order_id, fulfilment_method, delivery_fee,
       total_amount, order_status
FROM Orders
ORDER BY order_id;
