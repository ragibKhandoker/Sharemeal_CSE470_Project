require('dotenv').config({ path: __dirname + '/.env' });
const db = require('./config/db');
const bcrypt = require('bcryptjs');

async function seedNgo() {
  try {
    console.log('Checking for NGO user in database...');

    // Check if ngo@test.com exists
    const userCheck = await db.query("SELECT * FROM users WHERE email = 'ngo@test.com'");
    let userId;

    if (userCheck.rows.length === 0) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('11223344', salt);

      const insertUser = await db.query(
        `INSERT INTO users (name, email, phone, role, password_hash, verification_status, address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, email, role`,
        [
          'Anisur Rahman',
          'ngo@test.com',
          '01788776655',
          'ngo',
          hashedPassword,
          'verified',
          'Road 27, Dhanmondi, Dhaka'
        ]
      );
      userId = insertUser.rows[0].id;
      console.log('Created verified NGO user:', insertUser.rows[0]);
    } else {
      userId = userCheck.rows[0].id;
      console.log('NGO user already exists with ID:', userId);
    }

    // Check if NGO org record exists
    const ngoCheck = await db.query('SELECT * FROM ngos WHERE user_id = $1', [userId]);
    if (ngoCheck.rows.length === 0) {
      const insertNgo = await db.query(
        `INSERT INTO ngos (user_id, organization_name, registration_no, verified_by_admin)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [
          userId,
          'Care Bangladesh Food Rescue',
          'NGO-DHAKA-2026-481',
          true
        ]
      );
      console.log('Created NGO organization record:', insertNgo.rows[0]);
    } else {
      console.log('NGO organization record already exists');
    }

    console.log('NGO seed completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Seed NGO error:', err);
    process.exit(1);
  }
}

seedNgo();
