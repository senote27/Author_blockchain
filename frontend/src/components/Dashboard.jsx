// components/Dashboard.jsx
import { useState, useEffect } from 'react';
import axios from 'axios';
import BookList from './BookList';
import BookUpload from './BookUpload';
import WalletConnect from './WalletConnect';

const Dashboard = ({ userRole }) => {
  const [purchases, setPurchases] = useState([]);
  const [activeTab, setActiveTab] = useState('books');

  useEffect(() => {
    if (activeTab === 'purchases') {
      fetchPurchases();
    }
  }, [activeTab]);

  const fetchPurchases = async () => {
    try {
      const response = await axios.get('http://localhost:8000/purchases', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setPurchases(response.data);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <WalletConnect />
        <nav className="dashboard-nav">
          <button 
            className={`tab-btn ${activeTab === 'books' ? 'active' : ''}`}
            onClick={() => setActiveTab('books')}
          >
            Browse Books
          </button>
          <button 
            className={`tab-btn ${activeTab === 'purchases' ? 'active' : ''}`}
            onClick={() => setActiveTab('purchases')}
          >
            My Purchases
          </button>
          {(userRole === 'author' || userRole === 'seller') && (
            <button 
              className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
              onClick={() => setActiveTab('upload')}
            >
              Upload Book
            </button>
          )}
        </nav>
      </header>

      <main className="dashboard-content">
        {activeTab === 'books' && <BookList />}
        {activeTab === 'purchases' && (
          <div className="purchases-list">
            <h2>My Purchased Books</h2>
            {purchases.map(purchase => (
              <div key={purchase.id} className="purchase-item">
                <h3>{purchase.book.title}</h3>
                <p>Purchase Date: {new Date(purchase.purchase_date).toLocaleDateString()}</p>
                <p>Price Paid: {purchase.price_paid} ETH</p>
                <a 
                  href={`http://localhost:8000/ipfs/${purchase.book.ipfs_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="download-btn"
                >
                  Download Book
                </a>
              </div>
            ))}
          </div>
        )}
        {activeTab === 'upload' && <BookUpload />}
      </main>

      <style jsx>{`
        .dashboard {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
        }
        .dashboard-header {
          margin-bottom: 30px;
        }
        .dashboard-nav {
          display: flex;
          gap: 15px;
          margin-top: 20px;
        }
        .tab-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #f8f9fa;
        }
        .tab-btn.active {
          background: #3498db;
          color: white;
        }
        .purchases-list {
          display: grid;
          gap: 20px;
        }
        .purchase-item {
          padding: 20px;
          border-radius: 8px;
          background: white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .download-btn {
          display: inline-block;
          padding: 10px 20px;
          background: #27ae60;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;