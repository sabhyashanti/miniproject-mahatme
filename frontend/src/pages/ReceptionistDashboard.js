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
    department: 'OPD-1', assigned_doctor: '', visit_type: 'Walk-in', appointment_time: ''
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [docRes, queueRes, histRes] = await Promise.all([
        fetch('https://mahatme-backend.onrender.com/api/doctors'),
        fetch('https://mahatme-backend.onrender.com/api/queue'), // New Active Queue endpoint
        fetch('https://mahatme-backend.onrender.com/api/patients/history')
      ]);
      if (docRes.ok) setDoctors(await docRes.json());
      if (queueRes.ok) setActiveQueue(await queueRes.json());
      if (histRes.ok) setHistoryList(await histRes.json());
    } catch (error) { console.error("Data sync failed"); }
  };

  const validateForm = () => {
    let newErrors = {};
    if (!/^[a-zA-Z\s]+$/.test(patientForm.name)) newErrors.name = "Letters only.";
    if (!/^\d{12}$/.test(patientForm.aadhaar)) newErrors.aadhaar = "12 digits required.";
    if (!/^\d{10}$/.test(patientForm.phone)) newErrors.phone = "10 digits required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

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
      alert(`Registered! Token: ${token}`);
      setPatientForm({...patientForm, name: '', aadhaar: '', phone: '', address: '', appointment_time: ''});
      fetchData();
    } else alert("Registration failed.");
  };

  const activatePatient = async (id) => {
    await fetch(`https://mahatme-backend.onrender.com/api/patients/activate/${id}`, { method: 'PATCH' });
    fetchData();
  };

  const handleReceptionistCallNext = async (department) => {
    const res = await fetch('https://mahatme-backend.onrender.com/api/patients/next', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ department })
    });
    if (res.ok) fetchData();
    else alert("Queue is empty.");
  };

  const availableDoctors = doctors.filter(doc => doc.department === patientForm.department);
  const departments = ['OPD-1', 'OPD-2', 'OPD-3', 'OPD-4', 'OT-1', 'OT-2'];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">Front Desk<br/><span>Reception</span></div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'register' ? 'active' : ''} onClick={() => setActiveTab('register')}>📝 Registration</li>
          <li className={activeTab === 'appointments' ? 'active' : ''} onClick={() => setActiveTab('appointments')}>📅 Appointment List</li>
          <li className={activeTab === 'queues' ? 'active' : ''} onClick={() => setActiveTab('queues')}>🏥 Active Queues</li>
          <li className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>📂 General History</li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Receptionist Dashboard</h1>
          <button className="logout-btn" onClick={() => navigate('/')}>Logout</button>
        </header>

        {activeTab === 'register' && (
          <section className="cms-panel">
            <h2>Register Patient</h2>
            <form onSubmit={handleRegister} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <input type="text" className="auth-input" placeholder="Name" value={patientForm.name} onChange={e => setPatientForm({...patientForm, name: e.target.value})} required />
              <input type="text" maxLength="12" className="auth-input" placeholder="Aadhaar (12 digits)" value={patientForm.aadhaar} onChange={e => setPatientForm({...patientForm, aadhaar: e.target.value})} required />
              <input type="text" maxLength="10" className="auth-input" placeholder="Phone (10 digits)" value={patientForm.phone} onChange={e => setPatientForm({...patientForm, phone: e.target.value})} required />
              <input type="text" className="auth-input" placeholder="Address" value={patientForm.address} onChange={e => setPatientForm({...patientForm, address: e.target.value})} required />
              <select className="auth-select" value={patientForm.department} onChange={e => setPatientForm({...patientForm, department: e.target.value})}>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="auth-select" value={patientForm.assigned_doctor} onChange={e => setPatientForm({...patientForm, assigned_doctor: e.target.value})} required>
                <option value="">-- Select Doctor --</option>
                {availableDoctors.map(d => <option key={d.id} value={d.username}>Dr. {d.username}</option>)}
              </select>
              <button type="submit" className="upload-btn" style={{ gridColumn: 'span 2' }}>Register</button>
            </form>
          </section>
        )}

        {activeTab === 'appointments' && (
          <section className="cms-panel">
            <h2>Upcoming Appointments</h2>
            <table className="detail-table">
              <thead><tr><th>Patient</th><th>Dept</th><th>Time</th><th>Action</th></tr></thead>
              <tbody>
                {historyList.filter(p => p.visit_type === 'Appointment' && !p.is_active).map(p => (
                  <tr key={p.id}>
                    <td>{p.name}</td><td>{p.department}</td><td>{p.appointment_time}</td>
                    <td><button onClick={() => activatePatient(p.id)} style={{background:'#28a745', color:'white', border:'none', padding:'5px 10px', borderRadius:'4px'}}>Activate</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {activeTab === 'queues' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            {departments.map(dep => (
              <div key={dep} className="stat-detail-panel" style={{margin: 0}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                    <h3>{dep}</h3>
                    <button onClick={() => handleReceptionistCallNext(dep)} style={{background:'#0056b3', color:'white', border:'none', padding:'5px', cursor:'pointer'}}>Call Next</button>
                </div>
                {activeQueue.filter(p => p.department === dep).map(p => (
                    <div key={p.id} style={{padding:'10px', borderBottom:'1px solid #eee'}}>{p.token} - {p.name} ({p.status})</div>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <section className="cms-panel">
            <h2>General Patient Archive</h2>
            <table className="detail-table">
              <thead><tr><th>Name</th><th>Token</th><th>Visited</th></tr></thead>
              <tbody>
                {historyList.map(p => (
                  <tr key={p.id}><td>{p.name}</td><td>{p.token}</td><td>{new Date(p.created_at).toLocaleDateString()}</td></tr>
                ))}
              </tbody>
            </table>
          </section>
        )}
      </main>
    </div>
  );
}

export default ReceptionistDashboard;