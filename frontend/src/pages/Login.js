import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; 

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Always call the login API
    const endpoint = 'https://mahatme-backend.onrender.com/api/login';
    const bodyData = { username, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        // 1. Save the specific role to the browser's memory
        localStorage.setItem('userRole', data.role);
        
        // 2. Route securely based on that role
        if (data.role === 'admin') {
          navigate('/admin');
        } else if (data.role === 'receptionist' || data.role === 'doctor') {
          navigate('/staff');
        }
      } else {
        alert(data.error); // Show "Invalid password" or "User not found"
      }
    } catch (error) {
      alert("Error connecting to the server.");
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Mahatme Eye Hospital</h1>
          <h2>Patient Flow System Login</h2>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <input 
            className="auth-input" 
            type="text" 
            placeholder="Username" 
            required
            value={username} 
            onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            className="auth-input" 
            type="password" 
            placeholder="Password" 
            required
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
          />
          <button className="auth-button" type="submit">Login to Dashboard</button>
        </form>
      </div>
    </div>
  );
}

export default Login;