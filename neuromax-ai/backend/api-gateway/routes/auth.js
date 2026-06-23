// Auth + API-key management routes.
import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { pool } from "../db.js";
import { authenticate, signToken } from "../middleware/auth.js";

const router = Router();

// POST /api/auth/register
router.post("/register", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) {
    return res.status(400).json({ error: "Email and 8+ char password required" });
  }
  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2)
       RETURNING id, email, tier`,
      [email.toLowerCase(), hash]
    );
    const user = rows[0];
    return res.status(201).json({ token: signToken(user), user });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    console.error("register error:", err.message);
    return res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  try {
    const { rows } = await pool.query(
      `SELECT id, email, tier, password_hash FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const user = { id: row.id, email: row.email, tier: row.tier };
    return res.json({ token: signToken(user), user });
  } catch (err) {
    console.error("login error:", err.message);
    return res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", authenticate, (req, res) => res.json({ user: req.user }));

// POST /api/auth/keys  — mint a new NeuroAPI key (shown once, in full).
router.post("/keys", authenticate, async (req, res) => {
  const label = (req.body && req.body.label) || "default";
  const fullKey = `nmx_live_${crypto.randomBytes(24).toString("hex")}`;
  const prefix = fullKey.slice(0, 12);
  const hash = await bcrypt.hash(fullKey, 10);
  try {
    const { rows } = await pool.query(
      `INSERT INTO api_keys (user_id, key_prefix, key_hash, label)
       VALUES ($1, $2, $3, $4) RETURNING id, key_prefix, label, created_at`,
      [req.user.id, prefix, hash, label]
    );
    // The full key is returned exactly once — it is never stored in plaintext.
    return res.status(201).json({ api_key: fullKey, ...rows[0] });
  } catch (err) {
    console.error("key mint error:", err.message);
    return res.status(500).json({ error: "Could not create API key" });
  }
});

// GET /api/auth/keys — list (prefixes only).
router.get("/keys", authenticate, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, key_prefix, label, revoked, created_at
       FROM api_keys WHERE user_id = $1 ORDER BY created_at DESC`,
    [req.user.id]
  );
  return res.json({ keys: rows });
});

// DELETE /api/auth/keys/:id — revoke.
router.delete("/keys/:id", authenticate, async (req, res) => {
  await pool.query(
    `UPDATE api_keys SET revoked = true WHERE id = $1 AND user_id = $2`,
    [req.params.id, req.user.id]
  );
  return res.json({ revoked: true });
});

export default router;
