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

// --- EMAIL TRANSPORTER ---
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
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

// ==========================================
// --- PATIENT & QUEUE ENDPOINTS ---
// ==========================================

// 1. ADD PATIENT
app.post('/api/patients', async (req, res) => {
  const { token, name, aadhaar, phone, address, department, assigned_doctor, visit_type, appointment_time } = req.body;
  
  if (!/^[a-zA-Z\s]+$/.test(name)) return res.status(400).json({ error: 'Name must be letters only.' });
  if (!/^\d{10}$/.test(phone)) return res.status(400).json({ error: 'Phone must be 10 digits.' });
  if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ error: 'ID must be 12 digits.' });

  try {
    // New patients start as active if walk-in, inactive if appointment (until receptionist activates them)
    const isActive = visit_type === 'Walk-in';
    const result = await pool.query(
      `INSERT INTO patients (token, name, aadhaar, phone, address, status, department, assigned_doctor, visit_type, appointment_time, is_active) 
       VALUES ($1, $2, $3, $4, $5, 'Waiting', $6, $7, $8, $9, $10) RETURNING *`,
      [token, name, aadhaar, phone, address, department, assigned_doctor, visit_type, appointment_time, isActive]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: 'Database error' }); }
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

// 3. GET GENERAL HISTORY
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

// 5. DOCTOR CALLS NEXT
app.put('/api/patients/next', async (req, res) => {
  const { department, doctor_name } = req.body;
  try {
    // Mark serving as done and inactive
    await pool.query("UPDATE patients SET status = 'Done', is_active = false WHERE status = 'Serving' AND department = $1", [department]);
    
    // Promote next in line
    const next = await pool.query(
      `UPDATE patients SET status = 'Serving' 
       WHERE id = (SELECT id FROM patients WHERE status = 'Waiting' AND is_active = true AND department = $1 ORDER BY appointment_time ASC NULLS LAST, created_at ASC LIMIT 1) 
       RETURNING *`, [department]
    );
    res.json({ serving: next.rows[0] });
  } catch (err) { res.status(500).json({ error: 'Rotation failed' }); }
});

// ==========================================
// --- SETTINGS & MEDIA (Keeping your existing logic) ---
// ==========================================
app.get('/api/settings', async (req, res) => { try { const r = await pool.query("SELECT * FROM system_settings"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });
app.post('/api/media', async (req, res) => { try { const r = await pool.query("INSERT INTO media_library (title, type, url) VALUES ($1, $2, $3) RETURNING *", [req.body.title, req.body.type, req.body.url]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json(e); } });
app.get('/api/media', async (req, res) => { try { const r = await pool.query("SELECT * FROM media_library"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });
app.post('/api/schedules', async (req, res) => { try { const r = await pool.query("INSERT INTO schedules (tv_id, media_id, start_time, end_time) VALUES ($1, $2, $3, $4) RETURNING *", [req.body.tv_id, req.body.media_id, req.body.start_time, req.body.end_time]); res.status(201).json(r.rows[0]); } catch (e) { res.status(500).json(e); } });
app.get('/api/schedules', async (req, res) => { try { const r = await pool.query("SELECT s.*, m.title, m.type, m.url FROM schedules s JOIN media_library m ON s.media_id = m.id"); res.json(r.rows); } catch (e) { res.status(500).json(e); } });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on ${PORT}`));