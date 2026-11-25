-- ============================================================
-- CHOCOFIXCO - MODULE 8 SAMPLE PRODUCT DATA
--
-- LEARNING NOTES:
-- INSERT INTO adds records to a database table.
-- SELECT retrieves records.
-- WHERE filters records using a condition.
-- NOT EXISTS prevents duplicate sample products.
--
-- Prices and stock quantities are demonstration values.
-- Product names, descriptions and images come from Module 5.
-- ============================================================

USE chocofixco;

INSERT INTO Products
(name, description, price, stock_quantity, image_path)
SELECT
'Chocolate Box',
'A classic selection of assorted chocolate treats.',
18.00,
50,
'/images/chocofixco-products/12_chocolate-box-assorted.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM Products WHERE name = 'Chocolate Box'
);

INSERT INTO Products
(name, description, price, stock_quantity, image_path)
SELECT
'Chocolate Gift Set',
'A chocolate selection made for gifting.',
28.00,
40,
'/images/chocofixco-products/04_gift-box-brown.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM Products WHERE name = 'Chocolate Gift Set'
);

INSERT INTO Products
(name, description, price, stock_quantity, image_path)
SELECT
'Custom Chocolate Order',
'A flexible chocolate choice for a special occasion.',
35.00,
30,
'/images/chocofixco-products/15_chocolate-mendiants.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM Products WHERE name = 'Custom Chocolate Order'
);

INSERT INTO Products
(name, description, price, stock_quantity, image_path)
SELECT
'Party Pack',
'A selection of chocolates for sharing at celebrations.',
45.00,
25,
'/images/chocofixco-products/09_truffles-selection.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM Products WHERE name = 'Party Pack'
);

INSERT INTO Products
(name, description, price, stock_quantity, image_path)
SELECT
'Seasonal Box',
'A special chocolate selection for seasonal occasions.',
25.00,
35,
'/images/chocofixco-products/10_heart-chocolates.jpg'
WHERE NOT EXISTS (
    SELECT 1 FROM Products WHERE name = 'Seasonal Box'
);

-- Verify that the five products were inserted.
SELECT product_id, name, price, stock_quantity
FROM Products
ORDER BY product_id;
