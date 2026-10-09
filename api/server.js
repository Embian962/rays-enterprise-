import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import pg from "pg";
import sharp from "sharp";

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 3000;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env for local development.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
});

// Older Supabase setups may already have a `products` table but not the
// columns added for the shared catalog. Keep this migration idempotent so a
// Render deploy repairs that incomplete table without requiring dashboard
// access. Existing columns and product data are left untouched.
const ensureProductSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
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
    )
  `);
  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      ADD COLUMN IF NOT EXISTS colors JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS image TEXT,
      ADD COLUMN IF NOT EXISTS images JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS sale_price NUMERIC(12, 2),
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
};

const ensureSharedDataSchema = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      customer_email TEXT,
      customer_phone TEXT NOT NULL,
      customer_location TEXT NOT NULL,
      customer_notes TEXT,
      products JSONB NOT NULL,
      total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
      payment_method TEXT NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'Pending',
      status TEXT NOT NULL DEFAULT 'Pending',
      client_request_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_email TEXT");
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ");
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_request_id TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS orders_client_request_id_unique ON orders (client_request_id) WHERE client_request_id IS NOT NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      product_name TEXT,
      rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT NOT NULL,
      client_request_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )
  `);
  await pool.query("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS client_request_id TEXT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS reviews_client_request_id_unique ON reviews (client_request_id) WHERE client_request_id IS NOT NULL");
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS orders_created_at_index ON orders (created_at DESC)");
  await pool.query("CREATE SEQUENCE IF NOT EXISTS customer_order_number_seq START WITH 1");
  await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number BIGINT");
  await pool.query("CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique ON orders (order_number) WHERE order_number IS NOT NULL");
  await pool.query("CREATE INDEX IF NOT EXISTS reviews_created_at_index ON reviews (created_at DESC)");  await pool.query(`
    CREATE TABLE IF NOT EXISTS offline_sales (
      id BIGSERIAL PRIMARY KEY,
      customer_name TEXT,
      customer_phone TEXT,
      notes TEXT,
      total NUMERIC(12, 2) NOT NULL CHECK (total >= 0),
      payment_method TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS offline_sale_items (
      id BIGSERIAL PRIMARY KEY,
      sale_id BIGINT NOT NULL REFERENCES offline_sales(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL,
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL CHECK (quantity > 0),
      unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
      shortage INTEGER NOT NULL DEFAULT 0 CHECK (shortage >= 0),
      line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0)
    )
  `);
  await pool.query("CREATE INDEX IF NOT EXISTS offline_sales_created_at_index ON offline_sales (created_at DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS offline_sale_items_sale_id_index ON offline_sale_items (sale_id)");
};
const allowedOrigins = new Set([
  ...(process.env.FRONTEND_ORIGIN || "").split(",").map(origin => origin.trim()).filter(Boolean),
  "http://localhost:5500",
  "http://127.0.0.1:5500"
]);
// Allow CORS including Authorization header so the live storefront can
// call the API directly. This is permissive — if you prefer tighter
// restrictions, set `FRONTEND_ORIGIN` in the environment to the exact
// origin(s) and restore the previous check.
app.use(cors({
  origin(origin, callback) {
    // Allow requests without an Origin (server-to-server), or allow any
    // origin so the deployed storefront can reach the API. If you need to
    // restrict origins, replace `true` with a check against `allowedOrigins`.
    callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Key", "X-Admin-Token"],
  exposedHeaders: ["Authorization"]
}));
// Product photos are sent from the admin page as base64 data URLs. Base64 adds
// roughly one third to the original file size, so the old 8 MB JSON limit
// rejected ordinary phone photos before the product route or database query
// could run.
app.use(express.json({ limit: "25mb" }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

const formatBusinessDate = value => new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  dateStyle: "medium",
  timeStyle: "short"
}).format(new Date(value));
const serializeOrder = order => ({
  id: order.id,
  orderNumber: order.order_number ? "No." + String(order.order_number).padStart(3, "0") : "No." + String(order.id).padStart(3, "0"),
  customerName: order.customer_name,
  customerEmail: order.customer_email || "",
  customerPhone: order.customer_phone,
  customerLocation: order.customer_location,
  customerNotes: order.customer_notes || "",
  products: order.products,
  total: Number(order.total),
  paymentMethod: order.payment_method,
  paymentStatus: order.payment_status,
  status: order.status,
  date: formatBusinessDate(order.created_at),
  createdAt: order.created_at,
  completedAt: order.completed_at || null
});

const serializeReview = review => ({
  id: review.id,
  name: review.customer_name,
  product: review.product_name || "",
  rating: Number(review.rating),
  comment: review.comment,
  date: formatBusinessDate(review.created_at),
  createdAt: review.created_at
});
const encodeTokenPart = value => Buffer.from(JSON.stringify(value)).toString("base64url");
const signToken = value => crypto.createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url");
const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left || "");
  const rightBuffer = Buffer.from(right || "");
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
const createAdminToken = () => {
  const header = encodeTokenPart({ alg: "HS256", typ: "JWT" });
  const payload = encodeTokenPart({ role: "admin", exp: Math.floor(Date.now() / 1000) + 60 * 60 * 8 });
  const unsignedToken = `${header}.${payload}`;
  return `${unsignedToken}.${signToken(unsignedToken)}`;
};
const hasValidAdminToken = token => {
  if (!process.env.ADMIN_SESSION_SECRET || !token) return false;
  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature || !safeEqual(signature, signToken(`${header}.${payload}`))) return false;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return claims.role === "admin" && Number(claims.exp) > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
};
const isAdmin = (req, res, next) => {
  const authHeader = req.get("authorization");
  const token = String(authHeader || req.get("x-admin-token") || "").replace(/^Bearer\s+/i, "");
  const xAdminKey = req.get("x-admin-key");
  const legacyApiKeyIsValid = process.env.ADMIN_API_KEY && safeEqual(String(xAdminKey || ""), process.env.ADMIN_API_KEY);

  if (process.env.DEBUG_ADMIN_LOGIN === "true") {
    try {
      console.debug("isAdmin check:", {
        authHeaderPresent: !!authHeader,
        authHeaderLength: authHeader ? authHeader.length : 0,
        tokenLength: token ? token.length : 0,
        xAdminKeyPresent: !!xAdminKey,
        xAdminKeyLength: xAdminKey ? String(xAdminKey).length : 0,
        expectedApiKeyPresent: !!process.env.ADMIN_API_KEY,
        legacyApiKeyIsValid
      });
    } catch (e) {
      /* ignore logging errors */
    }
  }

  if (!hasValidAdminToken(token) && !legacyApiKeyIsValid) {
    return res.status(401).json({ error: "Admin authorization is required." });
  }

  next();
};

