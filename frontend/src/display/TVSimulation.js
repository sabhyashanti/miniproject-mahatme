import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom'; // Allows us to read the TV ID from the URL
import './TVSimulation.css';

function TVSimulation() {
  const { tvId } = useParams(); // Gets the ID from /display/1, /display/2, etc.
  const targetTV = tvId || '1'; // Default to TV 1 if not specified

  const [queue, setQueue] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [settings, setSettings] = useState(null);
  
  // Real-time clock for media scheduling
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Looping mechanism for Departments
  const departments = ['OPD-1', 'OPD-2', 'OPD-3', 'OPD-4', 'OT-1', 'OT-2'];
  const [deptIndex, setDeptIndex] = useState(0);

  // --- 1. DATA FETCHING (Every 3 seconds) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qRes, sRes, setRes] = await Promise.all([
          fetch('https://mahatme-backend.onrender.com/api/queue'),
          fetch('https://mahatme-backend.onrender.com/api/schedules'),
          fetch('https://mahatme-backend.onrender.com/api/settings')
        ]);
        if (qRes.ok) setQueue(await qRes.json());
        if (sRes.ok) setSchedules(await sRes.json());
        if (setRes.ok) {
          const allSettings = await setRes.json();
          // Find settings specifically for this TV, or the 'all' global settings
          const mySettings = allSettings.find(s => s.id.toString() === targetTV) || allSettings[0];
          setSettings(mySettings);
        }
      } catch (err) { console.error("TV lost connection to server."); }
    };

    fetchData();
    const dataInterval = setInterval(fetchData, 3000);
    
    // Heartbeat clock for accurate media playback
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    
    return () => { clearInterval(dataInterval); clearInterval(clockInterval); };
  }, [targetTV]);

  // --- 2. DEPARTMENT LOOPING (Every 15 Seconds) ---
  useEffect(() => {
    const rotationInterval = setInterval(() => {
      setDeptIndex((prevIndex) => (prevIndex + 1) % departments.length);
    }, 15000); // 15,000 ms = 15 seconds
    return () => clearInterval(rotationInterval);
  }, []);

  // --- 3. MEDIA & QUEUE LOGIC ---
  const getActiveMedia = () => {
    const mySchedules = schedules.filter(s => s.tv_id.toString() === targetTV);
    const hm = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    return mySchedules.find(s => hm >= s.start_time.substring(0, 5) && hm <= s.end_time.substring(0, 5));
  };

  const formatYouTubeUrl = (url) => {
    if (!url) return '';
    let finalUrl = url;
    if (!finalUrl.includes('autoplay=1')) finalUrl += (finalUrl.includes('?') ? '&' : '?') + 'autoplay=1&mute=1&loop=1';
    return finalUrl;
  };

  const activeMedia = getActiveMedia();
  const currentDept = departments[deptIndex];

  // Get Top 5 Patients for the currently highlighted department, sorting "Serving" to the top
  const visibleQueue = queue
    .filter(p => p.department === currentDept)
    .sort((a, b) => (a.status === 'Serving' ? -1 : b.status === 'Serving' ? 1 : 0))
    .slice(0, 5); // TOP 5 ONLY

  // --- NEW: Calculate exactly how many people are waiting in this department ---
  const totalWaiting = queue.filter(p => p.department === currentDept && p.status === 'Waiting').length;

  // --- COLOR THEMES FOR TV ---
  const deptColors = {
    'OPD-1': '#1565c0', 'OPD-2': '#00695c', 'OPD-3': '#ef6c00',
    'OPD-4': '#6a1b9a', 'OT-1': '#c62828',  'OT-2': '#ad1457'
  };

  return (
    <div className="tv-container">
      
      {/* 🚨 EMERGENCY OVERRIDE 🚨 */}
      {settings?.is_emergency && (
        <div className="emergency-overlay">
          <h1 style={{ fontSize: '100px', margin: 0 }}>🚨 EMERGENCY 🚨</h1>
          <h2 style={{ fontSize: '60px' }}>{settings.emergency_text}</h2>
        </div>
      )}

      <div className="tv-main">
        {/* LEFT: MEDIA PLAYER */}
        <div className="tv-media-section">
          {activeMedia ? (
            activeMedia.type === 'video' ? (
              <iframe 
                src={formatYouTubeUrl(activeMedia.url)} 
                style={{ width: '100%', height: '100%', border: 'none' }} 
                allow="autoplay; encrypted-media" 
                title="Hospital Media"
              />
            ) : (
              <img src={activeMedia.url} alt="Hospital Info" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            )
          ) : (
            <div style={{ color: '#444', fontSize: '30px', textAlign: 'center' }}>
              <img src="https://cdn-icons-png.flaticon.com/512/2966/2966327.png" alt="logo" style={{width:'150px', opacity: 0.2, marginBottom:'20px'}}/><br/>
              Mahatme Eye Hospital<br/>Health Info System
            </div>
          )}
        </div>

        {/* RIGHT: 15-SECOND LOOPING QUEUE */}
        <div className="tv-queue-section">
          
          {/* --- UPDATED HEADER WITH ACTIVE COUNTER --- */}
          <div className="queue-header" style={{ backgroundColor: deptColors[currentDept], display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px' }}>
            <span>{currentDept} Queue</span>
            <span style={{ fontSize: '24px', backgroundColor: 'rgba(0,0,0,0.4)', padding: '10px 20px', borderRadius: '10px', border: '2px solid rgba(255,255,255,0.3)', fontWeight: 'bold' }}>
              {totalWaiting} Waiting
            </span>
          </div>
          
          <table className="queue-table">
            <thead>
              <tr>
                <th style={{ width: '35%' }}>Token</th>
                <th>Patient</th>
              </tr>
            </thead>
            <tbody>
              {visibleQueue.length === 0 ? (
                <tr><td colSpan="2" style={{ textAlign: 'center', padding: '50px', color: '#666', fontStyle: 'italic' }}>No patients waiting.</td></tr>
              ) : (
                visibleQueue.map(p => (
                  <tr key={p.id} className={p.status === 'Serving' ? 'queue-row-serving' : ''}>
                    <td style={{ fontWeight: 'bold', color: p.status === 'Serving' ? '#000' : '#4dabf7' }}>
                      {p.token}
                    </td>
                    <td>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>{p.name}</span>
                        {p.status === 'Serving' && (
                          <span style={{ fontSize: '16px', backgroundColor: '#28a745', color: 'white', padding: '4px 10px', borderRadius: '12px' }}>
                            PLEASE ENTER
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* BOTTOM: SCROLLING TICKER */}
      <div className="tv-ticker">
        <span className="ticker-text">
          {settings?.announcement || "Welcome to Mahatme Eye Hospital. Please wait for your token to be called."}
        </span>
      </div>
      
    </div>
  );
}

export default TVSimulation;