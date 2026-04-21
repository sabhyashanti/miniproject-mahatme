import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); 
  const [expandedStat, setExpandedStat] = useState(null);
  
  // --- DYNAMIC DATA STATES ---
  const [liveQueueData, setLiveQueueData] = useState([]);
  const [tvNetworkData, setTvNetworkData] = useState([]);
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [selectedPreviewTV, setSelectedPreviewTV] = useState(null); 
  
  // --- REAL-TIME CLOCK STATE (The Heartbeat) ---
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- FORM STATES (Updated with Department for Staff Registration) ---
  const [newUser, setNewUser] = useState({ username: '', email: '', role: 'receptionist', department: 'General' });
  const [cmsInput, setCmsInput] = useState({ targetTV: 'all', text: '' }); 
  const [emergencyInput, setEmergencyInput] = useState('');
  const [newMedia, setNewMedia] = useState({ title: '', type: 'image', url: '' });
  const [newSchedule, setNewSchedule] = useState({ tv_id: '1', media_id: '', start_time: '', end_time: '' });

  const handleLogout = () => {
    navigate('/');
  };

  // --- THE HEARTBEAT EFFECT ---
  // This makes React check the clock every single second so schedules switch instantly in the preview
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- FETCH ALL DASHBOARD DATA ---
  const fetchData = async () => {
    try {
      const urls = [
        'https://mahatme-backend.onrender.com/api/queue',
        'https://mahatme-backend.onrender.com/api/settings',
        'https://mahatme-backend.onrender.com/api/media',
        'https://mahatme-backend.onrender.com/api/schedules'
      ];
      const [qRes, tvRes, mediaRes, schedRes] = await Promise.all(urls.map(url => fetch(url)));
      
      if (qRes.ok) setLiveQueueData(await qRes.json());
      if (tvRes.ok) setTvNetworkData(await tvRes.json());
      if (mediaRes.ok) setMediaLibrary(await mediaRes.json());
      if (schedRes.ok) setSchedules(await schedRes.json());
    } catch (error) {
      console.error("Failed to fetch live data for dashboard", error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const toggleStat = (statName) => {
    if (expandedStat === statName) {
      setExpandedStat(null); 
      setSelectedPreviewTV(null);
    } else {
      setExpandedStat(statName);
      fetchData(); 
    }
  };

  // --- BULLETPROOF TIME CHECKER ---
  const getActiveMediaForTV = (tvId) => {
    const mySchedules = schedules.filter(s => s.tv_id === tvId);
    
    // Format the live ticking clock to match PostgreSQL "HH:MM"
    const currentHour = String(currentTime.getHours()).padStart(2, '0');
    const currentMinute = String(currentTime.getMinutes()).padStart(2, '0');
    const currentHM = `${currentHour}:${currentMinute}`;

    return mySchedules.find(s => {
      const start = s.start_time.substring(0, 5);
      const end = s.end_time.substring(0, 5);
      return currentHM >= start && currentHM <= end;
    });
  };

  // --- YOUTUBE AUTOPLAY FORCER ---
  // Guarantees YouTube videos will autoplay and mute in the preview box
  const formatYouTubeUrl = (url) => {
    if (!url) return '';
    if (url.includes('youtube') || url.includes('youtu.be')) {
      let finalUrl = url;
      const separator = finalUrl.includes('?') ? '&' : '?';
      if (!finalUrl.includes('autoplay=1')) finalUrl += `${separator}autoplay=1`;
      if (!finalUrl.includes('mute=1')) finalUrl += '&mute=1';
      return finalUrl;
    }
    return url;
  };

  // ==========================================
  // --- MEDIA LIBRARY HANDLERS ---
  // ==========================================
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        // Converts image to a Base64 string so the database can store it directly
        setNewMedia({ ...newMedia, type: 'image', url: reader.result }); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveMedia = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMedia)
      });
      alert('Asset saved to Media Library!');
      setNewMedia({ title: '', type: 'image', url: '' }); // Reset form
      fetchData();
    } catch (err) {
      alert('Failed to save media.');
    }
  };

  // ==========================================
  // --- SCHEDULING HANDLERS ---
  // ==========================================
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSchedule)
      });
      alert('TV Schedule Created Successfully!');
      fetchData();
    } catch (err) {
      alert('Failed to lock in schedule.');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if(window.confirm('Remove this schedule?')) {
      await fetch(`https://mahatme-backend.onrender.com/api/schedules/${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  // ==========================================
  // --- EXISTING ADMIN HANDLERS ---
  // ==========================================
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
        alert(`Successfully registered ${newUser.username} in ${newUser.department}`);
        setNewUser({ username: '', email: '', role: 'receptionist', department: 'General' }); // Reset with dept
      } else alert(data.error);
    } catch (error) { alert("Error connecting to the server."); }
  };

  const handleCMSUpload = async (e) => {
    e.preventDefault();
    try {
      await fetch('https://mahatme-backend.onrender.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tv_id: cmsInput.targetTV, announcement: cmsInput.text, is_emergency: false })
      });
      alert("Scrolling Ticker Updated Successfully!");
      setCmsInput({ targetTV: 'all', text: '' }); 
      fetchData(); 
    } catch (error) { alert("Failed to update TV screens."); }
  };

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
    } catch (error) { alert("Failed to trigger emergency protocol."); }
  };

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
    } catch (error) { alert("Failed to clear emergency."); }
  };

  return (
    <div className="admin-container">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          Mahatme Eye Hospital<br/>
          <span style={{ fontSize: '14px', fontWeight: 'normal' }}>System Admin</span>
        </div>
        <ul className="sidebar-nav">
          <li className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>📊 Overview</li>
          <li className={activeTab === 'cms' ? 'active' : ''} onClick={() => setActiveTab('cms')}>🗓️ Content Scheduler</li>
          <li className={activeTab === 'media' ? 'active' : ''} onClick={() => setActiveTab('media')}>📁 Media Library</li>
          <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>👥 User Management</li>
          <li className={activeTab === 'emergency' ? 'active' : ''} onClick={() => setActiveTab('emergency')} style={{ color: '#ff9999' }}>🚨 Emergency</li>
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
                <h3>Active TV Schedules</h3>
                <p className="stat-value">{schedules.length}</p>
                <small style={{color: '#0056b3'}}>Click to view schedule</small>
              </div>
            </div>

            {/* LIVE TV NETWORK STATS & REAL-TIME PREVIEW */}
            {expandedStat === 'boards' && (
              <div className="stat-detail-panel" style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 50%' }}>
                  <h2>Network Hardware Status</h2>
                  <p style={{ color: '#666', marginBottom: '10px' }}>Click a board below to preview its live output.</p>
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Location</th>
                        <th>Network</th>
                        <th>Status</th>
                        <th>Action</th> {/* ADDED HEADER HERE */}
                      </tr>
                    </thead>
                    <tbody>
                      {tvNetworkData.map(tv => (
                        <tr key={tv.id} onClick={() => setSelectedPreviewTV(tv)} style={{ cursor: 'pointer', backgroundColor: selectedPreviewTV?.id === tv.id ? '#eef2f6' : 'transparent' }}>
                          <td style={{ fontWeight: 'bold' }}>TV-0{tv.id}</td>
                          <td>{tv.tv_name}</td>
                          <td><span style={{ color: 'green', fontWeight: 'bold' }}>● Online</span></td>
                          <td>{tv.is_emergency ? <span style={{ color: 'red', fontWeight: 'bold' }}>🚨 OVERRIDE</span> : 'Normal'}</td>
                          
                          {/* ADDED LAUNCH BUTTON HERE */}
                          <td>
                            <button 
                              onClick={(e) => { e.stopPropagation(); window.open(`/display/${tv.id}`, '_blank'); }} 
                              style={{ backgroundColor: '#17a2b8', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              📺 Launch TV
                            </button>
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* THE LIVE PREVIEW BOX */}
                {selectedPreviewTV && (
                  <div style={{ flex: '1 1 40%', backgroundColor: '#1a1a1a', padding: '20px', borderRadius: '10px', color: 'white', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 15px 0', borderBottom: '1px solid #333', paddingBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Live Preview: TV-0{selectedPreviewTV.id}</span>
                      <span style={{ color: '#0f0', fontSize: '14px', fontWeight: 'normal' }}>● LIVE</span>
                    </h3>
                    <div style={{ flex: 1, backgroundColor: 'black', borderRadius: '5px', overflow: 'hidden', position: 'relative', minHeight: '200px' }}>
                      
                      {selectedPreviewTV.is_emergency ? (
                        <div style={{ position: 'absolute', inset: 0, backgroundColor: '#dc3545', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', textAlign: 'center' }}>
                          <h2 style={{ margin: 0, fontSize: '20px' }}>{selectedPreviewTV.emergency_text}</h2>
                        </div>
                      ) : getActiveMediaForTV(selectedPreviewTV.id) ? (
                         getActiveMediaForTV(selectedPreviewTV.id).type === 'video' ? (
                           // YOUTUBE AUTOPLAY IFRAME
                           <iframe 
                             src={formatYouTubeUrl(getActiveMediaForTV(selectedPreviewTV.id).url)} 
                             title="Preview" 
                             allow="autoplay; encrypted-media" 
                             style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                           ></iframe>
                         ) : (
                           // IMAGE
                           <img src={getActiveMediaForTV(selectedPreviewTV.id).url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         )
                      ) : (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                          No Media Scheduled Right Now
                        </div>
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
                <h2>Live Patient Queue</h2>
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
                <h2>Live Network Schedule</h2>
                <table className="detail-table">
                  <thead><tr><th>Target TV</th><th>Media Title</th><th>Type</th><th>Time Slot</th><th>Action</th></tr></thead>
                  <tbody>
                    {schedules.length === 0 ? <tr><td colSpan="5">No active schedules.</td></tr> :
                     schedules.map(s => (
                      <tr key={s.id}>
                        <td><b>TV-0{s.tv_id}</b></td><td>{s.title}</td><td>{s.type.toUpperCase()}</td>
                        <td>{s.start_time} - {s.end_time}</td>
                        <td><button onClick={() => handleDeleteSchedule(s.id)} style={{color:'red', cursor:'pointer', border:'none', background:'none', fontWeight:'bold'}}>Cancel</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* --- MEDIA LIBRARY TAB --- */}
        {activeTab === 'media' && (
          <section className="cms-panel">
            <h2>Add to Media Library</h2>
            <form onSubmit={handleSaveMedia} style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '30px' }}>
              <div style={{flex: 1, minWidth: '200px'}}>
                <label style={{display: 'block', marginBottom: '5px'}}>Media Title</label>
                <input type="text" className="auth-input" value={newMedia.title} onChange={e => setNewMedia({...newMedia, title: e.target.value})} required />
              </div>
              <div style={{flex: 1, minWidth: '150px'}}>
                <label style={{display: 'block', marginBottom: '5px'}}>Media Type</label>
                <select className="auth-select" value={newMedia.type} onChange={e => setNewMedia({...newMedia, type: e.target.value, url: ''})}>
                  <option value="image">Upload Picture</option>
                  <option value="video">YouTube Embed Link</option>
                </select>
              </div>
              
              <div style={{flex: 2, minWidth: '250px'}}>
                <label style={{display: 'block', marginBottom: '5px'}}>{newMedia.type === 'image' ? 'Select File' : 'YouTube URL'}</label>
                {newMedia.type === 'image' ? (
                   <input type="file" accept="image/*" onChange={handleImageUpload} required style={{width: '100%', padding: '10px'}} />
                ) : (
                   <input type="url" placeholder="https://youtube.com/embed/..." className="auth-input" value={newMedia.url} onChange={e => setNewMedia({...newMedia, url: e.target.value})} required />
                )}
              </div>
              <div style={{display: 'flex', alignItems: 'flex-end'}}>
                <button type="submit" className="upload-btn" style={{marginBottom: '5px'}}>Save Asset</button>
              </div>
            </form>

            <hr style={{margin: '30px 0', border: '1px solid #eee'}}/>
            
            <h2>Your Assets</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px' }}>
              {mediaLibrary.map(media => (
                <div key={media.id} style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '10px', textAlign: 'center', backgroundColor: 'white' }}>
                  {media.type === 'image' ? (
                    <img src={media.url} alt={media.title} style={{ width: '100%', height: '120px', objectFit: 'cover', borderRadius: '4px' }} />
                  ) : (
                    <div style={{ width: '100%', height: '120px', backgroundColor: '#333', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}><b>VIDEO</b></div>
                  )}
                  <p style={{ margin: '10px 0 0 0', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{media.title}</p>
                </div>
              ))}
              {mediaLibrary.length === 0 && <p style={{color: '#666'}}>No assets uploaded yet.</p>}
            </div>
          </section>
        )}

        {/* --- CMS / SCHEDULER TAB --- */}
        {activeTab === 'cms' && (
          <section className="cms-panel">
            <h2>Schedule Content on TVs</h2>
            <form onSubmit={handleCreateSchedule} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '40px', backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', border: '1px solid #ddd' }}>
              <div className="form-group">
                <label>Target Screen</label>
                <select className="auth-select" value={newSchedule.tv_id} onChange={e => setNewSchedule({...newSchedule, tv_id: e.target.value})}>
                  {tvNetworkData.map(tv => <option key={tv.id} value={tv.id}>TV-0{tv.id}: {tv.tv_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Select Media Asset</label>
                <select className="auth-select" value={newSchedule.media_id} onChange={e => setNewSchedule({...newSchedule, media_id: e.target.value})} required>
                  <option value="">-- Choose from Library --</option>
                  {mediaLibrary.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Start Time (24h format)</label>
                <input type="time" className="auth-input" value={newSchedule.start_time} onChange={e => setNewSchedule({...newSchedule, start_time: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>End Time (24h format)</label>
                <input type="time" className="auth-input" value={newSchedule.end_time} onChange={e => setNewSchedule({...newSchedule, end_time: e.target.value})} required />
              </div>
              <button type="submit" className="upload-btn" style={{ gridColumn: 'span 2' }}>Lock in Schedule</button>
            </form>

            <hr style={{margin: '30px 0', border: '1px solid #eee'}}/>
            
            <h2>Update Scrolling Ticker</h2>
            <form onSubmit={handleCMSUpload}>
              <div className="form-group">
                <label>Target Screen for Ticker</label>
                <select className="auth-select" value={cmsInput.targetTV} onChange={e => setCmsInput({...cmsInput, targetTV: e.target.value})}>
                   <option value="all">Broadcast to ALL Screens</option>
                   {tvNetworkData.map(tv => <option key={tv.id} value={tv.id}>TV-0{tv.id}: {tv.tv_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Ticker Text</label>
                <input type="text" placeholder="Scrolling text announcement..." className="auth-input" value={cmsInput.text} onChange={e => setCmsInput({...cmsInput, text: e.target.value})} required />
              </div>
              <button type="submit" className="upload-btn" style={{backgroundColor: '#17a2b8'}}>Update Ticker</button>
            </form>
          </section>
        )}

        {/* --- USER MANAGEMENT TAB --- */}
        {activeTab === 'users' && (
          <section className="cms-panel">
            <h2>Register New Staff Member</h2>
            <form className="auth-form" onSubmit={handleAdminSignup}>
              <div className="form-group"><label>Username</label><input type="text" className="auth-input" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} required /></div>
              <div className="form-group"><label>Staff Email Address</label><input type="email" className="auth-input" value={newUser.email} onChange={(e) => setNewUser({...newUser, email: e.target.value})} required /></div>
              
              <div className="form-group">
                <label>Assign Department</label>
                <select className="auth-select" value={newUser.department} onChange={(e) => setNewUser({...newUser, department: e.target.value})}>
                  <option value="General">General / Reception</option>
                  <option value="OPD-1">OPD-1 (General Eye Care)</option>
                  <option value="OPD-2">OPD-2 (Retina)</option>
                  <option value="OPD-3">OPD-3 (Cataract)</option>
                  <option value="OPD-4">OPD-4 (Glaucoma)</option>
                  <option value="OT-1">OT-1 (Major Surgery)</option>
                  <option value="OT-2">OT-2 (Minor Surgery)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Assign Role</label>
                <select className="auth-select" value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})}>
                  <option value="receptionist">Receptionist</option>
                  <option value="doctor">Doctor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="upload-btn" style={{backgroundColor: '#0056b3'}}>Create Account</button>
            </form>
          </section>
        )}

        {/* --- EMERGENCY BROADCAST TAB --- */}
        {activeTab === 'emergency' && (
          <section className="cms-panel emergency-panel">
            <h2 style={{color: '#dc3545'}}>🚨 EMERGENCY OVERRIDE SYSTEM</h2>
            <form onSubmit={handleEmergencyTrigger}>
              <div className="form-group"><label>Emergency Message Text</label><textarea rows="3" value={emergencyInput} onChange={e => setEmergencyInput(e.target.value)} required style={{ width: '100%', padding: '12px' }}></textarea></div>
              <button type="submit" className="emergency-btn">TRIGGER HOSPITAL-WIDE OVERRIDE</button>
              <button type="button" onClick={clearEmergency} style={{ width: '100%', padding: '15px', marginTop: '15px', backgroundColor: '#333', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>CLEAR EMERGENCY STATUS</button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

export default AdminDashboard;