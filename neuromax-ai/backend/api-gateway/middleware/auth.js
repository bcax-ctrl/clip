// Authentication: accept either a JWT (Authorization: Bearer ...) or an API key
// (x-api-key: nmx_live_...). Resolves the user and attaches { id, email, tier }
// to req.user for downstream rate limiting and usage tracking.
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export async function authenticate(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");
    if (apiKey) {
      const user = await resolveApiKey(apiKey);
      if (!user) return res.status(401).json({ error: "Invalid API key" });
      req.user = user;
      req.authMethod = "api_key";
      return next();
    }

    const authHeader = req.header("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing credentials" });

    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, tier: payload.tier };
    req.authMethod = "jwt";
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Authentication failed" });
  }
}

// API keys are stored as bcrypt hashes keyed by a short, indexed prefix so we
// only ever bcrypt-compare against candidates sharing that prefix.
async function resolveApiKey(fullKey) {
  const prefix = fullKey.slice(0, 12); // e.g. "nmx_live_ab1"
  const { rows } = await pool.query(
    `SELECT k.id, k.key_hash, u.id AS user_id, u.email, u.tier
       FROM api_keys k JOIN users u ON u.id = k.user_id
      WHERE k.key_prefix = $1 AND k.revoked = false`,
    [prefix]
  );
  for (const row of rows) {
    if (await bcrypt.compare(fullKey, row.key_hash)) {
      return { id: row.user_id, email: row.email, tier: row.tier };
    }
  }
  return null;
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, tier: user.tier },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}
