import { useState } from 'react';
import { ipfsService } from '../utils/ipfs';
import { web3Service } from '../utils/web3';

const BookUpload = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    bookFile: null,
    coverImage: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      if (name === 'bookFile' && files[0].type !== 'application/pdf') {
        setError('Please upload a PDF file');
        return;
      }
      setFormData(prev => ({
        ...prev,
        [name]: files[0]
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      // Validate form
      if (!formData.title || !formData.price || !formData.bookFile) {
        throw new Error('Please fill in all required fields');
      }

      // Convert price to Wei
      const priceInWei = web3Service.toWei(formData.price);

      // Upload book to IPFS
      const bookHash = await ipfsService.uploadFile(formData.bookFile);

      // Upload cover image if provided
      let coverHash = '';
      if (formData.coverImage) {
        coverHash = await ipfsService.uploadFile(formData.coverImage);
      }

      // Create book metadata
      const bookMetadata = {
        title: formData.title,
        description: formData.description || '',
        bookHash,
        coverHash,
        price: priceInWei.toString()
      };

      // Upload metadata to IPFS
      const metadataHash = await ipfsService.uploadFile(
        new Blob([JSON.stringify(bookMetadata)], { type: 'application/json' })
      );

      // Add book to backend
      const response = await fetch('http://localhost:8000/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          book_hash: bookHash,
          cover_hash: coverHash,
          metadata_hash: metadataHash,
          price: Number(formData.price),
          author_address: web3Service.getCurrentAccount()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save book details');
      }

      setSuccess('Book uploaded successfully!');
      // Reset form
      setFormData({
        title: '',
        description: '',
        price: '',
        bookFile: null,
        coverImage: null
      });
    } catch (err) {
      setError(err.message || 'Failed to upload book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Upload Book</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows="3"
          />
        </div>

        <div className="form-group">
          <label htmlFor="price">Price (ETH) *</label>
          <input
            type="number"
            id="price"
            name="price"
            value={formData.price}
            onChange={handleInputChange}
            step="0.001"
            min="0"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="bookFile">Book File (PDF) *</label>
          <input
            type="file"
            id="bookFile"
            name="bookFile"
            onChange={handleFileChange}
            accept="application/pdf"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="coverImage">Cover Image</label>
          <input
            type="file"
            id="coverImage"
            name="coverImage"
            onChange={handleFileChange}
            accept="image/*"
          />
        </div>

        <button 
          type="submit" 
          className="submit-button"
          disabled={loading}
        >
          {loading ? 'Uploading...' : 'Upload Book'}
        </button>
      </form>
    </div>
  );
};

export default BookUpload;