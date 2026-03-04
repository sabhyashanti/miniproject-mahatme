import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; // Import the new styles!

function Login() {
  const [isLogin, setIsLogin] = useState(true); 
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff'); 
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // If isLogin is true, call login API. If false, call signup API.
    const endpoint = isLogin ? 'http://localhost:5000/api/login' : 'http://localhost:5000/api/signup';
    
    // Package the data to send to your Express server -> PostgreSQL
    const bodyData = isLogin 
      ? { username, password } 
      : { username, password, role };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        if (isLogin) {
          // Route based on role
          if (data.role === 'admin') navigate('/admin');
          else if (data.role === 'staff') navigate('/staff');
        } else {
          setIsLogin(true); // After successful signup, switch to login view
          setUsername('');
          setPassword('');
        }
      } else {
        alert(data.error);
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
          <h2>{isLogin ? 'Patient Flow System Login' : 'Register New System User'}</h2>
        </div>
        
        <form className="auth-form" onSubmit={handleSubmit}>
          <input 
            className="auth-input" type="text" placeholder="Username" required
            value={username} onChange={(e) => setUsername(e.target.value)}
          />
          <input 
            className="auth-input" type="password" placeholder="Password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          
          {/* Only show Role selection if the user is Signing Up */}
          {!isLogin && (
            <select className="auth-select" value={role} onChange={(e) => setRole(e.target.value)}>
              <option value="staff">Staff (Receptionist / Doctor)</option>
              <option value="admin">Admin (CMS & System Manager)</option>
            </select>
          )}

          <button className="auth-button" type="submit">
            {isLogin ? 'Login to Dashboard' : 'Create Account'}
          </button>
        </form>

        <button className="auth-toggle" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? Sign up here." : "Already have an account? Log in."}
        </button>
      </div>
    </div>
  );
}

export default Login;