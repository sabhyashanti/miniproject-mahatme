import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css'; 

function DoctorDashboard() {
  const navigate = useNavigate();
  const [activeQueue, setActiveQueue] = useState([]);
  const [historyList, setHistoryList] = useState([]);
  const [activeTab, setActiveTab] = useState('waiting'); // 'waiting' or 'upcoming'
  
  // Retrieve the doctor's details from browser memory
  const userRole = localStorage.getItem('userRole'); 
  const userName = localStorage.getItem('userName');
  const userDepartment = localStorage.getItem('userDepartment') || 'General';

  // --- SECURITY CHECK & POLLING ---
  useEffect(() => {
    if (userRole !== 'doctor') {
      navigate('/');
      return;
    }
    fetchMyData();
    const intervalId = setInterval(fetchMyData, 3000); // Fast sync for doctors
    return () => clearInterval(intervalId);
  }, [navigate, userRole]);

  // --- FETCH DATA ---
  const fetchMyData = async () => {
    try {
      const [queueRes, histRes] = await Promise.all([
        fetch('https://mahatme-backend.onrender.com/api/queue'),
        fetch('https://mahatme-backend.onrender.com/api/patients/history')
      ]);
      
      if (queueRes.ok) setActiveQueue(await queueRes.json());
      if (histRes.ok) setHistoryList(await histRes.json());
    } catch (error) {
      console.error("Failed to fetch data");
    }
  };

  const handleLogout = () => {
    localStorage.clear(); 
    navigate('/');
  };

  // --- CALL NEXT PATIENT ---
  const handleCallNext = async () => {
    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/patients/next', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ department: userDepartment, doctor_name: userName })
      });
      
      const data = await response.json();
      if (response.ok) {
        fetchMyData(); 
      } else alert("Queue update: " + data.message);
    } catch (error) {
      alert("Network Error: Could not call next patient.");
    }
  };

  // --- SKIP PATIENT (If they didn't show up when called) ---
  const handleSkipPatient = async (patientId) => {
    try {
      await fetch(`https://mahatme-backend.onrender.com/api/patients/skip/${patientId}`, { method: 'PUT' });
      await handleCallNext(); // Automatically call the next person
    } catch (error) {
      alert("Error skipping patient.");
    }
  };

  // ==========================================
  // DATA FILTERING (Crucial for Doctor Privacy)
  // ==========================================
  
  // 1. Find patients who are actively waiting/serving, in THIS department, assigned to THIS doctor (or 'Any')
  const myActivePatients = activeQueue.filter(p => 
    p.department === userDepartment && 
    (p.assigned_doctor === userName || p.assigned_doctor === 'Any' || !p.assigned_doctor)
  );

  // 2. Identify who is currently in the cabin
  const currentlyServing = myActivePatients.find(p => p.status === 'Serving');
  
  // 3. Identify who is waiting outside
  const myWaitingPatients = myActivePatients.filter(p => p.status === 'Waiting');

  // 4. Find future appointments (Not yet activated by Receptionist)
  const myUpcomingAppointments = historyList.filter(p => 
    p.visit_type === 'Appointment' && 
    !p.is_active && 
    p.department === userDepartment && 
    (p.assigned_doctor === userName || p.assigned_doctor === 'Any' || !p.assigned_doctor)
  );

  return (
    <div className="admin-container">
      <aside className="admin-sidebar" style={{ backgroundColor: '#28a745' }}>
        <div className="sidebar-brand" style={{ color: 'white' }}>
          Doctor's Cabin<br/>
          <span style={{ fontSize: '14px', fontWeight: 'normal', color: '#e6ffe6' }}>{userDepartment}</span>
        </div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'waiting' ? 'active' : ''} onClick={() => setActiveTab('waiting')} style={{ color: activeTab === 'waiting' ? '#28a745' : 'white' }}>
            🩺 Active Queue ({myWaitingPatients.length})
          </li>
          <li className={activeTab === 'upcoming' ? 'active' : ''} onClick={() => setActiveTab('upcoming')} style={{ color: activeTab === 'upcoming' ? '#28a745' : 'white' }}>
            📅 My Schedule ({myUpcomingAppointments.length})
          </li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div>
            <h1 style={{ margin: 0 }}>Welcome, Dr. {userName}</h1>
            <p style={{ margin: 0, color: '#666' }}>Managing queue for: {userDepartment}</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        {/* --- TOP PANEL: CURRENTLY SERVING & CONTROLS --- */}
        <section className="stat-detail-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '30px 40px', backgroundColor: '#e6ffe6', border: '2px solid #28a745', marginBottom: '30px' }}>
          
          <div style={{ flex: 1 }}>
            <h2 style={{ color: '#28a745', margin: '0 0 15px 0' }}>Currently Examining</h2>
            {currentlyServing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <div style={{ backgroundColor: 'white', padding: '15px 25px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', borderLeft: '5px solid #28a745' }}>
                  <h1 style={{ fontSize: '36px', margin: '0 0 5px 0', color: '#333' }}>{currentlyServing.token}</h1>
                  <p style={{ fontSize: '20px', margin: 0, fontWeight: 'bold' }}>{currentlyServing.name}</p>
                </div>
                <div>
                  <p style={{ margin: '0 0 5px 0', color: '#555' }}><strong>📞 Phone:</strong> {currentlyServing.phone}</p>
                  <p style={{ margin: '0 0 5px 0', color: '#555' }}><strong>🏥 Type:</strong> {currentlyServing.visit_type === 'Appointment' ? `Appointment at ${currentlyServing.appointment_time}` : 'Walk-in'}</p>
                  <p style={{ margin: 0, color: '#555' }}><strong>📝 Note:</strong> Ensure all files are updated before calling next.</p>
                </div>
              </div>
            ) : (
              <div style={{ padding: '20px', backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: '10px', color: '#666', fontStyle: 'italic' }}>
                Cabin is empty. Call the next patient to begin.
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', minWidth: '250px' }}>
            <button 
              className="upload-btn" 
              onClick={handleCallNext} 
              style={{ backgroundColor: '#28a745', fontSize: '20px', padding: '20px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(40, 167, 69, 0.3)' }}
            >
              {currentlyServing ? '✅ Finish & Call Next' : '🔊 Call First Patient'}
            </button>
            
            {currentlyServing && (
              <button 
                onClick={() => handleSkipPatient(currentlyServing.id)} 
                style={{ backgroundColor: '#ffc107', color: '#333', border: 'none', padding: '12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              >
                🚫 Patient Missing (Skip & Requeue)
              </button>
            )}
          </div>
        </section>

        {/* --- BOTTOM PANEL: TABS --- */}
        {activeTab === 'waiting' && (
          <div className="stat-detail-panel">
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Patients Waiting Outside</h2>
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Token</th>
                  <th>Patient Name</th>
                  <th>Phone Number</th>
                  <th>Visit Type</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myWaitingPatients.length === 0 ? (
                  <tr><td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#666', fontSize: '16px' }}>No patients currently waiting. Time for a coffee break! ☕</td></tr>
                ) : (
                  myWaitingPatients.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold', fontSize: '16px', color: '#0056b3' }}>{p.token}</td>
                      <td style={{ fontSize: '16px' }}>{p.name}</td>
                      <td>{p.phone}</td>
                      <td>{p.visit_type === 'Appointment' ? `🕒 Appt: ${p.appointment_time}` : '🚶 Walk-in'}</td>
                      <td><span style={{ backgroundColor: '#eef2f6', color: '#666', padding: '5px 10px', borderRadius: '12px', fontWeight: 'bold', fontSize: '12px' }}>Waiting</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'upcoming' && (
          <div className="stat-detail-panel">
            <h2 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px' }}>Today's Upcoming Appointments</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>These patients are scheduled for today but have not yet checked in at the reception desk.</p>
            <table className="detail-table">
              <thead>
                <tr>
                  <th>Scheduled Time</th>
                  <th>Patient Name</th>
                  <th>Phone Number</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myUpcomingAppointments.length === 0 ? (
                  <tr><td colSpan="4" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No upcoming appointments scheduled.</td></tr>
                ) : (
                  myUpcomingAppointments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 'bold' }}>{p.appointment_time}</td>
                      <td>{p.name}</td>
                      <td>{p.phone}</td>
                      <td><span style={{ color: '#999', fontStyle: 'italic' }}>Pending Check-in</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}

export default DoctorDashboard;