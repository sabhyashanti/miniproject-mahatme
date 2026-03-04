import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';

function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('cms'); // Default view

  const handleLogout = () => {
    // In a real app, clear auth tokens here
    navigate('/');
  };

  return (
    <div className="admin-container">
      {/* Sidebar Navigation */}
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
          <li className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>
            👥 User Management
          </li>
          <li className={activeTab === 'screens' ? 'active' : ''} onClick={() => setActiveTab('screens')}>
            📍 Screen Locations
          </li>
        </ul>
      </aside>

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-header">
          <h1>Welcome, Admin</h1>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </header>

        {/* Quick Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Active Digital Boards</h3>
            <p className="stat-value">4 / 5</p>
          </div>
          <div className="stat-card">
            <h3>Total Patients in Queue</h3>
            <p className="stat-value">42</p>
          </div>
          <div className="stat-card">
            <h3>Scheduled Media</h3>
            <p className="stat-value">12 Items</p>
          </div>
        </div>

        {/* Dynamic Content Area based on Sidebar Selection */}
        {activeTab === 'cms' && (
          <section className="cms-panel">
            <h2>Upload & Schedule Content</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Configure the informational media to play on the digital display boards.
            </p>
            
            <form onSubmit={(e) => { e.preventDefault(); alert("Media scheduled! (Simulation)"); }}>
              <div className="form-group">
                <label>Media Title</label>
                <input type="text" placeholder="e.g., Cataract Post-Care Info" required />
              </div>
              
              <div className="form-group">
                <label>Target Screen Location</label>
                <select>
                  <option value="all">All Screens</option>
                  <option value="opd-1">OPD Waiting Area 1</option>
                  <option value="retina">Retina Dept</option>
                  <option value="pharmacy">Pharmacy</option>
                </select>
              </div>

              <div className="form-group">
                <label>Media URL (Image/Video Link)</label>
                <input type="url" placeholder="https://example.com/video.mp4" required />
              </div>

              <button type="submit" className="upload-btn">Publish to Screens</button>
            </form>
          </section>
        )}

        {activeTab !== 'cms' && (
          <section className="cms-panel">
            <h2>{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
            <p>This module is currently under construction for the panel demo.</p>
          </section>
        )}

      </main>
    </div>
  );
}

export default AdminDashboard;