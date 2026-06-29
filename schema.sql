-- =============================================================
--  BuildTech E-Commerce — Schema PostgreSQL
--  Compatibil cu driverul Node.js `pg`
--  Rulează o singură dată pe o bază de date nouă:
--    psql -U <user> -d <dbname> -f schema.sql
-- =============================================================

-- Activează pgcrypto pentru gen_random_uuid() pe PostgreSQL < 13
-- (Pe PG 13+ gen_random_uuid() este integrat; această linie este inofensivă)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -------------------------------------------------------------
-- 1. UTILIZATORI
-- -------------------------------------------------------------
CREATE TABLE users (
  id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150)  NOT NULL,
  email         VARCHAR(254)  NOT NULL UNIQUE,
  password_hash TEXT          NOT NULL,
  role          VARCHAR(20)   NOT NULL DEFAULT 'customer'
                              CHECK (role IN ('customer', 'admin')),
  phone         VARCHAR(30),
  address       TEXT,
  city          VARCHAR(100),
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);

-- -------------------------------------------------------------
-- 2. PRODUSE
-- -------------------------------------------------------------
CREATE TABLE products (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(255)  NOT NULL,
  description     TEXT,
  price           NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  old_price       NUMERIC(10,2) CHECK (old_price IS NULL OR old_price >= 0),
  stock           INTEGER       NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category        VARCHAR(50)   NOT NULL
                  CHECK (category IN ('laptop', 'phone', 'tablet', 'accessories', 'desktop', 'components')),
  subcategory     VARCHAR(50)
                  CHECK (subcategory IS NULL OR subcategory IN (
                    'cpu', 'placa_baza', 'gpu', 'ram', 'sursa', 'carcasa', 'stocare'
                  )),
  status          VARCHAR(30)   NOT NULL DEFAULT 'bestseller'
                  CHECK (status IN ('bestseller', 'ai', 'reduceri')),
  -- Imagine principală (prima din image_gallery, duplicată aici pentru acces rapid)
  image_url       TEXT,
  -- Array de URL-uri imagini: ["https://…/img1.jpg", "https://…/img2.jpg"]
  image_gallery   JSONB         NOT NULL DEFAULT '[]',
  -- Specificații tehnice: [{"label":"RAM","value":"16 GB"},…]
  specifications  JSONB         NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category ON products (category);
CREATE INDEX idx_products_status   ON products (status);
-- Index GIN pentru interogări eficiente de conținut pe coloane JSONB
CREATE INDEX idx_products_specs   ON products USING GIN (specifications);
CREATE INDEX idx_products_gallery ON products USING GIN (image_gallery);

-- -------------------------------------------------------------
-- 3. COMENZI
-- -------------------------------------------------------------
CREATE TABLE orders (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID          REFERENCES users (id) ON DELETE SET NULL,
  status          VARCHAR(30)   NOT NULL DEFAULT 'Plasată'
                  CHECK (status IN ('Plasată', 'În procesare', 'Expediată', 'Livrată', 'Anulată', 'Retur')),
  total_amount    NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  shipping_cost   NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
  payment_method  VARCHAR(50)   NOT NULL DEFAULT 'cash',
  payment_status  VARCHAR(50)   NOT NULL DEFAULT 'pending',
  -- Snapshot livrare (salvat ca modificările adresei să nu afecteze comenzile vechi)
  shipping_name   VARCHAR(150),
  shipping_email  VARCHAR(254),
  shipping_phone  VARCHAR(30),
  shipping_address TEXT,
  shipping_city   VARCHAR(100),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user   ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);

-- -------------------------------------------------------------
-- 4. ARTICOLE COMANDĂ
-- -------------------------------------------------------------
CREATE TABLE order_items (
  id          SERIAL        PRIMARY KEY,
  order_id    UUID          NOT NULL REFERENCES orders   (id) ON DELETE CASCADE,
  product_id  UUID          NOT NULL REFERENCES products (id) ON DELETE RESTRICT,
  quantity    INTEGER       NOT NULL CHECK (quantity > 0),
  unit_price  NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0)
  -- unit_price este un snapshot al prețului la momentul cumpărării;
  -- intenționat NU este derivat din FK, ca schimbările de preț să nu modifice istoricul
);

