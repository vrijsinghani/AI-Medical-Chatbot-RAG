import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch, isLoggedIn, startSession } from '../session';

const MIN_PASSWORD_LENGTH = 8;

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const isDarkMode = localStorage.getItem('aiMedicalTheme') === 'dark';

  const theme = {
    bg: isDarkMode ? '#121212' : '#f4f7f6',
    cardBg: isDarkMode ? '#1e1e1e' : '#ffffff',
    textMain: isDarkMode ? '#f1f1f1' : '#333333',
    textMuted: isDarkMode ? '#aaaaaa' : '#777777',
    inputBg: isDarkMode ? '#2d2d2d' : '#f9f9f9',
    border: isDarkMode ? '#333333' : '#dddddd',
    primary: '#0277bd',
    danger: '#e63946',
  };
  const inputStyle = { padding: '15px', borderRadius: '8px', border: `1px solid ${theme.border}`, backgroundColor: theme.inputBg, color: theme.textMain, fontSize: '15px', outline: 'none' };

  useEffect(() => {
    if (isLoggedIn()) navigate('/');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);
    try {
      const response = await fetch(`/api/auth/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, name }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrorMessage(data.detail || `Server error ${response.status}`);
        return;
      }
      startSession(data);

      const profileRes = await apiFetch('/api/profile');
      if (profileRes.ok) {
        const profile = await profileRes.json();
        localStorage.setItem('aiMedicalUserName', profile.name || 'Patient');
      }
      navigate('/');
    } catch (error) {
      setErrorMessage(`Could not reach the backend: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAuthMode = () => {
    setIsLogin(!isLogin);
    setErrorMessage('');
  };

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', minHeight: '100vh', backgroundColor: theme.bg, color: theme.textMain, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'Arial, sans-serif', overflow: 'hidden', margin: 0, padding: 0 }}>

      <div style={{ position: 'absolute', top: '20px', left: '30px', zIndex: 10 }}>
        <Link to="/" style={{ textDecoration: 'none', color: theme.primary, fontWeight: 'bold', fontSize: '16px' }}>← Back to Home</Link>
      </div>

      <div style={{ backgroundColor: theme.cardBg, padding: '40px 50px', borderRadius: '15px', boxShadow: isDarkMode ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(0,0,0,0.08)', width: '100%', maxWidth: '400px', textAlign: 'center', borderTop: `5px solid ${theme.primary}` }}>
        <div style={{ fontSize: '40px', marginBottom: '10px' }}>🩺</div>

        <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        <p style={{ color: theme.textMuted, marginBottom: errorMessage ? '15px' : '30px', fontSize: '15px' }}>
          {isLogin ? 'Login to access your AI Medical Assistant' : 'Sign up to get personalized medical advice'}
        </p>

        {errorMessage && (
          <div style={{ backgroundColor: 'rgba(230, 57, 70, 0.1)', color: theme.danger, padding: '10px', borderRadius: '8px', marginBottom: '20px', fontSize: '14px', border: `1px solid ${theme.danger}` }}>
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} />
          )}
          <input type="text" placeholder="Username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required style={inputStyle} />
          <input
            type="password"
            placeholder={`Password (Min ${MIN_PASSWORD_LENGTH} chars)`}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={MIN_PASSWORD_LENGTH}
            style={inputStyle}
          />

          <button type="submit" disabled={isLoading} style={{ backgroundColor: isLoading ? theme.textMuted : theme.primary, color: 'white', padding: '15px', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer', marginTop: '5px', transition: '0.3s' }}>
            {isLoading ? 'Processing... ⏳' : (isLogin ? 'Login 🚀' : 'Sign Up 🚀')}
          </button>
        </form>

        <div style={{ marginTop: '25px', color: theme.textMuted, fontSize: '14px' }}>
          {isLogin ? "Don't have an account? " : 'Already have an account? '}
          <span onClick={toggleAuthMode} style={{ color: theme.primary, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}>{isLogin ? 'Sign Up' : 'Login'}</span>
        </div>
      </div>
    </div>
  );
}
