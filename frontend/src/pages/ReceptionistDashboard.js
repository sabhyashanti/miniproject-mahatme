import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('register');
  
  // Data States
  const [doctors, setDoctors] = useState([]);
  const [activeQueue, setActiveQueue] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  
  // Form State
  const [patientForm, setPatientForm] = useState({
    name: '', aadhaar: '', phone: '', address: '', 
    department: 'OPD-1', assigned_doctor: '', visit_type: 'Walk-in', appointment_date: '', appointment_time: ''
  });

  const [errors, setErrors] = useState({});

  // Fetch Data on Load & Set Interval
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [docRes, queueRes, histRes] = await Promise.all([
        fetch('https://mahatme-backend.onrender.com/api/doctors'),
        fetch('https://mahatme-backend.onrender.com/api/queue'),
        fetch('https://mahatme-backend.onrender.com/api/patients/history')
      ]);
      if (docRes.ok) setDoctors(await docRes.json());
      if (queueRes.ok) setActiveQueue(await queueRes.json());
      if (histRes.ok) setHistoryList(await histRes.json());
    } catch (error) { console.error("Data sync failed"); }
  };

  // Validation
  const validateForm = () => {
    let newErrors = {};
    if (!/^[a-zA-Z\s]+$/.test(patientForm.name)) newErrors.name = "Letters only.";
    if (!/^\d{12}$/.test(patientForm.aadhaar)) newErrors.aadhaar = "12 digits required.";
    if (!/^\d{10}$/.test(patientForm.phone)) newErrors.phone = "10 digits required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit New Patient
  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const token = `${patientForm.department.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;
    const response = await fetch('https://mahatme-backend.onrender.com/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...patientForm, token })
    });
    
    if (response.ok) {
      alert(`${patientForm.visit_type} Registered! Token: ${token}`);
      setPatientForm({...patientForm, name: '', aadhaar: '', phone: '', address: '', appointment_date: '', appointment_time: ''});
      fetchData();
    } else alert("Registration failed. Check if Aadhaar is duplicate.");
  };

  // Move Appointment to Active Queue
  const activatePatient = async (id) => {
    await fetch(`https://mahatme-backend.onrender.com/api/patients/activate/${id}`, { method: 'PATCH' });
    alert("Patient moved to the Active Queue!");
    fetchData();
  };

  // --- NEW: Delete Appointment (No-Show) ---
  const handleDeletePatient = async (id) => {
    if (window.confirm("Are you sure you want to completely delete this appointment? This cannot be undone.")) {
      await fetch(`https://mahatme-backend.onrender.com/api/patients/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  // Call Next Patient for a Department
  const handleReceptionistCallNext = async (department) => {
    const res = await fetch('https://mahatme-backend.onrender.com/api/patients/next', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department })
    });
    if (res.ok) fetchData();
    else alert(`The ${department} queue is currently empty.`);
  };

  // --- SKIP & REQUEUE LOGIC ---
  const handleSkipPatient = async (patientId, department) => {
    try {
      // 1. Tell the backend to bump them down the line
      await fetch(`https://mahatme-backend.onrender.com/api/patients/skip/${patientId}`, { method: 'PUT' });
      // 2. Immediately call the ACTUAL next person in line
      await handleReceptionistCallNext(department);
    } catch (error) {
      alert("Error skipping patient.");
    }
  };

  const availableDoctors = doctors.filter(doc => doc.department === patientForm.department);
  const departments = ['OPD-1', 'OPD-2', 'OPD-3', 'OPD-4', 'OT-1', 'OT-2'];

  // Color Coding Themes for Departments
  const deptColors = {
    'OPD-1': { bg: '#e3f2fd', header: '#1565c0' }, // Blue
    'OPD-2': { bg: '#e0f2f1', header: '#00695c' }, // Teal
    'OPD-3': { bg: '#fff3e0', header: '#ef6c00' }, // Orange
    'OPD-4': { bg: '#f3e5f5', header: '#6a1b9a' }, // Purple
    'OT-1':  { bg: '#ffebee', header: '#c62828' }, // Red
    'OT-2':  { bg: '#fce4ec', header: '#ad1457' }  // Pink/Rose
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">Front Desk<br/><span>Reception</span></div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'register' ? 'active' : ''} onClick={() => setActiveTab('register')}>📝 Desk Registration</li>
          <li className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>📅 Scheduled Appointments</li>
          <li className={activeTab === 'queues' ? 'active' : ''} onClick={() => setActiveTab('queues')}>🏥 Active Live Queues</li>
          <li className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📂 General History</li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Receptionist Control Center</h1>
          <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
        </header>

        {/* =========================================
            TAB 1: PATIENT REGISTRATION
        ========================================= */}
        {activeTab === 'register' && (
          <section className="cms-panel">
            <h2>Patient Registration Form</h2>
            
            <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', backgroundColor: '#f8f9fa', padding: '25px', borderRadius: '10px', border: '1px solid #ddd' }}>
              
              {/* Row 1 */}
              <div className="form-group"><label>Patient Name</label><input type="text" className="auth-input" value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})} required />{errors.name && <small style={{color:'red'}}>{errors.name}</small>}</div>
              <div className="form-group"><label>Aadhaar (12 Digits)</label><input type="text" maxLength="12" className="auth-input" value={patientForm.aadhaar} onChange={e => setPatientForm({...patientForm, aadhaar: e.target.value})} required />{errors.aadhaar && <small style={{color:'red'}}>{errors.aadhaar}</small>}</div>
              
              {/* Row 2 */}
              <div className="form-group"><label>Phone (10 Digits)</label><input type="text" maxLength="10" className="auth-input" value={patientForm.phone} onChange={e => setPatientForm({...patientForm, phone: e.target.value})} required />{errors.phone && <small style={{color:'red'}}>{errors.phone}</small>}</div>
              <div className="form-group"><label>Home Address</label><input type="text" className="auth-input" value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})} required /></div>
              
              {/* Row 3 */}
              <div className="form-group">
                <label>Target Department</label>
                <select className="auth-select" value={patientForm.department} onChange={e => setPatientForm({...patientForm, department: e.target.value, assigned_doctor: ''})}>
                  {departments.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Assigned Doctor</label>
                <select className="auth-select" value={patientForm.assigned_doctor} onChange={e => setPatientForm({...patientForm, assigned_doctor: e.target.value})} required>
                  <option value="">-- Select Doctor --</option>
                  <option value="Any">Any Available Doctor</option>
                  {availableDoctors.map(d => <option key={d.id} value={d.username}>Dr. {d.username}</option>)}
                </select>
              </div>

              {/* Row 4: Walk-in vs Appointment Toggle */}
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label>Visit Type</label>
                <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
                  <label><input type="radio" name="visitType" value="Walk-in" checked={patientForm.visit_type === 'Walk-in'} onChange={() => setPatientForm({...patientForm, visit_type: 'Walk-in', appointment_date: '', appointment_time: ''})} /> Walk-in (Join Queue Now)</label>
                  <label><input type="radio" name="visitType" value="Appointment" checked={patientForm.visit_type === 'Appointment'} onChange={() => setPatientForm({...patientForm, visit_type: 'Appointment'})} /> Scheduled Appointment</label>
                </div>
              </div>

              {/* Row 5: Conditional Scheduling Fields */}
              {patientForm.visit_type === 'Appointment' && (
                <>
                  <div className="form-group"><label>Appointment Date</label><input type="date" className="auth-input" value={patientForm.appointment_date} onChange={e => setPatientForm({...patientForm, appointment_date: e.target.value})} required /></div>
                  <div className="form-group"><label>Appointment Time</label><input type="time" className="auth-input" value={patientForm.appointment_time} onChange={e => setPatientForm({...patientForm, appointment_time: e.target.value})} required /></div>
                </>
              )}

              <button type="submit" className="upload-btn" style={{ gridColumn: 'span 2', padding: '15px', fontSize: '16px' }}>
                {patientForm.visit_type === 'Walk-in' ? 'Register Walk-in Patient' : 'Lock in Appointment Schedule'}
              </button>
            </form>
          </section>
        )}

        {/* =========================================
            TAB 2: APPOINTMENT LIST
        ========================================= */}
        {activeTab === 'appointments' && (
          <section className="cms-panel">
            <h2>Future & Pending Appointments</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Patients listed here are scheduled but have not yet arrived.</p>
            
            <table className="detail-table" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead style={{ backgroundColor: '#333', color: 'white' }}>
                <tr>
                  <th style={{ padding: '12px' }}>Date</th>
                  <th>Time</th>
                  <th>Patient Name</th>
                  <th>Phone Number</th> 
                  <th>Department</th>
                  <th>Assigned Doctor</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {historyList.filter(p => p.visit_type === 'Appointment' && !p.is_active).length === 0 ? (
                  <tr><td colSpan="7" style={{ textAlign: 'center', padding: '20px' }}>No pending appointments.</td></tr>
                ) : (
                  historyList.filter(p => p.visit_type === 'Appointment' && !p.is_active).map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #ddd' }}>
                      <td style={{ padding: '12px' }}>{p.appointment_date ? new Date(p.appointment_date).toLocaleDateString() : 'N/A'}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.appointment_time}</td>
                      <td>{p.name}</td>
                      <td>{p.phone}</td> 
                      <td><span style={{ backgroundColor: '#eee', padding: '4px 8px', borderRadius: '4px' }}>{p.department}</span></td>
                      <td>{p.assigned_doctor !== 'Any' ? `Dr. ${p.assigned_doctor}` : 'Any'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button onClick={() => activatePatient(p.id)} style={{ background: '#28a745', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            Move to Queue ➡
                          </button>
                          {/* --- NEW CANCEL BUTTON --- */}
                          <button onClick={() => handleDeletePatient(p.id)} style={{ background: '#dc3545', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                            🗑️ Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

        {/* =========================================
            TAB 3: ACTIVE QUEUES (COLOR-CODED TABULAR)
        ========================================= */}
        {activeTab === 'queues' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
            {departments.map(dep => {
              const theme = deptColors[dep];
              
              // --- FIXED: Added p.is_active === true to ensure skipped patients don't show here ---
              const depPatients = activeQueue
               .filter(p => p.department === dep && p.is_active === true)
               .sort((a, b) => {
                 if (a.status === 'Serving') return -1;
                 if (b.status === 'Serving') return 1;
                 return 0;
                });

              return (
                <div key={dep} style={{ backgroundColor: 'white', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: `1px solid ${theme.header}` }}>
                  
                  {/* Color Coded Header */}
                  <div style={{ backgroundColor: theme.header, color: 'white', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0, fontSize: '20px' }}>{dep} Active Queue</h2>
                    <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                      <span style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: '5px 10px', borderRadius: '15px', fontWeight: 'bold' }}>
                        {depPatients.filter(p => p.status === 'Waiting').length} Waiting
                      </span>
                      <button onClick={() => handleReceptionistCallNext(dep)} style={{ backgroundColor: 'white', color: theme.header, border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
                        🔊 Call Next
                      </button>
                    </div>
                  </div>

                  {/* Tabular Data */}
                  <div style={{ backgroundColor: theme.bg, minHeight: '150px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ backgroundColor: 'rgba(0,0,0,0.05)' }}>
                        <tr>
                          <th style={{ padding: '12px 20px' }}>Token</th>
                          <th>Patient Name</th>
                          <th>Assigned Doctor</th>
                          <th>Visit Type</th>
                          <th>Live Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {depPatients.length === 0 ? (
                          <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>Queue is empty.</td></tr>
                        ) : (
                          depPatients.map(p => (
                            <tr key={p.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', backgroundColor: p.status === 'Serving' ? 'white' : 'transparent' }}>
                              <td style={{ padding: '12px 20px', fontWeight: 'bold', fontSize: '16px' }}>{p.token}</td>
                              <td style={{ fontSize: '16px' }}>{p.name}</td>
                              <td>{p.assigned_doctor !== 'Any' && p.assigned_doctor !== null ? `Dr. ${p.assigned_doctor}` : 'Any Available'}</td>
                              <td>{p.visit_type === 'Walk-in' ? '🚶 Walk-in' : `📅 ${p.appointment_time}`}</td>
                              <td>
                                {p.status === 'Serving' ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ backgroundColor: '#28a745', color: 'white', padding: '4px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>● SERVING</span>
                                    {/* The Skip Button */}
                                    <button onClick={() => handleSkipPatient(p.id, p.department)} style={{ backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                      🚫 Skip (Unavailable)
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#666', fontWeight: 'bold' }}>Waiting</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* =========================================
            TAB 4: GENERAL HISTORY
        ========================================= */}
        {activeTab === 'history' && (
          <section className="cms-panel">
            <h2>General Patient Archive</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>This is the master list of all patients who have completed their visits.</p>
            <table className="detail-table">
              <thead style={{ backgroundColor: '#f4f4f4' }}>
                <tr>
                  <th>Date Recorded</th>
                  <th>Token History</th>
                  <th>Patient Name</th>
                  <th>Phone Number</th> 
                  <th>Department</th>
                  <th>Doctor Seen</th>
                </tr>
              </thead>
              <tbody>
                {/* --- FIXED: Strictly filter ONLY people who are 'Done' --- */}
                {historyList.filter(p => p.status === 'Done').length === 0 ? (
                  <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No history records found.</td></tr>
                ) : (
                  historyList.filter(p => p.status === 'Done').map(p => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString()}</td>
                      <td>{p.token}</td>
                      <td style={{ fontWeight: 'bold' }}>{p.name}</td>
                      <td>{p.phone}</td> 
                      <td>{p.department}</td>
                      <td>{p.assigned_doctor || 'N/A'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </section>
        )}

      </main>
    </div>
  );
}

export default ReceptionistDashboard;