// Render hosts the API, while Vercel hosts the storefront. This makes a visit
// to the Render URL useful instead of returning Express's default 404 page.
app.get("/", (_req, res) => {
  res.json({
    service: "Ray's Enterprise API",
    status: "ok",
    health: "/health",
    products: "/api/products"
  });
});

app.get("/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  const suppliedUsername = String(username || "").trim();
  const suppliedPassword = String(password || "").trim();

  if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) {
    return res.status(503).json({ error: "Admin sign-in is not configured yet." });
  }

  const expectedUsername = String(process.env.ADMIN_USERNAME);
  const expectedPassword = String(process.env.ADMIN_PASSWORD);

  const usernameMatches = safeEqual(suppliedUsername, expectedUsername);
  const passwordMatches = safeEqual(suppliedPassword, expectedPassword);

  if (!usernameMatches || !passwordMatches) {
    if (process.env.DEBUG_ADMIN_LOGIN === "true") {
      console.warn("Admin login failed:", {
        suppliedUsernameLength: suppliedUsername.length,
        suppliedPasswordLength: suppliedPassword.length,
        expectedUsernameLength: expectedUsername.length,
        expectedPasswordLength: expectedPassword.length,
        usernameMatches,
        passwordMatches
      });
    }
    return res.status(401).json({ error: "Incorrect username or password." });
  }

  res.json({ token: createAdminToken(), expiresIn: 60 * 60 * 8 });
});

