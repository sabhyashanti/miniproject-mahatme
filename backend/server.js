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

// 2. Connect to Postgres
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

pool.connect()
  .then(client => {
      console.log("✅ Successfully connected to the Neon PostgreSQL Database!");
      client.release();
  })
  .catch(err => {
      console.error("❌ Database connection failed:", err.message);
  });

// --- EMAIL TRANSPORTER SETUP ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const otpStore = new Map();

// ==========================================
// --- USER & AUTHENTICATION ENDPOINTS ---
// ==========================================

// --- SIGNUP ENDPOINT (Updated to include Department for Doctors) ---
app.post('/api/signup', async (req, res) => {
  const { username, email, role, department } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (username, password, role, email, department) VALUES ($1, 'dummy_pass_otp_used', $2, $3, $4) RETURNING id, username, role, department",
      [username, role, email, department || 'General']
    );
    res.status(201).json({ message: 'User created successfully!', user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ error: 'Username or Email already exists' });
    else res.status(500).json({ error: 'Database error' });
  }
});

// --- NEW: FETCH DOCTORS ENDPOINT ---
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, department FROM users WHERE role = 'doctor'");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

// --- REQUEST OTP ---
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Email not registered in the system.' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(email, { otp, expires: Date.now() + 300000 }); 

    console.log(`\n🔑 OTP for ${email}: ${otp}\n`);

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

// --- VERIFY OTP ---
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

    const result = await pool.query('SELECT username, role, department FROM users WHERE email = $1', [email]);
    otpStore.delete(email); 
    res.json({ message: 'Login successful', role: result.rows[0].role, username: result.rows[0].username, department: result.rows[0].department });
  } catch (err) {
    res.status(500).json({ error: 'Server error verifying OTP.' });
  }
});

// ==========================================
// --- PATIENT & QUEUE ENDPOINTS ---
// ==========================================

// --- ADD NEW PATIENT (STRICT VALIDATIONS + DEPARTMENT LOGIC) ---
app.post('/api/patients', async (req, res) => {
  const { token, name, aadhaar, phone, address, department, assigned_doctor, visit_type, appointment_time } = req.body;
  
  // 🚨 STRICT BACKEND DATA VALIDATION
  if (!/^[a-zA-Z\s]+$/.test(name)) return res.status(400).json({ error: 'Name must contain only letters and spaces.' });
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must be exactly 10 digits.' });
  if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ error: 'ID must be exactly 12 digits.' });

  try {
    const result = await pool.query(
      `INSERT INTO patients (token, name, aadhaar, phone, address, status, department, assigned_doctor, visit_type, appointment_time) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [token, name, aadhaar, phone, address, 'Waiting', department || 'OPD-1', assigned_doctor || null, visit_type || 'Walk-in', appointment_time || null]
    );
    res.status(201).json({ message: 'Patient registered successfully!', patient: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') res.status(400).json({ error: 'This ID number is already registered today.' });
    else res.status(500).json({ error: 'Database error while saving patient.' });
  }
});

// --- GET LIVE QUEUE (Sorted properly for Walk-ins vs Appointments) ---
app.get('/api/patients', async (req, res) => {
  try {
    // Orders "Serving" first, then sorts Appointments by their scheduled time, then Walk-ins by arrival time
    const result = await pool.query("SELECT * FROM patients WHERE status IN ('Waiting', 'Serving') ORDER BY status DESC, appointment_time ASC NULLS LAST, created_at ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// --- UPDATE QUEUE (DOCTOR CALLS NEXT PATIENT) ---
// Now supports filtering so a Doctor only calls the next patient in THEIR specific department
app.put('/api/patients/next', async (req, res) => {
  const { department, doctor_name } = req.body; // Can be passed by the Doctor Dashboard
  
  try {
    // 1. Mark the currently 'Serving' patient as 'Done' (filtered by dept if provided)
    let doneQuery = "UPDATE patients SET status = 'Done' WHERE status = 'Serving'";
    let queryParams = [];
    if (department) {
      doneQuery += " AND department = $1";
      queryParams.push(department);
    }
    await pool.query(doneQuery, queryParams);
    
    // 2. Find the oldest 'Waiting' patient (prioritizing appointments whose time has come, then walk-ins)
    let nextQuery = "SELECT id FROM patients WHERE status = 'Waiting'";
    let nextParams = [];
    
    if (department) {
      nextQuery += " AND department = $1";
      nextParams.push(department);
    }
    if (doctor_name) {
      nextQuery += ` AND (assigned_doctor = $${nextParams.length + 1} OR assigned_doctor IS NULL OR assigned_doctor = '')`;
      nextParams.push(doctor_name);
    }
    
    nextQuery += " ORDER BY appointment_time ASC NULLS LAST, created_at ASC LIMIT 1";
    
    const nextPatient = await pool.query(nextQuery, nextParams);
    
    if (nextPatient.rows.length === 0) {
        return res.json({ message: 'Queue is already empty for this department.', serving: null });
    }

    // 3. Upgrade that specific patient to 'Serving'
    const result = await pool.query(
      "UPDATE patients SET status = 'Serving' WHERE id = $1 RETURNING *",
      [nextPatient.rows[0].id]
    );
    
    res.json({ message: 'Queue updated successfully!', serving: result.rows[0] });
  } catch (err) {
    console.error("❌ ERROR updating queue:", err.message);
    res.status(500).json({ error: 'Database failed to update the queue.' });
  }
});

// ==========================================
// --- DIGITAL SIGNAGE (TV) SETTINGS ---
// ==========================================

app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM system_settings ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  const { tv_id, video_url, announcement, is_emergency, emergency_text } = req.body;
  try {
    if (tv_id === 'all') {
      await pool.query(
        "UPDATE system_settings SET video_url = COALESCE($1, video_url), announcement = COALESCE($2, announcement), is_emergency = COALESCE($3, is_emergency), emergency_text = COALESCE($4, emergency_text)",
        [video_url, announcement, is_emergency, emergency_text]
      );
    } else {
      await pool.query(
        "UPDATE system_settings SET video_url = COALESCE($1, video_url), announcement = COALESCE($2, announcement), is_emergency = COALESCE($3, is_emergency), emergency_text = COALESCE($4, emergency_text) WHERE id = $5",
        [video_url, announcement, is_emergency, emergency_text, tv_id]
      );
    }
    res.json({ message: 'System updated successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==========================================
// --- MEDIA LIBRARY & SCHEDULING SYSTEM ---
// ==========================================

app.post('/api/media', async (req, res) => {
  const { title, type, url } = req.body;
  try {
    const result = await pool.query("INSERT INTO media_library (title, type, url) VALUES ($1, $2, $3) RETURNING *", [title, type, url]);
    res.status(201).json({ message: 'Media saved!', media: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save media.' });
  }
});

app.get('/api/media', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM media_library ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch media library.' });
  }
});

app.post('/api/schedules', async (req, res) => {
  const { tv_id, media_id, start_time, end_time } = req.body;
  try {
    const result = await pool.query("INSERT INTO schedules (tv_id, media_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *", [tv_id, media_id, start_time, end_time]);
    res.status(201).json({ message: 'Schedule created!', schedule: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create schedule.' });
  }
});

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
    res.status(500).json({ error: 'Failed to fetch schedules.' });
  }
});

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

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ ERROR: Port ${PORT} is already in use. Close other terminals and try again.`);
    } else {
        console.error(`❌ SERVER ERROR:`, e);
    }
});