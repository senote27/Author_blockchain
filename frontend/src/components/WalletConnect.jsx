// components/WalletConnect.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const WalletConnect = ({ onConnect }) => {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkWalletConnection();
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', () => window.location.reload());
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  const checkWalletConnection = async () => {
    try {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_accounts' 
        });
        if (accounts.length > 0) {
          handleAccountsChanged(accounts);
        }
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
      setError('Failed to check wallet connection');
    }
  };

  const handleAccountsChanged = async (accounts) => {
    if (accounts.length === 0) {
      setAccount(null);
      setBalance(null);
      setError('Please connect to MetaMask');
    } else {
      const account = accounts[0];
      setAccount(account);
      await updateBalance(account);
      if (onConnect) {
        onConnect(account);
      }
    }
  };

  const updateBalance = async (account) => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const balance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(balance));
    } catch (err) {
      console.error('Error getting balance:', err);
      setError('Failed to get balance');
    }
  };

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      handleAccountsChanged(accounts);
    } catch (err) {
      console.error('Error connecting wallet:', err);
      setError(err.message);
    }
  };

  return (
    <div className="wallet-connect">
      {error && <div className="error">{error}</div>}
      
      {!account ? (
        <button onClick={connectWallet} className="connect-btn">
          Connect Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <p className="address">
            Connected: {account.slice(0, 6)}...{account.slice(-4)}
          </p>
          {balance && <p className="balance">{balance} ETH</p>}
        </div>
      )}

      <style jsx>{`
        .wallet-connect {
          padding: 15px;
          border-radius: 8px;
          background-color: #f8f9fa;
        }
        .error {
          color: #dc3545;
          margin-bottom: 10px;
          padding: 10px;
          border-radius: 4px;
          background-color: #f8d7da;
        }
        .connect-btn {
          background-color: #3498db;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        .connect-btn:hover {
          background-color: #2980b9;
        }
        .wallet-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px;
          background-color: white;
          border-radius: 4px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .address {
          font-family: monospace;
          color: #2c3e50;
        }
        .balance {
          font-weight: bold;
          color: #27ae60;
        }
      `}</style>
    </div>
  );
};

export default WalletConnect;