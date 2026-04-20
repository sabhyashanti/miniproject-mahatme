import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Auth.css'; 

function Login() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- STEP 1: REQUEST OTP ---
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Pointing to your live Render backend
      const response = await fetch('https://mahatme-backend.onrender.com/api/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStep(2); // Move to the OTP verification screen
      } else {
        alert(data.error);
      }
    } catch (error) {
      alert("Server connection failed. Is the backend deployed and awake?");
    }
    setLoading(false);
  };

  // --- STEP 2: VERIFY OTP ---
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Pointing to your live Render backend
      const response = await fetch('https://mahatme-backend.onrender.com/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Save the role (superuser, admin, doctor, or receptionist)
        localStorage.setItem('userRole', data.role);
        
        // Route superuser & admin to the Admin Dashboard, staff to the Staff Portal
        if (data.role === 'superuser' || data.role === 'admin') {
          navigate('/admin');
        } else {
          navigate('/staff');
        }
      } else {
        alert(data.error); 
      }
    } catch (error) {
      alert("Error verifying OTP.");
    }
    setLoading(false);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Mahatme Eye Hospital</h1>
          <h2>Secure System Access</h2>
        </div>
        
        {step === 1 ? (
          <form className="auth-form" onSubmit={handleRequestOTP}>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
              Enter your registered email to receive a secure login code.
            </p>
            <input 
              className="auth-input" 
              type="email" 
              placeholder="Email Address" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send Authentication Code"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleVerifyOTP}>
            <p style={{textAlign: 'center', color: '#666', marginBottom: '20px'}}>
              Enter the 6-digit code sent to <b>{email}</b>
            </p>
            <input 
              className="auth-input" 
              type="text" 
              placeholder="6-Digit OTP" 
              maxLength="6" 
              required 
              style={{ fontSize: '24px', textAlign: 'center', letterSpacing: '5px' }} 
              value={otp} 
              onChange={(e) => setOtp(e.target.value)} 
            />
            <button className="auth-button" type="submit" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Login"}
            </button>
            <button 
              type="button" 
              onClick={() => setStep(1)} 
              style={{marginTop: '15px', background: 'none', border: 'none', color: '#0056b3', cursor: 'pointer', textDecoration: 'underline'}}
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Login;