const normalizeProductImages = (images, image, imageUrl) => {
  const existing = Array.isArray(images) ? images : [];
  const legacy = imageUrl || image;
  return [...new Set([legacy, ...existing].filter(value => typeof value === "string" && value.trim()))];
};

const PRODUCT_IMAGE_BUCKET = "product-images";
const isDataImage = value => typeof value === "string" && value.startsWith("data:");
const hasInlineProductImages = "COALESCE(image, '') LIKE 'data:%' OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(images) = 'array' THEN images ELSE '[]'::jsonb END) AS image_value(value) WHERE image_value.value LIKE 'data:%')";

async function uploadProductImage(value, productId = "new", stableName = "") {
  if (!isDataImage(value)) return value;

  const match = value.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\r\n]+)$/i);
  if (!match) {
    const error = new Error("A product image has an unsupported data format.");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    const error = new Error("Product image storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the API service.");
    error.status = 503;
    error.expose = true;
    throw error;
  }

  const input = Buffer.from(match[2].replace(/\s/g, ""), "base64");
  if (!input.length || input.length > 20 * 1024 * 1024) {
    const error = new Error("Each product image must be smaller than 20 MB.");
    error.status = 413;
    error.expose = true;
    throw error;
  }

  let optimized;
  try {
    optimized = await sharp(input, { limitInputPixels: 50_000_000 })
      .rotate()
      .resize({ width: 1400, height: 1400, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    const error = new Error("This product image could not be processed. Try a JPEG, PNG, WebP, AVIF, GIF, or TIFF image.");
    error.status = 400;
    error.expose = true;
    throw error;
  }
  const safeProductId = String(productId).replace(/[^a-z0-9_-]/gi, "") || "new";
  const safeFileName = String(stableName).replace(/[^a-z0-9_-]/gi, "");
  const objectPath = `products/${safeProductId}/${safeFileName || crypto.randomUUID()}.webp`;
  const upload = await fetch(`${supabaseUrl}/storage/v1/object/${PRODUCT_IMAGE_BUCKET}/${objectPath}`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-upsert": stableName ? "true" : "false"
    },
    body: optimized
  });
  if (!upload.ok) {
    const message = await upload.text();
    const error = new Error(`Could not store product image for product ${productId}: ${message.slice(0, 300)}`);
    error.status = 502;
    error.expose = true;
    throw error;
  }

  return `${supabaseUrl}/storage/v1/object/public/${PRODUCT_IMAGE_BUCKET}/${objectPath}`;
}

function publicProduct(product) {
  const images = normalizeProductImages(product.images, product.image, product.image_url);
  const primary = [product.image, product.image_url, ...images].find(image => typeof image === "string" && image.trim()) || "";
  const { image_url: _legacyImageUrl, ...publicFields } = product;
  return { ...publicFields, image: primary, images };
}

