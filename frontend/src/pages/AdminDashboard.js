import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to overview
  
  // States for the interactive Overview
  const [expandedStat, setExpandedStat] = useState(null);
  const [liveQueueData, setLiveQueueData] = useState([]);
  
  // State for adding new staff members
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    role: 'receptionist' 
  });

  // NEW: States for CMS and Emergency Overrides
  const [cmsInput, setCmsInput] = useState({ video: '', text: '' });
  const [emergencyInput, setEmergencyInput] = useState('');

  const handleLogout = () => {
    navigate('/');
  };

  // --- FETCH LIVE QUEUE WHEN CLICKED ---
  const fetchLiveQueue = async () => {
    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/patients');
      if (response.ok) {
        const data = await response.json();
        setLiveQueueData(data);
      }
    } catch (error) {
      console.error("Failed to fetch live queue for dashboard");
    }
  };

  const toggleStat = (statName) => {
    if (expandedStat === statName) {
      setExpandedStat(null); // Close if already open
    } else {
      setExpandedStat(statName);
      if (statName === 'queue') fetchLiveQueue(); // Fetch real data if queue is clicked
    }
  };

  // --- ADMIN: Register New Users ---
  const handleAdminSignup = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('https://mahatme-backend.onrender.com/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully registered ${newUser.username} as ${newUser.role}`);
        setNewUser({ username: '', password: '', role: 'receptionist' }); // Reset form to default
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  // --- ADMIN: Update TV Content (CMS) ---
  const handleCMSUpload = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_url: cmsInput.video, announcement: cmsInput.text, is_emergency: false })
      });
      alert("TV Display Updated Successfully!");
      setCmsInput({ video: '', text: '' }); // Clear input
    } catch (error) {
      alert("Failed to update TV screens. Is the server running?");
    }
  };

  // --- ADMIN: Trigger Emergency ---
  const handleEmergencyTrigger = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_emergency: true, emergency_text: emergencyInput })
      });
      alert("🚨 EMERGENCY OVERRIDE DEPLOYED TO ALL SCREENS 🚨");
    } catch (error) {
      alert("Failed to trigger emergency protocol.");
    }
  };

  // --- ADMIN: Clear Emergency ---
  const clearEmergency = async () => {
    try {
      await fetch('https://mahatme-backend.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_emergency: false })
      });
      alert("Emergency cleared. Systems returned to normal.");
      setEmergencyInput(''); // Clear input
    } catch (error) {
      alert("Failed to clear emergency.");
    }
  };

  // --- MOCK DATA FOR DASHBOARD STATS ---
  const mockBoards = [
    { id: 'TV-01', location: 'Main Reception OPD', status: 'Online', ip: '192.168.1.10' },
    { id: 'TV-02', location: 'Retina Department', status: 'Online', ip: '192.168.1.11' },
    { id: 'TV-03', location: 'Cataract Waiting', status: 'Online', ip: '192.168.1.12' },
    { id: 'TV-04', location: 'Pharmacy', status: 'Offline', ip: '192.168.1.13' },
  ];

  const mockMedia = [
    { title: 'Eye Donation Awareness', type: 'Video', schedule: '09:00 AM - 12:00 PM', screens: 'All' },
    { title: 'Cataract Post-Care', type: 'Image', schedule: '01:00 PM - 04:00 PM', screens: 'OPD-1' },
    { title: 'Doctor Duty Roster', type: 'Image', schedule: 'Continuous', screens: 'Reception' },
  ];

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          Mahatme Eye Hospital<br/>
          <span style={{ fontSize: '14px', fontWeight: 'normal' }}>System Admin</span>
        </div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
            📊 Overview
          </li>
          <li className={activeTab === 'cms' ? 'active' : ''} onClick={() => setActiveTab('cms')}>
            📺 CMS (TV Manager)
          </li>
          <li className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')}>
            📁 Media Library
          </li>
          <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            👥 User Management
          </li>
          <li className={activeTab === 'emergency' ? 'active' : ''} onClick={() => setActiveTab('emergency')} style={{ color: '#ff9999' }}>
            🚨 Emergency Broadcast
          </li>
        </ul>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>Admin Control Center</h1>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        {/* --- OVERVIEW TAB --- */}
        {activeTab === 'dashboard' && (
          <>
            <div className="stats-grid">
              <div className={`stat-card clickable ${expandedStat === 'boards' ? 'active-stat' : ''}`} onClick={() => toggleStat('boards')}>
                <h3>Active Digital Boards</h3>
                <p className="stat-value">3 / 4</p>
                <small style={{color: '#0056b3'}}>Click to view details</small>
              </div>
              <div className={`stat-card clickable ${expandedStat === 'queue' ? 'active-stat' : ''}`} onClick={() => toggleStat('queue')}>
                <h3>Total Patients in Queue</h3>
                <p className="stat-value">{liveQueueData.length > 0 ? liveQueueData.length : 'Live'}</p>
                <small style={{color: '#0056b3'}}>Click to view live queue</small>
              </div>
              <div className={`stat-card clickable ${expandedStat === 'media' ? 'active-stat' : ''}`} onClick={() => toggleStat('media')}>
                <h3>Scheduled Media</h3>
                <p className="stat-value">3 Items</p>
                <small style={{color: '#0056b3'}}>Click to view schedule</small>
              </div>
            </div>

            {expandedStat === 'boards' && (
              <div className="stat-detail-panel">
                <h2>Network Hardware Status</h2>
                <table className="detail-table">
                  <thead><tr><th>Board ID</th><th>Location</th><th>IP Address</th><th>Status</th></tr></thead>
                  <tbody>
                    {mockBoards.map(b => (
                      <tr key={b.id}>
                        <td>{b.id}</td><td>{b.location}</td><td>{b.ip}</td>
                        <td><span style={{ color: b.status === 'Online' ? 'green' : 'red', fontWeight: 'bold' }}>{b.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expandedStat === 'queue' && (
              <div className="stat-detail-panel">
                <h2>Live Patient Queue (Fetched from Database)</h2>
                <table className="detail-table">
                  <thead><tr><th>Token</th><th>Patient Name</th><th>Status</th><th>Time Added</th></tr></thead>
                  <tbody>
                    {liveQueueData.length === 0 ? <tr><td colSpan="4">No patients currently in queue.</td></tr> : 
                     liveQueueData.map(p => (
                      <tr key={p.id}>
                        <td>{p.token}</td><td>{p.name}</td>
                        <td><span className={`status-badge status-${p.status.toLowerCase()}`}>{p.status}</span></td>
                        <td>{new Date(p.created_at).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {expandedStat === 'media' && (
              <div className="stat-detail-panel">
                <h2>Today's Content Schedule</h2>
                <table className="detail-table">
                  <thead><tr><th>Media Title</th><th>Type</th><th>Time Slot</th><th>Target Screens</th></tr></thead>
                  <tbody>
                    {mockMedia.map((m, i) => (
                      <tr key={i}><td>{m.title}</td><td>{m.type}</td><td>{m.schedule}</td><td>{m.screens}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* --- CMS TAB (LIVE API CONNECTED) --- */}
        {activeTab === 'cms' && (
          <section className="cms-panel">
            <h2>Update Live TV Content</h2>
            <form onSubmit={handleCMSUpload}>
              <div className="form-group">
                <label>Scrolling Announcement Text *</label>
                <input 
                  type="text" 
                  placeholder="e.g., Free Cataract Screening Camp on Sunday..." 
                  value={cmsInput.text} 
                  onChange={e => setCmsInput({...cmsInput, text: e.target.value})} 
                  required 
                />
              </div>
              
              <div className="form-group">
                <label>YouTube Embed URL (Optional)</label>
                <input 
                  type="url" 
                  placeholder="https://www.youtube.com/embed/..." 
                  value={cmsInput.video} 
                  onChange={e => setCmsInput({...cmsInput, video: e.target.value})} 
                />
                <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
                  Leave blank to keep the current video. Ensure it is an 'embed' link.
                </small>
              </div>

              <button type="submit" className="upload-btn">Publish to TV Screens</button>
            </form>
          </section>
        )}

        {/* --- MEDIA LIBRARY TAB --- */}
        {activeTab === 'media' && (
          <section className="cms-panel">
            <h2>Media Library</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Your uploaded assets repository.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
              <div style={{ background: '#eef2f6', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: 'bold', color: '#0056b3' }}>Eye_Care_Vid.mp4</div>
              <div style={{ background: '#eef2f6', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', fontWeight: 'bold', color: '#0056b3' }}>Doctors_Roster.jpg</div>
              <div style={{ background: '#f8f9fa', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', border: '2px dashed #ccc', cursor: 'pointer', color: '#666' }}>+ Upload New File</div>
            </div>
          </section>
        )}

        {/* --- USER MANAGEMENT TAB --- */}
        {activeTab === 'users' && (
          <section className="cms-panel">
            <h2>Register New Staff Member</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Create credentials for new Doctors or Receptionists.
            </p>
            <form className="auth-form" onSubmit={handleAdminSignup}>
              <div className="form-group">
                <label>Username</label>
                <input 
                  type="text" 
                  className="auth-input"
                  placeholder="Enter username" 
                  value={newUser.username}
                  onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Temporary Password</label>
                <input 
                  type="password" 
                  className="auth-input"
                  placeholder="Enter password" 
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Assign Role</label>
                <select 
                  className="auth-select"
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                >
                  <option value="receptionist">Receptionist (Full Access)</option>
                  <option value="doctor">Doctor (Cabin Access Only)</option>
                  <option value="admin">Admin (System Manager)</option>
                </select>
              </div>
              <button type="submit" className="upload-btn" style={{backgroundColor: '#0056b3'}}>
                Create Account
              </button>
            </form>
          </section>
        )}

        {/* --- EMERGENCY BROADCAST TAB (LIVE API CONNECTED) --- */}
        {activeTab === 'emergency' && (
          <section className="cms-panel emergency-panel">
            <h2 style={{color: '#dc3545'}}>🚨 EMERGENCY OVERRIDE SYSTEM</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>Use this panel to instantly interrupt all normal scheduling and queue displays across the hospital.</p>
            
            <form onSubmit={handleEmergencyTrigger}>
              <div className="form-group">
                <label>Emergency Message Text</label>
                <textarea 
                  rows="3" 
                  placeholder="e.g., CODE BLUE IN OPD-1. PLEASE CLEAR THE CORRIDOR." 
                  value={emergencyInput} 
                  onChange={e => setEmergencyInput(e.target.value)} 
                  required 
                  style={{ width: '100%', padding: '12px', border: '1px solid #ccc', borderRadius: '5px' }}
                ></textarea>
              </div>
              
              <button type="submit" className="emergency-btn">TRIGGER HOSPITAL-WIDE OVERRIDE</button>
              
              <button 
                type="button" 
                onClick={clearEmergency} 
                style={{ width: '100%', padding: '15px', marginTop: '15px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer', borderRadius: '5px', fontSize: '18px', fontWeight: 'bold' }}
              >
                CLEAR EMERGENCY STATUS
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;