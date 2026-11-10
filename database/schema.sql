CREATE TABLE products (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  category TEXT NOT NULL,
  colors JSONB NOT NULL DEFAULT '[]'::jsonb,
  image TEXT,
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  sale_price NUMERIC(12, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offline_sales (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE offline_sale_items (
  id BIGSERIAL PRIMARY KEY,
  sale_id BIGINT NOT NULL REFERENCES offline_sales(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  shortage INTEGER NOT NULL DEFAULT 0 CHECK (shortage >= 0),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
);
CREATE TABLE orders (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_location TEXT NOT NULL,
  customer_notes TEXT,
  products JSONB NOT NULL,
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  payment_method TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'Pending',
  status TEXT NOT NULL DEFAULT 'Pending',
  client_request_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  product_name TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL,
  client_request_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contact_messages (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX orders_created_at_index ON orders (created_at DESC);

CREATE SEQUENCE customer_order_number_seq START WITH 1;
ALTER TABLE orders ADD COLUMN order_number BIGINT;
CREATE UNIQUE INDEX orders_order_number_unique ON orders (order_number) WHERE order_number IS NOT NULL;
CREATE INDEX reviews_created_at_index ON reviews (created_at DESC);

CREATE TABLE store_profile (
  id SMALLINT PRIMARY KEY CHECK (id = 1),
  store_name TEXT NOT NULL DEFAULT '',
  store_address TEXT NOT NULL DEFAULT '',
  store_phone TEXT NOT NULL DEFAULT '',
  store_email TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE quotations (
  id BIGSERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  service_provider TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  items JSONB NOT NULL,
  store_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
  status TEXT NOT NULL DEFAULT 'Issued',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX quotations_created_at_index ON quotations (created_at DESC);

CREATE TABLE receipts (
  id BIGSERIAL PRIMARY KEY,
  source_type TEXT NOT NULL CHECK (source_type IN ('offline', 'online')),
  source_id BIGINT NOT NULL,
  service_provider TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_type, source_id)
);
CREATE INDEX receipts_created_at_index ON receipts (created_at DESC);


