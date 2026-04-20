import React, { useState, useEffect } from 'react';
import './TVSimulation.css';

function TVSimulation() {
  const [queue, setQueue] = useState([]);
  const [tvSettings, setTvSettings] = useState(null);
  const [currentMedia, setCurrentMedia] = useState(null);
  
  // For this simulation, we hardcode it to act as "TV-01". 
  // In real life, you'd pull this from the URL (e.g. /tv/1)
  const MY_TV_ID = 1; 

  useEffect(() => {
    const fetchTVData = async () => {
      try {
        // 1. Fetch Queue
        const qRes = await fetch('https://mahatme-backend.onrender.com/api/patients');
        if (qRes.ok) {
          const rawQueue = await qRes.json();
          // Sort: 'Serving' at top, then by time. Filter out 'Done'
          const activeQueue = rawQueue
            .filter(p => p.status !== 'Done')
            .sort((a, b) => (a.status === 'Serving' ? -1 : 1));
          setQueue(activeQueue);
        }

        // 2. Fetch Base TV Settings & Ticker
        const tvRes = await fetch('https://mahatme-backend.onrender.com/api/settings');
        if (tvRes.ok) {
          const allTvs = await tvRes.json();
          const myTv = allTvs.find(tv => tv.id === MY_TV_ID) || allTvs[0];
          setTvSettings(myTv);
        }

        // 3. Fetch Schedules & Check Current Time
        const schedRes = await fetch('https://mahatme-backend.onrender.com/api/schedules');
        if (schedRes.ok) {
          const allSchedules = await schedRes.json();
          const mySchedules = allSchedules.filter(s => s.tv_id === MY_TV_ID);
          
          // Get current time in HH:MM format to check against schedule
          const now = new Date();
          const currentTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          
          const activeSchedule = mySchedules.find(s => currentTime >= s.start_time && currentTime <= s.end_time);
          
          if (activeSchedule) {
            setCurrentMedia({ type: activeSchedule.type, url: activeSchedule.url });
          } else {
            // Fallback if no schedule active: You can put a default hospital logo URL here
            setCurrentMedia({ type: 'image', url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=800&q=80' });
          }
        }
      } catch (error) { console.error("TV Refresh Failed", error); }
    };

    fetchTVData();
    const interval = setInterval(fetchTVData, 3000); // Super fast refresh for queue live feel!
    return () => clearInterval(interval);
  }, []);

  if (!tvSettings) return <div style={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><h2>INITIALIZING TV-0{MY_TV_ID}...</h2></div>;

  // EMERGENCY OVERRIDE
  if (tvSettings.is_emergency) {
    return (
      <div style={{ backgroundColor: '#cc0000', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '50px' }}>
        <h1 style={{ fontSize: '5rem', margin: '0 0 20px 0', animation: 'blink 1s infinite' }}>🚨 EMERGENCY ALERT 🚨</h1>
        <h2 style={{ fontSize: '3rem' }}>{tvSettings.emergency_text}</h2>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#f4f7f6', overflow: 'hidden' }}>
      
      {/* HEADER */}
      <header style={{ backgroundColor: '#003366', color: 'white', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <h1 style={{ margin: 0, fontSize: '28px', letterSpacing: '1px' }}>Mahatme Eye Hospital</h1>
          <span style={{ backgroundColor: '#0055a4', padding: '5px 10px', borderRadius: '4px', fontSize: '14px', fontWeight: 'bold' }}>{tvSettings.tv_name}</span>
        </div>
        <h2 style={{ margin: 0, fontSize: '24px' }}>{new Date().toLocaleTimeString()}</h2>
      </header>

      {/* MAIN SPLIT SCREEN */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT SIDE: MEDIA PLAYER (60%) */}
        <div style={{ flex: '6', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {currentMedia?.type === 'video' ? (
             <iframe src={currentMedia.url} title="Content" style={{ width: '100%', height: '100%', border: 'none' }}></iframe>
          ) : (
             <img src={currentMedia?.url} alt="Content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>

        {/* RIGHT SIDE: LIVE QUEUE TABLE (40%) */}
        <div style={{ flex: '4', display: 'flex', flexDirection: 'column', backgroundColor: 'white', borderLeft: '4px solid #003366' }}>
          <div style={{ backgroundColor: '#eef2f6', padding: '15px', textAlign: 'center', borderBottom: '2px solid #ccc' }}>
            <h2 style={{ margin: 0, color: '#003366', fontSize: '26px' }}>LIVE PATIENT QUEUE</h2>
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden', padding: '15px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '20px' }}>
              <thead>
                <tr style={{ backgroundColor: '#0055a4', color: 'white', textAlign: 'left' }}>
                  <th style={{ padding: '12px', borderTopLeftRadius: '8px' }}>Token</th>
                  <th style={{ padding: '12px' }}>Name</th>
                  <th style={{ padding: '12px', borderTopRightRadius: '8px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {queue.length === 0 ? (
                  <tr><td colSpan="3" style={{ textAlign: 'center', padding: '30px', color: '#666' }}>No patients waiting.</td></tr>
                ) : (
                  queue.map((patient, index) => (
                    <tr key={patient.id} style={{ 
                        borderBottom: '1px solid #eee', 
                        backgroundColor: patient.status === 'Serving' ? '#e6ffe6' : (index % 2 === 0 ? '#fafafa' : 'white'),
                        transition: 'all 0.5s ease-in-out' // Smooth shifting animation
                      }}>
                      <td style={{ padding: '15px', fontWeight: 'bold', color: patient.status === 'Serving' ? 'green' : '#333', fontSize: '24px' }}>{patient.token}</td>
                      <td style={{ padding: '15px', fontWeight: patient.status === 'Serving' ? 'bold' : 'normal' }}>{patient.name}</td>
                      <td style={{ padding: '15px' }}>
                        {patient.status === 'Serving' ? (
                           <span style={{ backgroundColor: 'green', color: 'white', padding: '5px 10px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold', animation: 'pulse 1.5s infinite' }}>CALLING</span>
                        ) : (
                           <span style={{ color: '#666', fontSize: '18px' }}>Waiting</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FOOTER TICKER */}
      <footer style={{ backgroundColor: '#dc3545', color: 'white', padding: '10px 0', fontSize: '24px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', zIndex: 10 }}>
        <div style={{ display: 'inline-block', paddingLeft: '100%', animation: 'scrollTicker 20s linear infinite' }}>
          {tvSettings.announcement || "Welcome to Mahatme Eye Hospital."}
        </div>
      </footer>

      {/* INLINE ANIMATIONS */}
      <style>
        {`
          @keyframes scrollTicker { 0% { transform: translate(0, 0); } 100% { transform: translate(-100%, 0); } }
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.6; } 100% { opacity: 1; } }
          @keyframes blink { 0% { opacity: 1; } 50% { opacity: 0; } 100% { opacity: 1; } }
        `}
      </style>
    </div>
  );
}

export default TVSimulation;