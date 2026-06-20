require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } 
});

pool.connect()
  .then(client => {
      console.log("✅ Successfully connected to the Neon Database!");
      client.release();
  })
  .catch(err => console.error("❌ Database connection failed:", err.message));

// --- EMAIL TRANSPORTER ---
// --- EMAIL TRANSPORTER (Forced IPv4 for Render) ---
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  requireTLS: true,
  auth: { 
    user: process.env.EMAIL_USER, 
    pass: process.env.EMAIL_PASS 
  },
  tls: {
    rejectUnauthorized: false
  },
  // 🔥 THE FIX: Force Node.js to use IPv4 instead of IPv6
  family: 4 
});
const otpStore = new Map();

// ==========================================
// --- AUTH & DOCTORS ---
// ==========================================
app.post('/api/signup', async (req, res) => {
  const { username, email, role, department } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO users (username, password, role, email, department) VALUES ($1, 'dummy_pass_otp_used', $2, $3, $4) RETURNING *",
      [username, role, email, department || 'General']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
});

app.get('/api/doctors', async (req, res) => {
  try {
    const result = await pool.query("SELECT id, username, department FROM users WHERE role = 'doctor'");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch doctors' }); }
});

// --- REQUEST OTP ---
app.post('/api/request-otp', async (req, res) => {
  const { email } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) return res.status(400).json({ error: 'Email not registered in the system.' });

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
  } catch (err) { res.status(500).json({ error: 'Server error verifying OTP.' }); }
});

// ==========================================
// --- PATIENT & QUEUE ENDPOINTS ---
// ==========================================

// 1. ADD PATIENT (Fixed logic & added appointment_date)
app.post('/api/patients', async (req, res) => {
  const { token, name, aadhaar, phone, address, department, assigned_doctor, visit_type, appointment_date, appointment_time } = req.body;
  
  if (!/^[a-zA-Z\s]+$/.test(name)) return res.status(400).json({ error: 'Name must be letters only.' });
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ error: 'ID must be 12 digits.' });

  try {
    // FIX: Restored the proper check so Appointments don't skip the waiting room!
    const isActive = visit_type === 'Walk-in';
    
    const result = await pool.query(
      `INSERT INTO patients (token, name, aadhaar, phone, address, status, department, assigned_doctor, visit_type, appointment_date, appointment_time, is_active) 
       VALUES ($1, $2, $3, $4, $5, 'Waiting', $6, $7, $8, $9, $10, $11) RETURNING *`,
      [token, name, aadhaar, phone, address, department || 'OPD-1', assigned_doctor || null, visit_type || 'Walk-in', appointment_date || null, appointment_time || null, isActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Database error' }); 
  }
});

// 2. GET ACTIVE QUEUE
app.get('/api/queue', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM patients WHERE is_active = true AND status IN ('Waiting', 'Serving') ORDER BY status DESC, appointment_time ASC NULLS LAST, created_at ASC"
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch active queue' }); }
});

// 3. GET GENERAL HISTORY & APPOINTMENTS
app.get('/api/patients/history', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM patients WHERE is_active = false ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: 'Failed to fetch history' }); }
});

// 4. ACTIVATE APPOINTMENT (Receptionist check-in)
app.patch('/api/patients/activate/:id', async (req, res) => {
  try {
    await pool.query("UPDATE patients SET is_active = true WHERE id = $1", [req.params.id]);
    res.json({ message: 'Patient added to Active Queue' });
  } catch (err) { res.status(500).json({ error: 'Failed to activate' }); }
});

// 5. DOCTOR / RECEPTIONIST CALLS NEXT
app.put('/api/patients/next', async (req, res) => {
  const { department, doctor_name } = req.body;
  try {
    await pool.query("UPDATE patients SET status = 'Done', is_active = false WHERE status = 'Serving' AND department = $1", [department]);
    
    let nextQuery = `UPDATE patients SET status = 'Serving' 
                     WHERE id = (SELECT id FROM patients WHERE status = 'Waiting' AND is_active = true AND department = $1`;
    let nextParams = [department];

    if (doctor_name) {
      nextQuery += ` AND (assigned_doctor = $2 OR assigned_doctor IS NULL OR assigned_doctor = '')`;
      nextParams.push(doctor_name);
    }

    nextQuery += ` ORDER BY appointment_time ASC NULLS LAST, created_at ASC LIMIT 1) RETURNING *`;
    
    const next = await pool.query(nextQuery, nextParams);

    if (next.rows.length === 0) {
      return res.json({ message: 'Queue is already empty for this department.', serving: null });
    }

    res.json({ serving: next.rows[0] });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Rotation failed' }); 
  }
});

// 6. SKIP / REQUEUE UNAVAILABLE PATIENT
app.put('/api/patients/skip/:id', async (req, res) => {
  try {
    await pool.query(
      `UPDATE patients 
       SET status = 'Waiting', 
           created_at = created_at + interval '15 minutes',
           appointment_time = CASE WHEN appointment_time IS NOT NULL THEN (appointment_time::time + interval '15 minutes')::time ELSE NULL END
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: 'Patient bumped down the queue.' });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to skip patient' }); 
  }
});

// 7. DELETE PATIENT (No-show / Cancel Appointment) - NEW!
app.delete('/api/patients/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM patients WHERE id = $1", [req.params.id]);
    res.json({ message: 'Patient deleted successfully.' });
  } catch (err) { 
    console.error(err);
    res.status(500).json({ error: 'Failed to delete patient.' }); 
  }
});

// ==========================================
// --- SETTINGS & MEDIA ---
// ==========================================
app.get('/api/settings', async (req, res) => { try { const r = await pool.query("SELECT * FROM system_settings"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });
app.post('/api/media', async (req, res) => { try { const r = await pool.query("INSERT INTO media_library (title, type, url) VALUES ($1, $2, $3) RETURNING *", [req.body.title, req.body.type, req.body.url]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json(e); } });
app.get('/api/media', async (req, res) => { try { const r = await pool.query("SELECT * FROM media_library"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });
app.post('/api/schedules', async (req, res) => { try { const r = await pool.query("INSERT INTO schedules (tv_id, media_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *", [req.body.tv_id, req.body.media_id, req.body.start_time, req.body.end_time]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json(e); } });
app.get('/api/schedules', async (req, res) => { try { const r = await pool.query("SELECT s.*, m.title, m.type, m.url FROM schedules s JOIN media_library m ON s.media_id = m.id"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });
app.delete('/api/schedules/:id', async (req, res) => { try { await pool.query("DELETE FROM schedules WHERE id = $1", [req.params.id]); res.json({ message: 'Removed' }); } catch (e) { res.status(500).json(e); }});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));