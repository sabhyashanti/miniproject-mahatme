require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

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

// --- EMAIL TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// --- OTP MEMORY STORE ---
const otpStore = new Map();

// --- SIGNUP ENDPOINT (Updated for Email) ---
app.post('/api/signup', async (req, res) => {
  const { username, email, role } = req.body;
  try {
    // Insert a dummy password to satisfy the DB NOT NULL constraint while using OTP
    const result = await pool.query(
      "INSERT INTO users (username, password, role, email) VALUES ($1, 'dummy_pass_otp_used', $2, $3) RETURNING id, username, role",
      [username, role, email]
    );
    res.status(201).json({ message: 'User created successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ error: 'Username or Email already exists' });
    else res.status(500).json({ error: 'Database error' });
  }
});

// --- REQUEST OTP ENDPOINT ---
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Email not registered in the system.' });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 300000 }); // Expires in 5 mins

    // Fallback: Always print OTP to backend terminal (Safety net for presentations)
    console.log(`\n🔑 OTP for ${email}: ${otp}\n`);

    // Send Email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Mahatme Hospital - Your Login OTP',
      html: `<h2>Secure System Access</h2>
             <p>Your authentication code is: <b style="font-size: 24px; color: #0056b3; letter-spacing: 3px;">${otp}</b></p>
             <p>This code expires in 5 minutes.</p>`
    });

    res.json({ message: 'OTP sent successfully to your email!' });
  } catch (err) {
    console.error("OTP Error:", err);
    res.status(500).json({ error: 'Server error sending email. Check backend terminal for code.' });
  }
});

// --- VERIFY OTP ENDPOINT ---
app.post('/api/verify-otp', async (req, res) => {
  const { email, otp } = req.body;
  try {
    const storedData = otpStore.get(email);
    if (!storedData) return res.status(400).json({ error: 'OTP expired or not requested.' });
    if (Date.now() > storedData.expires) {
      otpStore.delete(email);
      return res.status(400).json({ error: 'OTP has expired.' });
    }
    if (storedData.otp !== otp) return res.status(400).json({ error: 'Invalid OTP.' });

    // OTP is correct! Fetch user
    const result = await pool.query('SELECT username, role FROM users WHERE email = $1', [email]);
    otpStore.delete(email); // Clear OTP so it cannot be reused
    res.json({ message: 'Login successful', role: result.rows[0].role, username: result.rows[0].username });
  } catch (err) {
    res.status(500).json({ error: 'Server error verifying OTP.' });
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

// --- GET LIVE QUEUE ENDPOINT (For TV Display) ---
app.get('/api/patients', async (req, res) => {
  try {
    // Fetch all patients for today, ordered by when they were added
    const result = await pool.query("SELECT * FROM patients WHERE status IN ('Waiting', 'Serving') ORDER BY created_at ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// --- UPDATE QUEUE (DOCTOR CALLS NEXT PATIENT) ---
app.put('/api/patients/next', async (req, res) => {
  try {
    console.log("--> [QUEUE] Doctor requested next patient...");

    // 1. Mark the currently 'Serving' patient as 'Done'
    const doneResult = await pool.query("UPDATE patients SET status = 'Done' WHERE status = 'Serving' RETURNING id");
    console.log(`    - Marked ${doneResult.rowCount} patient(s) as Done.`);
    
    // 2. Safely find the oldest 'Waiting' patient
    const nextPatient = await pool.query("SELECT id FROM patients WHERE status = 'Waiting' ORDER BY created_at ASC LIMIT 1");
    
    // If no one is waiting, tell the frontend the queue is empty
    if (nextPatient.rows.length === 0) {
        console.log("    - No waiting patients found in database.");
        return res.json({ message: 'Queue is already empty', serving: null });
    }

    // 3. Upgrade that specific patient to 'Serving'
    const result = await pool.query(
      "UPDATE patients SET status = 'Serving' WHERE id = $1 RETURNING *",
      [nextPatient.rows[0].id]
    );
    
    console.log(`    - Upgraded Token ${result.rows[0].token} to Serving!`);
    res.json({ message: 'Queue updated successfully!', serving: result.rows[0] });

  } catch (err) {
    console.error("❌ ERROR updating queue:", err.message);
    res.status(500).json({ error: 'Database failed to update the queue.' });
  }
});

// --- GET ALL SYSTEM SETTINGS (For Admin & TVs) ---
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM system_settings ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// --- UPDATE SYSTEM SETTINGS (Individual or All TVs) ---
app.put('/api/settings', async (req, res) => {
  const { tv_id, video_url, announcement, is_emergency, emergency_text } = req.body;
  try {
    if (tv_id === 'all') {
      // Update ALL TVs in the hospital
      await pool.query(
        "UPDATE system_settings SET video_url = COALESCE($1, video_url), announcement = COALESCE($2, announcement), is_emergency = COALESCE($3, is_emergency), emergency_text = COALESCE($4, emergency_text)",
        [video_url, announcement, is_emergency, emergency_text]
      );
    } else {
      // Update a SPECIFIC TV
      await pool.query(
        "UPDATE system_settings SET video_url = COALESCE($1, video_url), announcement = COALESCE($2, announcement), is_emergency = COALESCE($3, is_emergency), emergency_text = COALESCE($4, emergency_text) WHERE id = $5",
        [video_url, announcement, is_emergency, emergency_text, tv_id]
      );
    }
    res.json({ message: 'System updated successfully!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});
// ==========================================
// --- MEDIA LIBRARY & SCHEDULING SYSTEM ---
// ==========================================

// 1. Upload to Media Library
app.post('/api/media', async (req, res) => {
  const { title, type, url } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO media_library (title, type, url) VALUES ($1, $2, $3) RETURNING *",
      [title, type, url]
    );
    res.status(201).json({ message: 'Media saved to library!', media: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save media.' });
  }
});

// 2. Fetch Media Library
app.get('/api/media', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM media_library ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media library.' });
  }
});

// 3. Create a Schedule for a TV
app.post('/api/schedules', async (req, res) => {
  const { tv_id, media_id, start_time, end_time } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO schedules (tv_id, media_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *",
      [tv_id, media_id, start_time, end_time]
    );
    res.status(201).json({ message: 'Schedule created!', schedule: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create schedule.' });
  }
});

// 4. Fetch All Schedules (Joined with Media data)
app.get('/api/schedules', async (req, res) => {
  try {
    const query = `
      SELECT s.id, s.tv_id, s.start_time, s.end_time, m.title, m.type, m.url 
      FROM schedules s
      JOIN media_library m ON s.media_id = m.id
      ORDER BY s.start_time ASC
    `;
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch schedules.' });
  }
});

// 5. Delete a Schedule
app.delete('/api/schedules/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM schedules WHERE id = $1", [req.params.id]);
    res.json({ message: 'Schedule removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete schedule.' });
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