app.get("/api/products", asyncRoute(async (req, res) => {
  if (String(req.query.summary || "") === "1") {
    const { rows } = await pool.query("SELECT id, name, price, stock, category, colors, featured, sale_price, created_at, updated_at, (COALESCE(jsonb_array_length(images), 0) > 0 OR COALESCE(image, '') <> '') AS has_image FROM products ORDER BY created_at DESC");
    return res.json(rows.map(product => ({ ...product, images: [], image: "", has_image: Boolean(product.has_image) })));
  }
  const { rows } = await pool.query(`
    SELECT id, name, price, stock, category, colors, featured, sale_price, created_at, updated_at,
      image, images
    FROM products ORDER BY created_at DESC
  `);
  const products = rows.map(publicProduct);
  if (String(req.query.catalog || "") === "1") {
    const catalogProducts = products.map(product => {
      const images = product.images.map((image, index) => {
        if (!image.startsWith("data:")) return image;
        return "/api/products/" + encodeURIComponent(product.id) + "/images/" + index + "?v=" + encodeURIComponent(product.updated_at || "");
      });
      const primary = product.image && product.image.startsWith("data:")
        ? "/api/products/" + encodeURIComponent(product.id) + "/images/0?v=" + encodeURIComponent(product.updated_at || "")
        : images[0] || product.image || "";
      return { ...product, image: primary, images };
    });
    return res.set("Cache-Control", "no-store").json(catalogProducts);
  }
  res.json(products);
}));

// The customer catalog receives lightweight image URLs. Legacy data URLs stay
// in the database and are streamed only when an <img> requests the image.
app.get("/api/products/:id/images/:index", asyncRoute(async (req, res) => {
  const index = Number.parseInt(req.params.index, 10);
  if (!Number.isInteger(index) || index < 0) return res.status(404).end();
  const { rows } = await pool.query("SELECT * FROM products WHERE id=$1", [req.params.id]);
  const product = rows[0];
  if (!product) return res.status(404).end();
  const images = normalizeProductImages(product.images, product.image, product.image_url);
  const image = images[index];
  if (!image) return res.status(404).end();

  const dataUrl = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]*)$/);
  if (dataUrl) {
    const body = Buffer.from(dataUrl[2], "base64");
    res.set({
      "Content-Type": dataUrl[1],
      "Content-Length": String(body.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "Last-Modified": new Date(product.updated_at || Date.now()).toUTCString()
    });
    return res.send(body);
  }

  if (!/^https?:\/\//i.test(image)) return res.status(404).end();
  return res.redirect(302, image);
}));


app.post("/api/products", isAdmin, asyncRoute(async (req, res) => {
  const { name, price, stock, category, colors = [], image, images = [], featured = false, salePrice = null } = req.body;
  const imageSources = normalizeProductImages(images, image);
  const productImages = [];
  for (const source of imageSources) productImages.push(await uploadProductImage(source));
  const primarySource = image || imageSources[0] || "";
  const primaryIndex = imageSources.indexOf(primarySource);
  const storedPrimaryImage = primaryIndex >= 0 ? productImages[primaryIndex] : productImages[0] || "";
  const { rows } = await pool.query(
    "INSERT INTO products (name, price, stock, category, colors, image, images, featured, sale_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
    [name, price, stock, category, JSON.stringify(colors), storedPrimaryImage, JSON.stringify(productImages), featured, salePrice]
  );
  res.status(201).json(publicProduct(rows[0]));
}));

