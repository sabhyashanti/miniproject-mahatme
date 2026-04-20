import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Import our pages
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ReceptionistDashboard from './pages/ReceptionistDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import TVSimulation from './display/TVSimulation';

function App() {
  return (
    <Router>
      <Routes>
        {/* Entry Level */}
        <Route path="/" element={<Login />} />
        
        {/* Secure Zones */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/receptionist" element={<ReceptionistDashboard />} />
        <Route path="/doctor" element={<DoctorDashboard />} />
        
        {/* Physical Output Simulation */}
        <Route path="/display/:tvId" element={<TVSimulation />} />
      </Routes>
    </Router>
  );
}

export default App;