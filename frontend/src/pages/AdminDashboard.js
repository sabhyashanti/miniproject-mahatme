import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // Default to overview
  
  // States for the interactive Overview
  const [expandedStat, setExpandedStat] = useState(null);
  const [liveQueueData, setLiveQueueData] = useState([]);
  const [tvNetworkData, setTvNetworkData] = useState([]);
  const [selectedPreviewTV, setSelectedPreviewTV] = useState(null); // For TV Live Preview
  
  // State for adding new staff members
  const [newUser, setNewUser] = useState({
    username: '',
    email: '', 
    role: 'receptionist' 
  });

  // States for CMS and Emergency Overrides (Updated for Multi-TV)
  const [cmsInput, setCmsInput] = useState({ targetTV: 'all', video: '', text: '' });
  const [emergencyInput, setEmergencyInput] = useState('');

  const handleLogout = () => {
    navigate('/');
  };

  // --- FETCH DYNAMIC DASHBOARD DATA ---
  const fetchData = async () => {
    try {
      // 1. Fetch Live Patient Queue
      const queueResponse = await fetch('https://mahatme-backend.onrender.com/api/patients');
      if (queueResponse.ok) {
        setLiveQueueData(await queueResponse.json());
      }

      // 2. Fetch Live TV Network Data
      const tvResponse = await fetch('https://mahatme-backend.onrender.com/api/settings');
      if (tvResponse.ok) {
        setTvNetworkData(await tvResponse.json());
      }
    } catch (error) {
      console.error("Failed to fetch live data for dashboard");
    }
  };

  // Fetch data automatically when Overview or CMS tabs are opened
  useEffect(() => {
    if (activeTab === 'dashboard' || activeTab === 'cms') {
      fetchData();
    }
  }, [activeTab]);

  const toggleStat = (statName) => {
    if (expandedStat === statName) {
      setExpandedStat(null); // Close if already open
      setSelectedPreviewTV(null);
    } else {
      setExpandedStat(statName);
      fetchData(); // Fetch fresh data when opening a stat panel
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
        setNewUser({ username: '', email: '', role: 'receptionist' }); 
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
        body: JSON.stringify({ 
          tv_id: cmsInput.targetTV, 
          video_url: cmsInput.video || null, // Send null if left blank
          announcement: cmsInput.text || null, 
          is_emergency: false 
        })
      });
      alert(cmsInput.targetTV === 'all' ? "All TV Displays Updated Successfully!" : `TV-0${cmsInput.targetTV} Updated Successfully!`);
      setCmsInput({ targetTV: 'all', video: '', text: '' }); // Clear input
      fetchData(); // Refresh the preview data
    } catch (error) {
      alert("Failed to update TV screens. Is the server running?");
    }
  };

  // --- ADMIN: Trigger Emergency (Always affects ALL TVs) ---
  const handleEmergencyTrigger = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tv_id: 'all', is_emergency: true, emergency_text: emergencyInput })
      });
      alert("🚨 EMERGENCY OVERRIDE DEPLOYED TO ALL SCREENS 🚨");
      fetchData();
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
        body: JSON.stringify({ tv_id: 'all', is_emergency: false })
      });
      alert("Emergency cleared. Systems returned to normal.");
      setEmergencyInput(''); 
      fetchData();
    } catch (error) {
      alert("Failed to clear emergency.");
    }
  };

  const mockMedia = [
    { title: 'Eye Donation Awareness', type: 'Video', schedule: '09:00 AM - 12:00 PM', screens: 'All' },
    { title: 'Cataract Post-Care', type: 'Image', schedule: '01:00 PM - 04:00 PM', screens: 'TV-02' },
    { title: 'Doctor Duty Roster', type: 'Image', schedule: 'Continuous', screens: 'TV-01' },
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
                <p className="stat-value">{tvNetworkData.length} Online</p>
                <small style={{color: '#0056b3'}}>Click to view network</small>
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

            {/* LIVE TV NETWORK STATS */}
            {expandedStat === 'boards' && (
              <div className="stat-detail-panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 50%' }}>
                  <h2>Network Hardware Status</h2>
                  <p style={{ color: '#666', marginBottom: '10px' }}>Click a board below to preview its live output.</p>
                  <table className="detail-table">
                    <thead><tr><th>ID</th><th>Location</th><th>Network</th><th>Status</th></tr></thead>
                    <tbody>
                      {tvNetworkData.map(tv => (
                        <tr 
                          key={tv.id} 
                          onClick={() => setSelectedPreviewTV(tv)}
                          style={{ cursor: 'pointer', backgroundColor: selectedPreviewTV?.id === tv.id ? '#eef2f6' : 'transparent' }}
                        >
                          <td style={{ fontWeight: 'bold' }}>TV-0{tv.id}</td>
                          <td>{tv.tv_name}</td>
                          <td><span style={{ color: 'green', fontWeight: 'bold' }}>● Online</span></td>
                          <td>{tv.is_emergency ? <span style={{ color: 'red', fontWeight: 'bold' }}>🚨 OVERRIDE</span> : 'Normal'}</td>
                        </tr>
                      ))}
                      {tvNetworkData.length === 0 && (
                        <tr><td colSpan="4">Fetching network data...</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* LIVE PREVIEW BOX */}
                {selectedPreviewTV && (
                  <div style={{ flex: '1 1 40%', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', color: 'white', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px' }}>
                      Live Preview: TV-0{selectedPreviewTV.id}
                    </h3>
                    
                    <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '5px', overflow: 'hidden', position: 'relative', minHeight: '200px' }}>
                      {selectedPreviewTV.is_emergency ? (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                          <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedPreviewTV.emergency_text}</h2>
                        </div>
                      ) : (
                        selectedPreviewTV.video_url ? (
                          <iframe 
                            src={selectedPreviewTV.video_url} 
                            title="TV Preview" 
                            style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                          ></iframe>
                        ) : (
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>No Video Source</div>
                        )
                      )}
                    </div>

                    <div style={{ marginTop: '15px', backgroundColor: '#dc3545', padding: '10px', borderRadius: '5px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Ticker: {selectedPreviewTV.announcement || "No announcement set."}
                    </div>
                  </div>
                )}
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

        {/* --- CMS TAB (LIVE API CONNECTED & MULTI-SCREEN) --- */}
        {activeTab === 'cms' && (
          <section className="cms-panel">
            <h2>Update Live TV Content</h2>
            <form onSubmit={handleCMSUpload}>
              
              <div className="form-group">
                <label>Target Screen Location *</label>
                <select 
                  className="auth-select"
                  value={cmsInput.targetTV}
                  onChange={(e) => setCmsInput({...cmsInput, targetTV: e.target.value})}
                  required
                >
                  <option value="all">Broadcast to ALL Screens</option>
                  {tvNetworkData.map(tv => (
                    <option key={tv.id} value={tv.id}>TV-0{tv.id}: {tv.tv_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Scrolling Announcement Text</label>
                <input 
                  type="text" 
                  placeholder="e.g., Free Cataract Screening Camp on Sunday..." 
                  value={cmsInput.text} 
                  onChange={e => setCmsInput({...cmsInput, text: e.target.value})} 
                  required={!cmsInput.video} // Require text if no video is provided
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
                  Leave blank to keep the current video playing. Ensure it is an 'embed' link.
                </small>
              </div>

              <button type="submit" className="upload-btn">Publish to Selected TV(s)</button>
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
                <label>Staff Email Address</label>
                <input 
                  type="email" 
                  className="auth-input"
                  placeholder="name@hospital.com" 
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
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