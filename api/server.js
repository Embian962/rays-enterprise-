import "dotenv/config";
import cors from "cors";
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

app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || true }));
app.use(express.json({ limit: "8mb" }));

const asyncRoute = handler => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const isAdmin = (req, res, next) => {
  if (!process.env.ADMIN_API_KEY || req.get("x-admin-key") !== process.env.ADMIN_API_KEY) {
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
