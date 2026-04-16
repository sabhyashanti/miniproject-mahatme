import React, { useState, useEffect, useRef } from 'react';
import './TVSimulation.css';

function TVSimulation() {
  const [servingToken, setServingToken] = useState(null);
  const [waitingTokens, setWaitingTokens] = useState([]);
  const [isNewCall, setIsNewCall] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // NEW: State for live TV settings from the Admin CMS
  const [settings, setSettings] = useState({
    video_url: '',
    announcement: '',
    is_emergency: false,
    emergency_text: ''
  });

  // Use a ref to track the previous token without triggering re-renders in the effect
  const prevServingIdRef = useRef(null);

  // --- LIVE CLOCK TICKER ---
  useEffect(() => {
    const clockInterval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockInterval);
  }, []);

  // --- DATABASE POLLING (QUEUE & SETTINGS) ---
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Fetch Patient Queue
        const queueResponse = await fetch('https://mahatme-backend.onrender.com/api/patients');
        if (queueResponse.ok) {
          const data = await queueResponse.json();
          
          const serving = data.find(p => p.status === 'Serving') || null;
          const waiting = data.filter(p => p.status === 'Waiting').slice(0, 4);

          // Trigger flash animation ONLY if the serving ID has actually changed
          if (serving && serving.id !== prevServingIdRef.current) {
            if (prevServingIdRef.current !== null) { 
              setIsNewCall(true);
              setTimeout(() => setIsNewCall(false), 5000);
            }
            prevServingIdRef.current = serving.id; 
          } else if (!serving) {
            prevServingIdRef.current = null; 
          }

          setServingToken(serving);
          setWaitingTokens(waiting);
        }

        // 2. Fetch Live TV Settings (CMS & Emergency)
        const settingsResponse = await fetch('https://mahatme-backend.onrender.com/api/settings');
        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          if (settingsData) {
            setSettings(settingsData);
          }
        }

      } catch (error) {
        console.error("Sync Error:", error);
      }
    };

    fetchData(); // Initial fetch
    const pollInterval = setInterval(fetchData, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval); 
  }, []); 

  return (
    <div className="tv-container">
      
      {/* 🚨 EMERGENCY OVERRIDE SCREEN 🚨 */}
      {settings.is_emergency && (
        <div style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: '#dc3545', zIndex: 9999, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', alignItems: 'center', color: 'white', textAlign: 'center'
        }} className="flash-active">
          <h1 style={{ fontSize: '150px', margin: '0 0 20px 0', textShadow: '4px 4px 10px rgba(0,0,0,0.5)' }}>🚨 EMERGENCY 🚨</h1>
          <h2 style={{ fontSize: '60px', padding: '0 50px' }}>{settings.emergency_text}</h2>
        </div>
      )}

      {/* Floating Header Overlay for Clock */}
      <div className="tv-header-bar">
        <div className="tv-brand"></div>
        <div className="tv-clock">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="tv-main">
        {/* ZONE A: CMS / Health Video Loop */}
        <div className="zone-a">
          <iframe 
            // Fallback to default video if Admin clears the database link
            src={settings.video_url || "https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&mute=1&loop=1&playlist=jfKfPfyJRdk&controls=0"} 
            title="Hospital Information"
            allow="autoplay; encrypted-media"
            style={{ pointerEvents: 'none' }} 
          ></iframe>
        </div>

        {/* ZONE B: Live Token Ticker */}
        <div className={`zone-b ${isNewCall ? 'flash-active' : ''}`}>
          <div className="token-header">
            MAHATME OPD
          </div>
          
          <div className="now-serving-box">
            <div className="now-serving-text">NOW SERVING</div>
            <h1 className="big-token">
              {servingToken ? servingToken.token : '---'}
            </h1>
            <div className="patient-name">
              {servingToken ? servingToken.name : 'Please Wait'}
            </div>
          </div>

          <div className="waiting-list">
            <h3>NEXT IN LINE</h3>
            <p style={{ fontSize: '24px', margin: 0, fontWeight: 'bold' }}>
              {waitingTokens.length > 0 
                ? waitingTokens.map(p => p.token).join(', ') 
                : 'Queue is clear'}
            </p>
          </div>
        </div>
      </div>

      {/* ZONE C: Modern Scrolling Announcements */}
      <div className="zone-c">
        <div className="ticker-text">
          {settings.announcement || "Welcome to Mahatme Eye Hospital."}
        </div>
      </div>
    </div>
  );
}

export default TVSimulation;