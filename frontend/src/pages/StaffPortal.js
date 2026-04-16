import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './StaffPortal.css';

function StaffPortal() {
  const navigate = useNavigate();
  
  // Retrieve the user's role from browser memory
  const userRole = localStorage.getItem('userRole'); 
  
  // Set the default view: Receptionists start at the desk, Doctors start in the cabin
  const [view, setView] = useState(userRole === 'receptionist' ? 'reception' : 'doctor'); 
  
  // Form State
  const [patientName, setPatientName] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  const [queue, setQueue] = useState([]);

  // --- FETCH LIVE QUEUE FROM DATABASE ---
  const fetchQueue = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/patients');
      if (response.ok) {
        const data = await response.json();
        setQueue(data);
      }
    } catch (error) {
      console.error("Failed to fetch queue");
    }
  };

  // --- SECURITY & POLLING ---
  useEffect(() => {
    // Kick out anyone who isn't logged in as a staff member
    if (!userRole || userRole === 'admin') {
      navigate('/');
      return;
    }

    // Fetch immediately, then poll every 2 seconds to keep screens synced
    fetchQueue();
    const intervalId = setInterval(fetchQueue, 2000);
    return () => clearInterval(intervalId);
  }, [navigate, userRole]);

  const handleLogout = () => {
    localStorage.removeItem('userRole'); // Clear auth memory
    navigate('/');
  };

  // --- RECEPTION: Save to Database & Generate Token ---
  const handleGenerateToken = async (e) => {
    e.preventDefault();
    if (!patientName || !aadhaar || !phone) {
      alert("Please fill in the required fields.");
      return;
    }

    // Dynamic token generation based on current queue
    const newToken = `R-${queue.length + 101}`;
    
    const patientData = {
      token: newToken,
      name: patientName,
      aadhaar: aadhaar,
      phone: phone,
      address: address
    };

    try {
      const response = await fetch('http://localhost:5000/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patientData),
      });

      if (response.ok) {
        alert(`Success! Token ${newToken} generated for ${patientName}`);
        
        // Clear form and refresh queue instantly
        setPatientName('');
        setAadhaar('');
        setPhone('');
        setAddress('');
        fetchQueue(); 
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (error) {
      alert("Failed to connect to the database.");
    }
  };

  // --- DOCTOR: Call Next Patient (via Backend) ---
  const handleCallNext = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/patients/next', {
        method: 'PUT'
      });
      
      const data = await response.json();

      if (response.ok) {
        console.log("Backend says:", data.message);
        fetchQueue(); // Refresh frontend instantly
      } else {
        alert("Server Error: " + data.error);
      }
    } catch (error) {
      alert("Network Error: Could not reach the backend to call the next patient. Is your server running?");
    }
  };

  const currentlyServing = queue.find(p => p.status === 'Serving');

  return (
    <div className="staff-container">
      <header className="staff-header">
        <div>
          <h1>Token Manager</h1>
          <p style={{ margin: 0, color: '#666' }}>
            Mahatme Eye Hospital - {userRole === 'doctor' ? "Doctor's Portal" : "Reception Portal"}
          </p>
        </div>
        
        <div className="role-toggle">
          <button className="role-btn" onClick={() => window.open('/display', '_blank')} style={{ backgroundColor: '#17a2b8', color: 'white', borderColor: '#17a2b8' }}>
            📺 Launch TV Display
          </button>
          
          {/* SECURITY: Only show Reception Desk if the user is a Receptionist */}
          {userRole === 'receptionist' && (
            <button className={`role-btn ${view === 'reception' ? 'active' : ''}`} onClick={() => setView('reception')}>
              Reception Desk
            </button>
          )}

          {/* Both Receptionist and Doctor can see the Doctor's Cabin */}
          <button className={`role-btn ${view === 'doctor' ? 'active' : ''}`} onClick={() => setView('doctor')}>
            Doctor's Cabin
          </button>
          
          <button className="role-btn" onClick={handleLogout} style={{ borderColor: '#dc3545', color: '#dc3545' }}>
            Logout
          </button>
        </div>
      </header>

      {/* --- RECEPTION VIEW --- */}
      {view === 'reception' && userRole === 'receptionist' && (
        <section className="reception-panel">
          <h2>Register Patient & Generate Token</h2>
          <form className="registration-form" onSubmit={handleGenerateToken}>
            <div>
              <label>Full Name *</label>
              <input type="text" className="patient-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} required />
            </div>
            <div>
              <label>Phone Number *</label>
              <input type="tel" className="patient-input" value={phone} onChange={(e) => setPhone(e.target.value)} required />
            </div>
            <div>
              <label>Aadhaar Number (12 Digits) *</label>
              <input type="text" className="patient-input" maxLength="12" value={aadhaar} onChange={(e) => setAadhaar(e.target.value)} required />
            </div>
            <div className="form-group-full">
              <label>Residential Address</label>
              <textarea className="patient-input" rows="2" value={address} onChange={(e) => setAddress(e.target.value)}></textarea>
            </div>
            <button type="submit" className="generate-btn">Save Patient & Generate Token</button>
          </form>
        </section>
      )}

      {/* --- DOCTOR VIEW --- */}
      {view === 'doctor' && (
        <section className="doctor-panel">
          <div className="current-serving">
            <h2>Currently Serving</h2>
            <p className="token-display">{currentlyServing ? currentlyServing.token : 'No Active Patient'}</p>
            <p style={{ margin: '10px 0 0 0', fontSize: '18px' }}>{currentlyServing ? currentlyServing.name : 'Queue is empty'}</p>
          </div>
          <button className="call-next-btn" onClick={handleCallNext}>Call Next Patient</button>
        </section>
      )}

      {/* --- LIVE QUEUE DISPLAY --- */}
      <h2>Live Queue Status</h2>
      <table className="queue-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Patient Name</th>
            <th>Contact</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {queue.map((patient) => (
            <tr key={patient.id}>
              <td style={{ fontWeight: 'bold' }}>{patient.token}</td>
              <td>{patient.name}</td>
              <td>{patient.phone}</td>
              <td><span className={`status-badge status-${patient.status.toLowerCase()}`}>{patient.status}</span></td>
            </tr>
          ))}
          {queue.length === 0 && (
            <tr><td colSpan="4" style={{ textAlign: 'center' }}>No patients in queue</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default StaffPortal;