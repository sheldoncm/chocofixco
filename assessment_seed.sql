-- ChocoFixCo Module 8 Assessment Sample Data
-- Adds 10 customers and 15 orders.
-- Existing records are preserved.
-- A transaction protects against partial insertion.

USE chocofixco;

DELIMITER //

CREATE PROCEDURE run_assessment_seed()
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

-- Assessment customers use a dedicated email domain.
-- This makes the sample dataset identifiable.

INSERT INTO Customers (full_name, email, phone)
SELECT s.full_name, s.email, s.phone
FROM (
    SELECT 'Amelia Tan' AS full_name, 'assessment01@example.com' AS email, '91230001' AS phone
    UNION ALL SELECT 'Benjamin Lim', 'assessment02@example.com', '91230002'
    UNION ALL SELECT 'Chloe Wong', 'assessment03@example.com', '91230003'
    UNION ALL SELECT 'Daniel Lee', 'assessment04@example.com', '91230004'
    UNION ALL SELECT 'Emily Goh', 'assessment05@example.com', '91230005'
    UNION ALL SELECT 'Farhan Ahmad', 'assessment06@example.com', '91230006'
    UNION ALL SELECT 'Grace Ng', 'assessment07@example.com', '91230007'
    UNION ALL SELECT 'Harish Kumar', 'assessment08@example.com', '91230008'
    UNION ALL SELECT 'Isabelle Chen', 'assessment09@example.com', '91230009'
    UNION ALL SELECT 'Jason Teo', 'assessment10@example.com', '91230010'
) AS s
WHERE NOT EXISTS (
    SELECT 1 FROM Customers c WHERE c.email = s.email
);

-- Temporary assessment plan: three orders for the first
-- five customers, giving fifteen orders in total.

CREATE TEMPORARY TABLE assessment_plan (
    sample_no INT PRIMARY KEY,
    customer_email VARCHAR(255),
    product_id INT UNSIGNED,
    quantity INT UNSIGNED,
    fulfilment_method VARCHAR(20),
    order_status VARCHAR(30),
    payment_status VARCHAR(30),
    fulfilment_date DATE
);

INSERT INTO assessment_plan VALUES
(1,'assessment01@example.com',1,1,'Collection','Pending','Unpaid','2026-12-01'),
(2,'assessment02@example.com',2,1,'Delivery','Preparing','Paid','2026-12-02'),
(3,'assessment03@example.com',3,1,'Collection','Completed','Paid','2026-12-03'),
(4,'assessment04@example.com',4,1,'Delivery','Pending','Unpaid','2026-12-04'),
(5,'assessment05@example.com',5,1,'Collection','Preparing','Paid','2026-12-05'),
(6,'assessment06@example.com',1,2,'Delivery','Pending','Unpaid','2026-12-06'),
(7,'assessment07@example.com',2,1,'Collection','Completed','Paid','2026-12-07'),
(8,'assessment08@example.com',3,1,'Delivery','Preparing','Paid','2026-12-08'),
(9,'assessment09@example.com',4,1,'Collection','Pending','Unpaid','2026-12-09'),
(10,'assessment10@example.com',5,1,'Delivery','Completed','Paid','2026-12-10'),
(11,'assessment01@example.com',1,1,'Collection','Preparing','Paid','2026-12-11'),
(12,'assessment02@example.com',2,1,'Delivery','Pending','Unpaid','2026-12-12'),
(13,'assessment03@example.com',3,1,'Collection','Completed','Paid','2026-12-13'),
(14,'assessment04@example.com',4,1,'Delivery','Preparing','Paid','2026-12-14'),
(15,'assessment05@example.com',5,1,'Collection','Pending','Unpaid','2026-12-15');


-- LEARNING NOTE: Validate product availability before inserting orders.
IF EXISTS (
    SELECT 1
    FROM assessment_plan a
    LEFT JOIN Products p ON p.product_id = a.product_id
    WHERE p.product_id IS NULL
       OR p.stock_quantity < (
           SELECT SUM(a2.quantity)
           FROM assessment_plan a2
           WHERE a2.product_id = a.product_id
       )
) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Insufficient product stock or missing product';
END IF;

-- Avoid linking a planned assessment order to an unrelated order.
IF EXISTS (
    SELECT 1
    FROM assessment_plan a
    JOIN Customers c ON c.email = a.customer_email
    JOIN Orders o
      ON o.customer_id = c.customer_id
     AND o.collection_date = a.fulfilment_date
) THEN
    SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Assessment order already exists; import stopped';
END IF;

-- Insert orders only if the matching assessment order
-- has not already been created.

INSERT INTO Orders (
    customer_id,
    collection_date,
    order_status,
    payment_status,
    total_amount,
    fulfilment_method,
    delivery_address,
    postal_code,
    delivery_fee
)
SELECT
    c.customer_id,
    a.fulfilment_date,
    a.order_status,
    a.payment_status,
    p.price * a.quantity +
        IF(a.fulfilment_method = 'Delivery', 10, 0),
    a.fulfilment_method,
    IF(a.fulfilment_method = 'Delivery',
       CONCAT('Assessment Address ', a.sample_no, ', Singapore'),
       NULL),
    IF(a.fulfilment_method = 'Delivery', '118136', NULL),
    IF(a.fulfilment_method = 'Delivery', 10, 0)
FROM assessment_plan a
JOIN Customers c ON c.email = a.customer_email
JOIN Products p ON p.product_id = a.product_id
WHERE NOT EXISTS (
    SELECT 1
    FROM Orders o
    WHERE o.customer_id = c.customer_id
      AND o.collection_date = a.fulfilment_date
);

-- Record only the order items that already existed before
-- this run. This prevents stock being deducted twice.

CREATE TEMPORARY TABLE assessment_existing_items AS
SELECT order_item_id FROM OrderItems;

-- Insert related order items.

INSERT INTO OrderItems (order_id, product_id, quantity, unit_price)
SELECT o.order_id, a.product_id, a.quantity, p.price
FROM assessment_plan a
JOIN Customers c ON c.email = a.customer_email
JOIN Orders o ON o.customer_id = c.customer_id
    AND o.collection_date = a.fulfilment_date
JOIN Products p ON p.product_id = a.product_id
WHERE NOT EXISTS (
    SELECT 1 FROM OrderItems oi WHERE oi.order_id = o.order_id
);

-- Stock is managed by the application when orders are created.
-- Assessment records are inserted directly through SQL.
-- To avoid double deduction, this seed must track only
-- order items inserted during this execution.

UPDATE Products p
JOIN (
    SELECT oi.product_id, SUM(oi.quantity) AS used_quantity
    FROM OrderItems oi
    LEFT JOIN assessment_existing_items old
        ON old.order_item_id = oi.order_item_id
    WHERE old.order_item_id IS NULL
    GROUP BY oi.product_id
) used ON used.product_id = p.product_id
SET p.stock_quantity = p.stock_quantity - used.used_quantity;

DROP TEMPORARY TABLE assessment_existing_items;

DROP TEMPORARY TABLE assessment_plan;

COMMIT;
END //

DELIMITER ;

CALL run_assessment_seed();

DROP PROCEDURE run_assessment_seed;

SELECT COUNT(*) AS customers FROM Customers;
SELECT COUNT(*) AS orders FROM Orders;
SELECT COUNT(*) AS order_items FROM OrderItems;
