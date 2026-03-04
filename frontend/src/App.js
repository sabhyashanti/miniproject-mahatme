import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import our pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StaffPortal from './pages/StaffPortal';
import TVSimulation from './display/TVSimulation';

function App() {
  return (
    <Router>
      <Routes>
        {/* Entry Level */}
        <Route path="/" element={<Login />} />
        
        {/* Secure Zones */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/staff" element={<StaffPortal />} />
        
        {/* Physical Output Simulation */}
        <Route path="/display" element={<TVSimulation />} />
      </Routes>
    </Router>
  );
}

export default App;