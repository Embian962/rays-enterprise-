import "dotenv/config";
import cors from "cors";
import crypto from "crypto";
import express from "express";
import pg from "pg";

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
app.use(express.json({ limit: "8mb" }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

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

app.get("/api/products", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM products ORDER BY created_at DESC");
  res.json(rows);
}));

app.post("/api/products", isAdmin, asyncRoute(async (req, res) => {
  const { name, price, stock, category, colors = [], image, featured = false, salePrice = null } = req.body;
  const { rows } = await pool.query(
    "INSERT INTO products (name, price, stock, category, colors, image, featured, sale_price) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
    [name, price, stock, category, JSON.stringify(colors), image, featured, salePrice]
  );
  res.status(201).json(rows[0]);
}));

app.put("/api/products/:id", isAdmin, asyncRoute(async (req, res) => {
  const { name, price, stock, category, colors = [], image, featured = false, salePrice = null } = req.body;
  const { rows } = await pool.query(
    "UPDATE products SET name=$1, price=$2, stock=$3, category=$4, colors=$5, image=$6, featured=$7, sale_price=$8, updated_at=NOW() WHERE id=$9 RETURNING *",
    [name, price, stock, category, JSON.stringify(colors), image, featured, salePrice, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Product not found." });
  res.json(rows[0]);
}));

app.delete("/api/products/:id", isAdmin, asyncRoute(async (req, res) => {
  const result = await pool.query("DELETE FROM products WHERE id=$1", [req.params.id]);
  if (!result.rowCount) return res.status(404).json({ error: "Product not found." });
  res.status(204).end();
}));

app.get("/api/orders", isAdmin, asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM orders ORDER BY created_at DESC");
  res.json(rows);
}));

app.post("/api/orders", asyncRoute(async (req, res) => {
  const { customerName, customerPhone, customerLocation, customerNotes = "", products, total, paymentMethod, paymentStatus = "Pending" } = req.body;
  if (!Array.isArray(products) || !products.length) return res.status(400).json({ error: "An order requires at least one product." });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const item of products) {
      const update = await client.query("UPDATE products SET stock = stock - $1, updated_at=NOW() WHERE id=$2 AND stock >= $1 RETURNING id", [item.quantity, item.id]);
      if (!update.rowCount) throw new Error(`Insufficient stock for product ${item.id}.`);
    }
    const { rows } = await client.query(
      "INSERT INTO orders (customer_name, customer_phone, customer_location, customer_notes, products, total, payment_method, payment_status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",
      [customerName, customerPhone, customerLocation, customerNotes, JSON.stringify(products), total, paymentMethod, paymentStatus]
    );
    await client.query("COMMIT");
    res.status(201).json(rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    res.status(409).json({ error: error.message });
  } finally {
    client.release();
  }
}));

app.patch("/api/orders/:id", isAdmin, asyncRoute(async (req, res) => {
  const { status, paymentStatus } = req.body;
  const { rows } = await pool.query(
    "UPDATE orders SET status=COALESCE($1,status), payment_status=COALESCE($2,payment_status) WHERE id=$3 RETURNING *",
    [status, paymentStatus, req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: "Order not found." });
  res.json(rows[0]);
}));

app.get("/api/reviews", asyncRoute(async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM reviews ORDER BY created_at DESC");
  res.json(rows);
}));

app.post("/api/reviews", asyncRoute(async (req, res) => {
  const { customerName, productName = null, rating, comment } = req.body;
  const { rows } = await pool.query("INSERT INTO reviews (customer_name, product_name, rating, comment) VALUES ($1,$2,$3,$4) RETURNING *", [customerName, productName, rating, comment]);
  res.status(201).json(rows[0]);
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
  res.status(500).json({ error: "The server could not complete that request." });
});

app.listen(port, () => console.log(`Ray's Enterprise API listening on port ${port}`));
