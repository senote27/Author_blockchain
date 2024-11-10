import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { web3Service } from './utils/web3';
import BookUpload from './components/BookUpload';
import BookList from './components/BookList';
import WalletConnect from './components/WalletConnect';

function App() {
  const [account, setAccount] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkWalletConnection();
    checkAuthStatus();
  }, []);

  const checkWalletConnection = async () => {
    try {
      await web3Service.initialize();
      const accounts = await web3Service.getAccounts();
      if (accounts.length > 0) {
        setAccount(accounts[0]);
      }
      
      // Listen for account changes
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    } catch (error) {
      console.error('Web3 initialization error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    } else {
      setAccount(null);
      setIsAuthenticated(false);
      localStorage.removeItem('token');
      navigate('/');
    }
  };

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('userRole');
    if (token) {
      setIsAuthenticated(true);
      setUserRole(role);
    }
  };

  const handleLogin = async (nonce) => {
    try {
      // Get signature from MetaMask
      const signature = await web3Service.signMessage(
        `Login to Book Marketplace: ${nonce}`
      );

      // Verify signature with backend
      const response = await fetch('http://localhost:8000/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wallet_address: account,
          signature,
          nonce,
        }),
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('userRole', data.role);
      setIsAuthenticated(true);
      setUserRole(data.role);
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    setIsAuthenticated(false);
    setUserRole(null);
    navigate('/');
  };

  if (loading) {
    return <div className="container">Loading...</div>;
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="nav-container">
          <h1>Book Marketplace</h1>
          <div className="nav-right">
            <WalletConnect account={account} />
            {isAuthenticated && (
              <button onClick={handleLogout} className="button">
                Logout
              </button>
            )}
          </div>