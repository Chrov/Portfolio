-- Staging layer: typed, renamed, de-duplicated copies of the raw Olist tables.
-- Portable SQL (runs on DuckDB; uses only CTEs, window functions, CAST, COALESCE).

CREATE OR REPLACE TABLE stg_orders AS
SELECT
    order_id,
    customer_id,
    order_status,
    CAST(order_purchase_timestamp AS TIMESTAMP)      AS purchased_at,
    CAST(order_delivered_customer_date AS TIMESTAMP) AS delivered_at,
    CAST(order_estimated_delivery_date AS TIMESTAMP) AS estimated_at
FROM raw_orders;

CREATE OR REPLACE TABLE stg_customers AS
SELECT customer_id, customer_unique_id, customer_state AS state
FROM raw_customers;

-- Grain: one row per order line (order_id, order_item_id). Price and freight are per line.
CREATE OR REPLACE TABLE stg_order_items AS
SELECT order_id, order_item_id, product_id, seller_id,
       CAST(price AS DECIMAL(12, 2))         AS price,
       CAST(freight_value AS DECIMAL(12, 2)) AS freight
FROM raw_order_items;

CREATE OR REPLACE TABLE stg_products AS
SELECT p.product_id,
       COALESCE(t.product_category_name_english, p.product_category_name, 'uncategorized') AS category
FROM raw_products p
LEFT JOIN raw_category_translation t USING (product_category_name);

-- Grain: one row per payment instalment record. Aggregated to order grain before any join.
CREATE OR REPLACE TABLE stg_payments AS
SELECT order_id, payment_sequential, payment_type,
       CAST(payment_value AS DECIMAL(12, 2)) AS payment_value
FROM raw_payments;

-- Raw reviews contain up to 3 reviews per order and repeated review_ids.
-- Keep only the latest answered review per order so a join cannot fan out.
CREATE OR REPLACE TABLE stg_reviews AS
SELECT order_id, review_score
FROM (
    SELECT order_id, review_score,
           ROW_NUMBER() OVER (
               PARTITION BY order_id
               ORDER BY CAST(review_answer_timestamp AS TIMESTAMP) DESC, review_id
           ) AS rn
    FROM raw_reviews
) ranked
WHERE rn = 1;

CREATE OR REPLACE TABLE dim_state AS
SELECT * FROM (VALUES
    ('AC','N'),('AP','N'),('AM','N'),('PA','N'),('RO','N'),('RR','N'),('TO','N'),
    ('AL','NE'),('BA','NE'),('CE','NE'),('MA','NE'),('PB','NE'),('PE','NE'),('PI','NE'),('RN','NE'),('SE','NE'),
    ('DF','CO'),('GO','CO'),('MT','CO'),('MS','CO'),
    ('ES','SE'),('MG','SE'),('RJ','SE'),('SP','SE'),
    ('PR','S'),('RS','S'),('SC','S')
) AS v(state, region);
