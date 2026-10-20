const db = require('../config/db');
const { encrypt, decryptFields } = require('../utils/encryption');

const createUser = async ({
  name,
  phone,
  nid,
  nid_pdf,
  email,
  address,
  password_hash,
  role
}) => {
  const encryptedNid = encrypt(nid);
  const pdfValue = Buffer.isBuffer(nid_pdf) ? nid_pdf : null;
  const query = `
    INSERT INTO users (
      name, phone, nid, nid_pdf, email, address, password_hash, role
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING id, name, phone, nid, email, address, role, verification_status, created_at;
  `;
  const values = [
    name,
    phone,
    encryptedNid,
    pdfValue,
    email || null,
    address || null,
    password_hash || null,
    role
  ];
  const result = await db.query(query, values);
  return decryptFields(result.rows[0]);
};

const findById = async (id) => {
  const query = `
    SELECT id, name, phone, nid, (nid_pdf IS NOT NULL) AS has_nid_pdf,
      email, address, role, verification_status, ngo_staff_role,
      parent_ngo_id, created_at
    FROM users
    WHERE id = $1;
  `;
  const result = await db.query(query, [id]);
  return decryptFields(result.rows[0]);
};

const findByPhone = async (phone) => {
  const result = await db.query('SELECT * FROM users WHERE phone = $1;', [phone]);
  return decryptFields(result.rows[0]);
};

const findByEmail = async (email) => {
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1);',
    [email]
  );
  return decryptFields(result.rows[0]);
};

const findByPhoneOrEmail = async (identifier) => {
  if (!identifier) return null;
  const result = await db.query(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR phone = $1;',
    [identifier.trim()]
  );
  return decryptFields(result.rows[0]);
};

const findByRole = async (role) => {
  const result = await db.query(
    `SELECT id, name, phone, nid, email, address, role, verification_status,
      ngo_staff_role, parent_ngo_id, created_at
    FROM users
    WHERE role = $1;`,
    [role]
  );
  return result.rows.map((user) => decryptFields(user));
};

const updateVerificationStatus = async (id, status) => {
  const result = await db.query(
    `UPDATE users
    SET verification_status = $1
    WHERE id = $2
    RETURNING id, name, phone, role, verification_status;`,
    [status, id]
  );
  return result.rows[0];
};

const updateUserProfile = async (
  id,
  { name, phone, email, address, nid, nid_pdf }
) => {
  const encryptedNid = nid !== undefined ? encrypt(nid) : undefined;
  const pdfValue = Buffer.isBuffer(nid_pdf) ? nid_pdf : null;
  const result = await db.query(
    `UPDATE users
    SET
      name = COALESCE($1, name),
      phone = COALESCE($2, phone),
      email = COALESCE($3, email),
      address = COALESCE($4, address),
      nid = COALESCE($5, nid),
      nid_pdf = COALESCE($6, nid_pdf)
    WHERE id = $7
    RETURNING id, name, phone, nid, (nid_pdf IS NOT NULL) AS has_nid_pdf,
      email, address, role, verification_status, created_at;`,
    [name, phone, email, address, encryptedNid, pdfValue, id]
  );
  return decryptFields(result.rows[0]);
};

const updateLastLogin = async (id) => {
  const result = await db.query(
    `UPDATE users
    SET last_login = NOW(), last_active_at = NOW()
    WHERE id = $1
    RETURNING id, last_login, last_active_at;`,
    [id]
  );
  return result.rows[0];
};

const updateLastActive = async (id) => {
  const result = await db.query(
    `UPDATE users
    SET last_active_at = NOW()
    WHERE id = $1
    RETURNING id, last_active_at;`,
    [id]
  );
  return result.rows[0];
};

const deleteUserById = async (id) => {
  const client = await db.pool.connect();
  try {
    await client.query('BEGIN');

    // Wallet money records are an audit trail and must outlive the account.
    const walletTables = await client.query("SELECT to_regclass('public.wallet_accounts') IS NOT NULL AS ready");
    if (walletTables.rows[0].ready) {
      const history = await client.query(
        `SELECT EXISTS (SELECT 1 FROM wallet_transactions WHERE user_id = $1)
             OR EXISTS (SELECT 1 FROM wallet_topups WHERE user_id = $1)
             OR EXISTS (SELECT 1 FROM ngo_payments WHERE receiver_id = $1 OR ngo_user_id = $1) AS has_history`,
        [id]
      );
      if (history.rows[0].has_history) {
        const error = new Error('This account has wallet payment records, which must be kept for auditing, so it cannot be deleted.');
        error.statusCode = 409;
        throw error;
      }
      await client.query('DELETE FROM wallet_accounts WHERE user_id = $1', [id]);
    }

    await client.query(
      'DELETE FROM ratings WHERE author_id = $1 OR target_user_id = $1',
      [id]
    );
    await client.query(
      'DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1',
      [id]
    );
    await client.query('DELETE FROM notifications WHERE user_id = $1', [id]);
    await client.query('DELETE FROM collection_requests WHERE ngo_id = $1', [id]);
    await client.query('DELETE FROM food_requests WHERE receiver_id = $1', [id]);

    const ngoResult = await client.query(
      'SELECT id FROM ngos WHERE user_id = $1',
      [id]
    );
    if (ngoResult.rows.length > 0) {
      const ngoId = ngoResult.rows[0].id;
      await client.query(
        `UPDATE food_requests SET distributed_pickup_point_id = NULL
        WHERE distributed_pickup_point_id IN (
          SELECT id FROM pickup_points WHERE ngo_id = $1
        )`,
        [ngoId]
      );
      await client.query(
        `UPDATE food_posts SET pickup_point_id = NULL
        WHERE pickup_point_id IN (
          SELECT id FROM pickup_points WHERE ngo_id = $1
        )`,
        [ngoId]
      );
      await client.query('DELETE FROM serving_logs WHERE ngo_id = $1', [ngoId]);
      await client.query('DELETE FROM pickup_points WHERE ngo_id = $1', [ngoId]);
      await client.query('DELETE FROM ngos WHERE id = $1', [ngoId]);
    }

    const postsResult = await client.query(
      'SELECT id FROM food_posts WHERE donor_id = $1',
      [id]
    );
    const postIds = postsResult.rows.map((post) => post.id);
    if (postIds.length > 0) {
      await client.query(
        'DELETE FROM messages WHERE food_post_id = ANY($1::int[])',
        [postIds]
      );
      await client.query(
        'DELETE FROM collection_requests WHERE food_post_id = ANY($1::int[])',
        [postIds]
      );
      await client.query(
        'DELETE FROM food_requests WHERE food_post_id = ANY($1::int[])',
        [postIds]
      );
      await client.query('DELETE FROM food_posts WHERE donor_id = $1', [id]);
    }

    await client.query(
      'UPDATE food_requests SET assigned_staff_id = NULL WHERE assigned_staff_id = $1',
      [id]
    );
    await client.query(
      'UPDATE food_requests SET picked_up_by_staff_id = NULL WHERE picked_up_by_staff_id = $1',
      [id]
    );
    await client.query(
      'UPDATE food_requests SET received_at_hub_by_staff_id = NULL WHERE received_at_hub_by_staff_id = $1',
      [id]
    );
    await client.query('UPDATE users SET parent_ngo_id = NULL WHERE parent_ngo_id = $1', [id]);

    const result = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, name, email, role',
      [id]
    );
    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createUser,
  findById,
  findByPhone,
  findByEmail,
  findByPhoneOrEmail,
  findByRole,
  updateVerificationStatus,
  updateUserProfile,
  updateLastLogin,
  updateLastActive,
  deleteUserById
};