app.put("/api/products/:id", isAdmin, asyncRoute(async (req, res) => {
  const { name, price, stock, category, colors = [], image, images = [], featured = false, salePrice = null } = req.body;
  const imageSources = normalizeProductImages(images, image);
  const productImages = [];
  for (const source of imageSources) productImages.push(await uploadProductImage(source, req.params.id));
  const primarySource = image || imageSources[0] || "";
  const primaryIndex = imageSources.indexOf(primarySource);
  const primaryImage = primaryIndex >= 0 ? productImages[primaryIndex] : productImages[0] || "";
  const { rows } = await pool.query(
    "UPDATE products SET name=$1, price=$2, stock=$3, category=$4, colors=$5, image=$6, images=$7, featured=$8, sale_price=$9, updated_at=NOW() WHERE id=$10 RETURNING *",
    [name, price, stock, category, JSON.stringify(colors), primaryImage, JSON.stringify(productImages), featured, salePrice, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json(publicProduct(rows[0]));
}));

app.post("/api/admin/migrate-images", isAdmin, asyncRoute(async (req, res) => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
  if (!serviceKey || !supabaseUrl) return res.status(503).json({ error: "Supabase Storage migration is not configured." });
  const requestedLimit = Number(req.body?.limit);
  const limit = Math.min(Math.max(Number.isFinite(requestedLimit) ? Math.floor(requestedLimit) : 10, 1), 25);
  const { rows } = await pool.query(`SELECT id FROM products WHERE ${hasInlineProductImages} ORDER BY id LIMIT $1`, [limit]);
  let migratedProducts = 0;
  let migratedImages = 0;
  for (const { id } of rows) {
    const result = await pool.query("SELECT id, image, images FROM products WHERE id=$1", [id]);
    const product = result.rows[0];
    if (!product) continue;
    const imageSources = normalizeProductImages(product.images, product.image, product.image_url);
    const migratedGallery = [];
    for (let index = 0; index < imageSources.length; index++) {
      const source = imageSources[index];
      const stored = await uploadProductImage(source, product.id, isDataImage(source) ? `legacy-${index + 1}` : "");
      if (isDataImage(source)) migratedImages++;
      migratedGallery.push(stored);
    }
    const primarySource = product.image || product.image_url || imageSources[0] || "";
    const primaryIndex = imageSources.indexOf(primarySource);
    const primaryImage = primaryIndex >= 0 ? migratedGallery[primaryIndex] : await uploadProductImage(primarySource, product.id);
    const finalImages = [...new Set([primaryImage, ...migratedGallery].filter(Boolean))];
    await pool.query("UPDATE products SET image=$1, images=$2, updated_at=NOW() WHERE id=$3", [primaryImage || finalImages[0] || "", JSON.stringify(finalImages), product.id]);
    migratedProducts++;
  }
  const remaining = await pool.query(`SELECT COUNT(*)::int AS count FROM products WHERE ${hasInlineProductImages}`);
  res.json({ migratedProducts, migratedImages, remainingProducts: remaining.rows[0].count });
}));
app.delete("/api/products/:id", isAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Product not found." });
  res.status(204).end();
}));

// Customers can refresh only an order that matches the phone number used when
// it was placed. This keeps order status available without exposing all orders.
app.get("/api/offline-sales", isAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query(`SELECT s.*, COALESCE(json_agg(i ORDER BY i.id) FILTER (WHERE i.id IS NOT NULL), '[]') AS items FROM offline_sales s LEFT JOIN offline_sale_items i ON i.sale_id=s.id GROUP BY s.id ORDER BY s.created_at DESC`);
  res.json(rows);
}));

