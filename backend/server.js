require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const { Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

// 1. Safety Check for .env file
if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('your_neon_connection_string_here')) {
    console.error("❌ ERROR: You need to paste your actual Neon Database URL into the .env file!");
}

// 2. Connect to Postgres (With Neon's required SSL config)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Crucial for Neon.tech connections
});

// 3. Test Database Connection Immediately on Startup
pool.connect()
  .then(client => {
      console.log("✅ Successfully connected to the Neon PostgreSQL Database!");
      client.release();
  })
  .catch(err => {
      console.error("❌ Database connection failed. Check your connection string:", err.message);
  });

// --- SIGNUP ENDPOINT ---
app.post('/api/signup', async (req, res) => {
  const { username, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, role]
    );
    res.status(201).json({ message: 'User created successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ error: 'Username already exists' });
    else res.status(500).json({ error: 'Database error' });
  }
});

// --- LOGIN ENDPOINT ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    if (result.rows.length === 0) return res.status(400).json({ error: 'User not found' });

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    res.json({ message: 'Login successful', role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// --- ADD NEW PATIENT ENDPOINT ---
app.post('/api/patients', async (req, res) => {
  const { token, name, aadhaar, phone, address } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO patients (token, name, aadhaar, phone, address, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [token, name, aadhaar, phone, address, 'Waiting']
    );
    res.status(201).json({ message: 'Patient registered successfully!', patient: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ error: 'This Aadhaar number is already registered today.' });
    else res.status(500).json({ error: 'Database error while saving patient.' });
  }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`🚀 Server actively running and listening on port ${PORT}`);
});

// Keep server alive and catch port errors
server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ ERROR: Port ${PORT} is already in use. Close other terminals and try again.`);
    } else {
        console.error(`❌ SERVER ERROR:`, e);
    }
});