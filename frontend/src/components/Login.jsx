// components/Login.jsx
import { useState } from 'react';
import axios from 'axios';
import WalletConnect from './WalletConnect';

const Login = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user', // default role
    wallet_address: ''
  });

  const handleWalletConnect = (address) => {
    setFormData(prev => ({ ...prev, wallet_address: address }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/register' : '/token';
      const payload = isRegistering 
        ? formData
        : { username: formData.username, password: formData.password };

      const response = await axios.post(`http://localhost:8000${endpoint}`, payload);
      
      if (response.data) {
        const token = isRegistering 
          ? response.data.access_token 
          : response.data.access_token;
        localStorage.setItem('token', token);
        onLogin(token);
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="login-container">
      <h2>{isRegistering ? 'Register' : 'Login'}</h2>
      
      <WalletConnect onConnect={handleWalletConnect} />

      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Username"
          value={formData.username}
          onChange={(e) => setFormData({...formData, username: e.target.value})}
        />
        
        <input
          type="password"
          placeholder="Password"
          value={formData.password}
          onChange={(e) => setFormData({...formData, password: e.target.value})}
        />

        {isRegistering && (
          <select
            value={formData.role}
            onChange={(e) => setFormData({...formData, role: e.target.value})}
          >
            <option value="user">User</option>
            <option value="author">Author</option>
            <option value="seller">Seller</option>
          </select>
        )}

        <button type="submit" className="submit-btn">
          {isRegistering ? 'Register' : 'Login'}
        </button>
      </form>

      <button 
        onClick={() => setIsRegistering(!isRegistering)}
        className="toggle-btn"
      >
        {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
      </button>

      <style jsx>{`
        .login-container {
          max-width: 400px;
          margin: 40px auto;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
          margin-top: 20px;
        }
        input, select {
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }
        .submit-btn {
          background-color: #3498db;
          color: white;
          padding: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .toggle-btn {
          margin-top: 15px;
          background: none;
          border: none;
          color: #3498db;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
};

export default Login;