CREATE INDEX idx_order_items_order   ON order_items (order_id);
CREATE INDEX idx_order_items_product ON order_items (product_id);

-- -------------------------------------------------------------
-- 5. RECENZII
-- -------------------------------------------------------------
CREATE TABLE reviews (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  UUID          NOT NULL REFERENCES products (id) ON DELETE CASCADE,
  user_id     UUID          NOT NULL REFERENCES users    (id) ON DELETE CASCADE,
  rating      SMALLINT      NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  -- O recenzie per utilizator per produs
  CONSTRAINT uq_review_user_product UNIQUE (user_id, product_id)
);

CREATE INDEX idx_reviews_product ON reviews (product_id);
CREATE INDEX idx_reviews_user    ON reviews (user_id);

-- =============================================================
--  Vizualizări utile
-- =============================================================

-- =============================================================
--  Migrare: adaugă coloane JSONB la tabelul products existent
--  Rulează DOAR dacă ai aplicat deja schema originală.
--  Poate fi omis pe o bază de date nouă (coloanele sunt definite mai sus).
-- =============================================================
-- ALTER TABLE products
--   ADD COLUMN IF NOT EXISTS image_gallery  JSONB NOT NULL DEFAULT '[]',
--   ADD COLUMN IF NOT EXISTS specifications JSONB NOT NULL DEFAULT '[]';
--
-- -- Migrează rândurile existente din product_specs în coloana JSONB
-- UPDATE products p SET specifications = (
--   SELECT COALESCE(json_agg(json_build_object('label', s.label, 'value', s.value)
--                            ORDER BY s.sort_order), '[]')
--   FROM product_specs s WHERE s.product_id = p.id
-- );
--
-- -- Șterge tabelul redundant după migrarea datelor
-- DROP TABLE IF EXISTS product_specs;
--
-- CREATE INDEX IF NOT EXISTS idx_products_specs   ON products USING GIN (specifications);
-- CREATE INDEX IF NOT EXISTS idx_products_gallery ON products USING GIN (image_gallery);

-- =============================================================
--  Migrare: checkout fără cont — user_id opțional pe orders
--  Rulează DOAR dacă ai aplicat deja schema originală.
-- =============================================================
-- ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL;
-- ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;
-- ALTER TABLE orders
--   ADD CONSTRAINT orders_user_id_fkey
--   FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL;

-- =============================================================
--  Migrare: coloane plată comandă (cash / Stripe)
--  Rulează DOAR dacă ai aplicat deja schema originală.
-- =============================================================
-- ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) NOT NULL DEFAULT 'pending';
-- ALTER TABLE orders ALTER COLUMN payment_method SET DEFAULT 'cash';
-- UPDATE orders SET payment_method = 'cash' WHERE payment_method IS NULL;
-- UPDATE orders SET payment_status = 'pending' WHERE payment_status IS NULL;
-- ALTER TABLE orders ALTER COLUMN payment_method SET NOT NULL;

-- =============================================================
--  Migrare: old_price produs (afișare reducere)
--  Rulează DOAR dacă ai aplicat deja schema originală.
-- =============================================================
-- ALTER TABLE products ADD COLUMN IF NOT EXISTS old_price NUMERIC(10, 2) NULL;
-- ALTER TABLE products ADD CONSTRAINT products_old_price_nonneg
--   CHECK (old_price IS NULL OR old_price >= 0);

-- =============================================================
--  Vizualizări utile
-- =============================================================

-- Rating mediu + număr recenzii per produs (util pentru interogări ProductCard)
CREATE OR REPLACE VIEW product_ratings AS
SELECT
  p.id                                      AS product_id,
  p.name                                    AS product_name,
  COUNT(r.id)                               AS review_count,
  ROUND(AVG(r.rating)::NUMERIC, 2)          AS avg_rating
FROM products p
LEFT JOIN reviews r ON r.product_id = p.id
GROUP BY p.id, p.name;