app.post("/api/offline-sales", isAdmin, asyncRoute(async (req, res) => {
  const { customerName = "", customerPhone = "", notes = "", paymentMethod = "Cash", items = [] } = req.body || {};
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Add at least one product to the sale." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const normalized = [];
    for (const item of items) {
      const productId = Number(item.productId || item.id);
      const quantity = Math.floor(Number(item.quantity));
      if (!Number.isInteger(productId) || quantity < 1) throw new Error("Each sale item needs a valid product and quantity.");
      const result = await client.query("SELECT id, name, price, stock FROM products WHERE id=$1 FOR UPDATE", [productId]);
      if (!result.rows[0]) throw new Error(`Product ${productId} was not found.`);
      const product = result.rows[0];
      const shortage = Math.max(quantity - Number(product.stock || 0), 0);
      const decrement = Math.min(quantity, Number(product.stock || 0));
      if (decrement) await client.query("UPDATE products SET stock=stock-$1, updated_at=NOW() WHERE id=$2", [decrement, productId]);
      const unitPrice = Number(item.unitPrice ?? product.price) || 0;
      normalized.push({ productId, productName: product.name, quantity, unitPrice, shortage, lineTotal: quantity * unitPrice });
    }
    const total = normalized.reduce((sum, item) => sum + item.lineTotal, 0);
    const sale = await client.query("INSERT INTO offline_sales (customer_name, customer_phone, notes, total, payment_method) VALUES ($1,$2,$3,$4,$5) RETURNING *", [String(customerName).trim(), String(customerPhone).trim(), String(notes).trim(), total, String(paymentMethod).trim() || "Cash"]);
    for (const item of normalized) await client.query("INSERT INTO offline_sale_items (sale_id, product_id, product_name, quantity, unit_price, shortage, line_total) VALUES ($1,$2,$3,$4,$5,$6,$7)", [sale.rows[0].id, item.productId, item.productName, item.quantity, item.unitPrice, item.shortage, item.lineTotal]);
    await client.query("COMMIT");
    res.status(201).json({ ...sale.rows[0], items: normalized });
  } catch (error) { await client.query("ROLLBACK"); res.status(409).json({ error: error.message }); }
  finally { client.release(); }
}));
app.post("/api/orders/track", asyncRoute(async (req, res) => {
  const { orderId, customerPhone } = req.body || {};
  if (!orderId || !customerPhone) {
    return res.status(400).json({ error: "Order number and phone number are required." });
  }
  const { rows } = await pool.query(
    "SELECT * FROM orders WHERE id=$1 AND customer_phone=$2",
    [orderId, String(customerPhone).trim()]
  );
  if (!rows[0]) return res.status(404).json({ error: "Order not found." });
  res.json(serializeOrder(rows[0]));
}));
const getCustomerEmailFromSession = async req => {
  const authorization = String(req.headers.authorization || "");
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const supabaseUrl = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!token || !supabaseUrl || !anonKey) return null;
  const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return String(user.email || "").trim().toLowerCase() || null;
};

app.post("/api/orders/mine", asyncRoute(async (req, res) => {
  const email = await getCustomerEmailFromSession(req);
  if (!email) return res.status(401).json({ error: "Please sign in to view your orders." });
  const { rows } = await pool.query("SELECT * FROM orders WHERE LOWER(customer_email)=$1 ORDER BY created_at DESC", [email]);
  res.json(rows.map(serializeOrder));
}));
app.get("/api/orders", isAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(rows.map(serializeOrder));
}));

app.post("/api/orders", asyncRoute(async (req, res) => {
  const { customerName, customerEmail = "", customerPhone, customerLocation, customerNotes = "", products, total, paymentMethod, paymentStatus = "Pending", clientRequestId } = req.body;
  if (!Array.isArray(products) || !products.length) return res.status(400).json({ error: "An order requires at least one product." });
  const requestId = String(clientRequestId || "").trim() || null;
  if (requestId) {
    const { rows } = await pool.query("SELECT * FROM orders WHERE client_request_id=$1", [requestId]);
    if (rows[0]) return res.json(serializeOrder(rows[0]));
  }
  const duplicate = await pool.query(
    "SELECT * FROM orders WHERE customer_phone=$1 AND total=$2 AND products=$3::jsonb AND created_at > NOW() - INTERVAL '10 minutes' ORDER BY created_at DESC LIMIT 1",
    [String(customerPhone || "").trim(), total, JSON.stringify(products)]
  );
  if (duplicate.rows[0]) return res.json(serializeOrder(duplicate.rows[0]));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of products) {
      const update = await client.query("UPDATE products SET stock = stock - $1, updated_at=NOW() WHERE id=$2 AND stock >= $1 RETURNING id", [item.quantity, item.id]);
      if (!update.rowCount) throw new Error(`Insufficient stock for product ${item.id}.`);
    }
    const { rows } = await client.query(
      "INSERT INTO orders (customer_name, customer_email, customer_phone, customer_location, customer_notes, products, total, payment_method, payment_status, client_request_id, order_number) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,nextval('customer_order_number_seq')) RETURNING *",
      [customerName, String(customerEmail || "").trim().toLowerCase() || null, customerPhone, customerLocation, customerNotes, JSON.stringify(products), total, paymentMethod, paymentStatus, requestId]
    );
    await client.query("COMMIT");
    res.status(201).json(serializeOrder(rows[0]));
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505" && requestId) {
      const { rows } = await pool.query("SELECT * FROM orders WHERE client_request_id=$1", [requestId]);
      if (rows[0]) return res.json(serializeOrder(rows[0]));
    }
    res.status(409).json({ error: error.message });
  } finally {
    client.release();
  }
}));

