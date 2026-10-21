const path = require('path');
const { Pool } = require('pg');

// Ensure environment variables are loaded from server/.env
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();

let activeUrl = (process.env.DATABASE_URL || '').trim();

const onHost = Boolean(process.env.RENDER || process.env.VERCEL);
const whereToSet = onHost
  ? 'your hosting dashboard (Render: Service -> Environment -> DATABASE_URL)'
  : 'server/.env';

if (!activeUrl) {
  console.error('❌ ERROR: DATABASE_URL is not defined in environment variables.');
  console.error(`👉 Please configure DATABASE_URL in ${whereToSet}.`);
  process.exit(1);
}

// The template in .env.example is not a real database; fail clearly instead
// of with a confusing "tenant/user ... not found" error on every request.
if (/your_project_id|\[YOUR_PASSWORD\]|your_db_password/i.test(activeUrl)) {
  console.error('❌ ERROR: DATABASE_URL still contains the placeholder from .env.example.');
  console.error(`👉 Set the real Supabase connection string (Supabase -> Connect -> Session pooler) in ${whereToSet}.`);
  process.exit(1);
}

const createPool = (connString) => {
  const p = new Pool({
    connectionString: connString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 7000,
    max: 20
  });

  p.on('connect', () => {
    // Database connection active
  });

  p.on('error', (err) => {
    console.error('Database pool error:', err.message);
  });

  return p;
};

let currentPool = createPool(activeUrl);

const getAlternatePortUrl = (url) => {
  if (!url) return null;
  if (url.includes(':5432/')) {
    return url.replace(':5432/', ':6543/');
  }
  if (url.includes(':6543/')) {
    return url.replace(':6543/', ':5432/');
  }
  return null;
};

const isConnectionError = (err) => {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  const code = err.code || '';
  return (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNRESET' ||
    msg.includes('timeout') ||
    msg.includes('connection refused') ||
    msg.includes('network')
  );
};

const query = async (text, params) => {
  try {
    return await currentPool.query(text, params);
  } catch (err) {
    if (isConnectionError(err)) {
      const alternateUrl = getAlternatePortUrl(activeUrl);
      if (alternateUrl && alternateUrl !== activeUrl) {
        console.warn(
          `⚠️ [DB Auto-Recovery] Primary connection failed (${err.message}). Retrying on alternate Supabase pooler port...`
        );
        try {
          const fallbackPool = createPool(alternateUrl);
          const result = await fallbackPool.query(text, params);
          // If fallback succeeded, make it the active pool permanently
          const oldPool = currentPool;
          currentPool = fallbackPool;
          activeUrl = alternateUrl;
          console.log('✅ [DB Auto-Recovery] Reconnected successfully to cloud database on alternate port!');
          try {
            oldPool.end();
          } catch (e) {}
          return result;
        } catch (fallbackErr) {
          throw fallbackErr;
        }
      }
    }
    throw err;
  }
};

const initializeDatabase = async () => {
  try {
    await query(`ALTER TABLE public.food_posts
      ADD COLUMN IF NOT EXISTS receiver_price_bdt NUMERIC(12, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE public.food_requests
      ADD COLUMN IF NOT EXISTS purchase_price_bdt NUMERIC(12, 2) NOT NULL DEFAULT 0`);
    await query(`ALTER TABLE public.serving_logs
      ADD COLUMN IF NOT EXISTS donation_ref TEXT`);
    await query(`
      CREATE TABLE IF NOT EXISTS public.receiver_cart_items (
        id BIGSERIAL PRIMARY KEY,
        receiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        food_post_id INTEGER NOT NULL REFERENCES public.food_posts(id) ON DELETE CASCADE,
        quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (receiver_id, food_post_id)
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS public.receiver_wishlist_items (
        id BIGSERIAL PRIMARY KEY,
        receiver_id INTEGER NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        food_post_id INTEGER NOT NULL REFERENCES public.food_posts(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (receiver_id, food_post_id)
      )
    `);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'pickup_points'
        ) THEN
          ALTER TABLE public.pickup_points
            ADD COLUMN IF NOT EXISTS ngo_id INTEGER REFERENCES public.ngos(id) ON DELETE CASCADE;
          ALTER TABLE public.pickup_points
            ADD COLUMN IF NOT EXISTS active_items INTEGER NOT NULL DEFAULT 0;
          ALTER TABLE public.pickup_points
            ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'Active';
        END IF;
      END $$;
    `);

    // Keep schema enum alignment independent from optional table migrations.
    await query(`ALTER TYPE public.food_post_status ADD VALUE IF NOT EXISTS 'at_ngo_point'`);
    await query(`ALTER TYPE public.food_post_status ADD VALUE IF NOT EXISTS 'distributed'`);

    console.log('✅ [DB Schema] Critical schema check completed.');
  } catch (error) {
    console.warn('⚠️ [DB Schema] Critical schema alignment skipped:', error.message);
  }
};

module.exports = {
  query,
  initializeDatabase,
  get pool() {
    return currentPool;
  }
};
