import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; // Reusing existing beautiful CSS

function DoctorDashboard() {
  const navigate = useNavigate();
  const [queue, setQueue] = useState([]);
  
  // Retrieve the doctor's details from browser memory
  const userRole = localStorage.getItem('userRole'); 
  const username = localStorage.getItem('userName');
  const userDepartment = localStorage.getItem('userDepartment') || 'General';

  // --- SECURITY CHECK & POLLING ---
  useEffect(() => {
    if (userRole !== 'doctor') {
      navigate('/');
      return;
    }
    fetchMyQueue();
    const intervalId = setInterval(fetchMyQueue, 3000);
    return () => clearInterval(intervalId);
  }, [navigate, userRole]);

  // --- FETCH ONLY MY PATIENTS ---
  const fetchMyQueue = async () => {
    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/patients');
      if (response.ok) {
        const allPatients = await response.json();
        // Filter: Only show patients assigned to MY department
        const myPatients = allPatients.filter(p => p.department === userDepartment);
        setQueue(myPatients);
      }
    } catch (error) {
      console.error("Failed to fetch queue");
    }
  };

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/');
  };

  // --- CALL NEXT PATIENT (DEPARTMENT SPECIFIC) ---
  const handleCallNext = async () => {
    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/patients/next', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: userDepartment, doctor_name: username })
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchMyQueue(); 
      } else alert("Error: " + data.error);
    } catch (error) {
      alert("Network Error: Could not call next patient.");
    }
  };

  const currentlyServing = queue.find(p => p.status === 'Serving');

  return (
    <div className="admin-container">
      <aside className="admin-sidebar" style={{ backgroundColor: '#28a745' }}>
        <div className="sidebar-brand">
          Doctor's Cabin<br/>
          <span style={{ fontSize: '14px', fontWeight: 'normal' }}>{userDepartment}</span>
        </div>
        <ul className="sidebar-nav">
          <li className="active">🩺 My Live Queue</li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{ margin: 0 }}>Welcome, Dr. {username}</h1>
            <p style={{ margin: 0, color: '#666' }}>Managing Queue for: {userDepartment}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        {/* --- CALL PATIENT PANEL --- */}
        <section className="stat-detail-panel" style={{ textAlign: 'center', padding: '40px', backgroundColor: '#e6ffe6', border: '2px solid #28a745' }}>
          <h2 style={{ color: '#28a745', fontSize: '28px', marginBottom: '10px' }}>Currently Examining</h2>
          
          <div style={{ margin: '20px 0', padding: '20px', backgroundColor: 'white', borderRadius: '10px', display: 'inline-block', minWidth: '300px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h1 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#333' }}>
              {currentlyServing ? currentlyServing.token : '---'}
            </h1>
            <p style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>
              {currentlyServing ? currentlyServing.name : 'Cabin Empty'}
            </p>
            {currentlyServing && (
              <p style={{ margin: '10px 0 0 0', color: '#666' }}>
                {currentlyServing.visit_type === 'Appointment' ? `Appointment: ${currentlyServing.appointment_time}` : 'Walk-in'}
              </p>
            )}
          </div>
          
          <br/>
          <button 
            className="upload-btn" 
            onClick={handleCallNext} 
            style={{ backgroundColor: '#28a745', fontSize: '24px', padding: '20px 40px', marginTop: '20px', borderRadius: '50px' }}
          >
            🔊 Call Next Patient
          </button>
        </section>

        {/* --- WAITING LIST --- */}
        <div className="stat-detail-panel" style={{ marginTop: '30px' }}>
          <h2>Patients Waiting Outside</h2>
          <table className="detail-table">
            <thead>
              <tr>
                <th>Token</th>
                <th>Patient Name</th>
                <th>Visit Type</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {queue.filter(p => p.status !== 'Serving').length === 0 ? (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>No patients waiting. Time for a coffee break! ☕</td></tr>
              ) : (
                queue.filter(p => p.status !== 'Serving').map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 'bold' }}>{p.token}</td>
                    <td>{p.name}</td>
                    <td>{p.visit_type === 'Appointment' ? `🕒 ${p.appointment_time}` : '🚶 Walk-in'}</td>
                    <td><span style={{ color: '#666', fontWeight: 'bold' }}>Waiting</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default DoctorDashboard;