app.patch("/api/orders/:id", isAdmin, asyncRoute(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const { rows } = await pool.query(
    "UPDATE orders SET status=COALESCE($1,status), payment_status=COALESCE($2,payment_status), completed_at=CASE WHEN $1 = 'Completed' THEN COALESCE(completed_at, NOW()) WHEN $1 IS NOT NULL AND $1 <> 'Completed' THEN NULL ELSE completed_at END WHERE id=$3 RETURNING *",
    [status, paymentStatus, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Order not found." });
  res.json(serializeOrder(rows[0]));
}));

app.delete("/api/orders/:id", isAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query("DELETE FROM orders WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Order not found." });
  res.status(204).end();
}));
app.get("/api/reviews", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
  res.json(rows.map(serializeReview));
}));

app.post("/api/reviews", asyncRoute(async (req, res) => {
  const { customerName, productName = null, rating, comment, clientRequestId } = req.body;
  const requestId = String(clientRequestId || "").trim() || null;
  if (requestId) {
    const { rows } = await pool.query("SELECT * FROM reviews WHERE client_request_id=$1", [requestId]);
    if (rows[0]) return res.json(serializeReview(rows[0]));
  }
  const duplicate = await pool.query(
    "SELECT * FROM reviews WHERE customer_name=$1 AND COALESCE(product_name, '')=COALESCE($2, '') AND rating=$3 AND comment=$4 AND created_at > NOW() - INTERVAL '10 minutes' ORDER BY created_at DESC LIMIT 1",
    [customerName, productName, rating, comment]
  );
  if (duplicate.rows[0]) return res.json(serializeReview(duplicate.rows[0]));
  let rows;
  try {
    ({ rows } = await pool.query("INSERT INTO reviews (customer_name, product_name, rating, comment, client_request_id) VALUES ($1,$2,$3,$4,$5) RETURNING *", [customerName, productName, rating, comment, requestId]));
  } catch (error) {
    if (error.code === "23505" && requestId) {
      const existing = await pool.query("SELECT * FROM reviews WHERE client_request_id=$1", [requestId]);
      if (existing.rows[0]) return res.json(serializeReview(existing.rows[0]));
    }
    throw error;
  }
  res.status(201).json(serializeReview(rows[0]));
}));

app.delete("/api/reviews/:id", isAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query("DELETE FROM reviews WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Feedback not found." });
  res.status(204).end();
}));
app.get("/api/contact-messages", isAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM contact_messages ORDER BY created_at DESC");
  res.json(rows);
}));

app.post("/api/contact-messages", asyncRoute(async (req, res) => {
  const { customerName, message } = req.body;
  const { rows } = await pool.query("INSERT INTO contact_messages (customer_name, message) VALUES ($1,$2) RETURNING *", [customerName, message]);
  res.status(201).json(rows[0]);
}));

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error?.type === "entity.too.large" || error?.status === 413) {
    return res.status(413).json({
      error: "The request is too large. Choose smaller product images and try again."
    });
  }
  const status = Number(error?.status);
  const responseStatus = status >= 400 && status < 600 ? status : 500;
  const message = error?.expose ? error.message : "The server could not complete that request.";
  res.status(responseStatus).json({ error: message });
});

await ensureProductSchema();
await ensureSharedDataSchema();
app.listen(port, () => console.log(`Ray's Enterprise API listening on port ${port}`));










