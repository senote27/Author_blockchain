import axios from 'axios';
import { create } from 'ipfs-http-client';

class IPFSService {
  constructor() {
    // IPFS configuration
    this.ipfs = create({
      host: 'localhost',
      port: 5001,
      protocol: 'http'
    });
    this.gateway = 'http://localhost:8080/ipfs';
  }

  async uploadFile(file) {
    try {
      // Create buffer from file
      const buffer = await this.fileToBuffer(file);
      
      // Upload to IPFS
      const result = await this.ipfs.add(buffer);
      return result.path;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw new Error('Failed to upload file to IPFS');
    }
  }

  async uploadJSON(data) {
    try {
      const buffer = Buffer.from(JSON.stringify(data));
      const result = await this.ipfs.add(buffer);
      return result.path;
    } catch (error) {
      console.error('IPFS JSON upload error:', error);
      throw new Error('Failed to upload JSON to IPFS');
    }
  }

  async getFile(hash) {
    try {
      const response = await axios.get(`${this.gateway}/${hash}`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('IPFS fetch error:', error);
      throw new Error('Failed to fetch file from IPFS');
    }
  }

  getFileUrl(hash) {
    return `${this.gateway}/${hash}`;
  }

  private async fileToBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const buffer = Buffer.from(reader.result);
        resolve(buffer);
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async validateConnection() {
    try {
      const version = await this.ipfs.version();
      return !!version;
    } catch {
      return false;
    }
  }
}

export const ipfsService = new IPFSService();