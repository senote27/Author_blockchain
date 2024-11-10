// components/BookList.jsx
import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import axios from 'axios';

const BookList = ({ web3Instance, account }) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await axios.get('http://localhost:8000/books');
      setBooks(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to fetch books');
      setLoading(false);
    }
  };

  const handlePurchase = async (book) => {
    try {
      if (!account) {
        alert('Please connect your wallet first');
        return;
      }

      // Convert price from ETH to Wei
      const priceInWei = ethers.utils.parseEther(book.price_eth.toString());

      // Create transaction
      const transaction = {
        from: account,
        to: book.seller_wallet_address,
        value: priceInWei,
      };

      // Send transaction using MetaMask
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [transaction],
      });

      // Record purchase in backend
      await axios.post('http://localhost:8000/purchases', {
        book_id: book.id,
        transaction_hash: txHash,
        price_paid: book.price_eth
      }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      alert('Purchase successful!');
      fetchBooks(); // Refresh book list
    } catch (err) {
      alert('Purchase failed: ' + err.message);
    }
  };

  if (loading) return <div>Loading books...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="book-list">
      <h2>Available Books</h2>
      <div className="book-grid">
        {books.map((book) => (
          <div key={book.id} className="book-card">
            {book.cover_ipfs_hash && (
              <img 
                src={`http://localhost:8080/ipfs/${book.cover_ipfs_hash}`}
                alt={book.title}
                className="book-cover"
              />
            )}
            <div className="book-info">
              <h3>{book.title}</h3>
              <p>{book.description}</p>
              <p className="price">{book.price_eth} ETH</p>
              <button 
                onClick={() => handlePurchase(book)}
                className="purchase-btn"
              >
                Purchase
              </button>
            </div>
          </div>
        ))}
      </div>

      <style jsx>{`
        .book-list {
          padding: 20px;
        }
        .book-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 20px;
          padding: 20px;
        }
        .book-card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          transition: transform 0.2s;
        }
        .book-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        }
        .book-cover {
          width: 100%;
          height: 200px;
          object-fit: cover;
          border-radius: 4px;
        }
        .book-info {
          padding: 10px 0;
        }
        .price {
          font-weight: bold;
          color: #2c3e50;
        }
        .purchase-btn {
          width: 100%;
          padding: 10px;
          background-color: #3498db;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .purchase-btn:hover {
          background-color: #2980b9;
        }
      `}</style>
    </div>
  );
};

export default BookList;