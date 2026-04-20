import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; // Reusing your existing styles

function ReceptionistDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('register');
  
  // Data States
  const [doctors, setDoctors] = useState([]);
  const [allPatients, setAllPatients] = useState([]);
  
  // Form State
  const [patientForm, setPatientForm] = useState({
    name: '', aadhaar: '', phone: '', address: '', 
    department: 'OPD-1', assigned_doctor: '', visit_type: 'Walk-in', appointment_time: ''
  });

  // Validation Errors State
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Live sync every 5s
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const docRes = await fetch('https://mahatme-backend.onrender.com/api/doctors');
      if (docRes.ok) setDoctors(await docRes.json());

      const patRes = await fetch('https://mahatme-backend.onrender.com/api/patients');
      if (patRes.ok) setAllPatients(await patRes.json());
    } catch (error) { console.error("Data sync failed"); }
  };

  // --- STRICT VALIDATION LOGIC ---
  const validateForm = () => {
    let newErrors = {};
    if (!/^[a-zA-Z\s]+$/.test(patientForm.name)) newErrors.name = "Name must contain only letters and spaces.";
    if (!/^\d{12}$/.test(patientForm.aadhaar)) newErrors.aadhaar = "Aadhaar must be exactly 12 digits.";
    if (!/^\d{10}$/.test(patientForm.phone)) newErrors.phone = "Phone must be exactly 10 digits.";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0; // Returns true if no errors
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!validateForm()) return; // Stop if validation fails

    // Generate a token like "OPD1-104"
    const token = `${patientForm.department.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...patientForm, token })
      });
      const data = await response.json();
      
      if (response.ok) {
        alert(`Registered Successfully! Token: ${token}`);
        setPatientForm({ ...patientForm, name: '', aadhaar: '', phone: '', address: '', appointment_time: '' });
        fetchData();
      } else {
        alert(data.error);
      }
    } catch (error) { alert("Failed to register patient."); }
  };

  // Filter doctors based on the selected department
  const availableDoctors = doctors.filter(doc => doc.department === patientForm.department);

  // Group patients into their 6 respective queues
  const departments = ['OPD-1', 'OPD-2', 'OPD-3', 'OPD-4', 'OT-1', 'OT-2'];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">Front Desk<br/><span style={{ fontSize: '14px', fontWeight: 'normal' }}>Reception</span></div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'register' ? 'active' : ''} onClick={() => {setActiveTab('register'); setPatientForm({...patientForm, visit_type: 'Walk-in'})}}>📝 Walk-in Registration</li>
          <li className={activeTab === 'appointment' ? 'active' : ''} onClick={() => {setActiveTab('appointment'); setPatientForm({...patientForm, visit_type: 'Appointment'})}}>📅 Book Appointment</li>
          <li className={activeTab === 'queues' ? 'active' : ''} onClick={() => setActiveTab('queues')}>🏥 Live Department Queues</li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Receptionist Dashboard</h1>
          <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
        </header>

        {/* --- REGISTRATION & APPOINTMENT FORM --- */}
        {(activeTab === 'register' || activeTab === 'appointment') && (
          <section className="cms-panel">
            <h2>{activeTab === 'register' ? 'Register Walk-in Patient' : 'Schedule Doctor Appointment'}</h2>
            
            <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              
              <div className="form-group">
                <label>Patient Full Name</label>
                <input type="text" className="auth-input" value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})} required />
                {errors.name && <small style={{color: 'red'}}>{errors.name}</small>}
              </div>

              <div className="form-group">
                <label>12-Digit Aadhaar</label>
                <input type="text" maxLength="12" className="auth-input" value={patientForm.aadhaar} onChange={e => setPatientForm({...patientForm, aadhaar: e.target.value})} required />
                {errors.aadhaar && <small style={{color: 'red'}}>{errors.aadhaar}</small>}
              </div>

              <div className="form-group">
                <label>10-Digit Phone Number</label>
                <input type="text" maxLength="10" className="auth-input" value={patientForm.phone} onChange={e => setPatientForm({...patientForm, phone: e.target.value})} required />
                {errors.phone && <small style={{color: 'red'}}>{errors.phone}</small>}
              </div>

              <div className="form-group">
                <label>Home Address</label>
                <input type="text" className="auth-input" value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})} required />
              </div>

              <div className="form-group">
                <label>Assign to Department</label>
                <select className="auth-select" value={patientForm.department} onChange={e => setPatientForm({...patientForm, department: e.target.value, assigned_doctor: ''})}>
                  {departments.map(dep => <option key={dep} value={dep}>{dep}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label>Select Doctor (Filtered by Dept)</label>
                <select className="auth-select" value={patientForm.assigned_doctor} onChange={e => setPatientForm({...patientForm, assigned_doctor: e.target.value})} required>
                  <option value="">-- Choose Doctor --</option>
                  {availableDoctors.length === 0 && <option disabled>No doctors assigned to this department</option>}
                  {availableDoctors.map(doc => <option key={doc.id} value={doc.username}>Dr. {doc.username}</option>)}
                </select>
              </div>

              {activeTab === 'appointment' && (
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label>Scheduled Time</label>
                  <input type="time" className="auth-input" value={patientForm.appointment_time} onChange={e => setPatientForm({...patientForm, appointment_time: e.target.value})} required />
                </div>
              )}

              <button type="submit" className="upload-btn" style={{ gridColumn: 'span 2', backgroundColor: activeTab === 'register' ? '#0056b3' : '#28a745' }}>
                {activeTab === 'register' ? 'Generate Token & Add to Queue' : 'Lock in Appointment'}
              </button>
            </form>
          </section>
        )}

        {/* --- MULTI-QUEUE TRACKING DASHBOARD --- */}
        {activeTab === 'queues' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {departments.map(dep => {
              // Filter patients for THIS specific department
              const depPatients = allPatients.filter(p => p.department === dep && p.status !== 'Done');
              
              return (
                <div key={dep} className="stat-detail-panel" style={{ margin: 0, height: '400px', overflowY: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '10px' }}>
                    <h2 style={{ margin: 0, color: '#0056b3' }}>{dep} Queue</h2>
                    <span style={{ backgroundColor: '#eef2f6', padding: '5px 10px', borderRadius: '15px', fontWeight: 'bold' }}>{depPatients.length} Waiting</span>
                  </div>
                  
                  <table className="detail-table" style={{ fontSize: '14px' }}>
                    <thead><tr><th>Token</th><th>Name</th><th>Doctor</th><th>Type</th><th>Status</th></tr></thead>
                    <tbody>
                      {depPatients.length === 0 ? <tr><td colSpan="5" style={{ textAlign: 'center', color: '#666' }}>Queue Clear</td></tr> : 
                       depPatients.map(p => (
                        <tr key={p.id} style={{ backgroundColor: p.status === 'Serving' ? '#e6ffe6' : 'white' }}>
                          <td style={{ fontWeight: 'bold' }}>{p.token}</td>
                          <td>{p.name}</td>
                          <td>{p.assigned_doctor || 'Any'}</td>
                          <td>{p.visit_type === 'Appointment' ? `🕒 ${p.appointment_time}` : '🚶 Walk-in'}</td>
                          <td><span style={{ color: p.status === 'Serving' ? 'green' : '#666', fontWeight: 'bold' }}>{p.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default ReceptionistDashboard;