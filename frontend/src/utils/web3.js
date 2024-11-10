import { ethers } from 'ethers';
import BookMarketplaceABI from '../contracts/BookMarketplace.json';

class Web3Service {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
  }

  async initialize() {
    if (typeof window.ethereum === 'undefined') {
      throw new Error('Please install MetaMask to use this application');
    }

    try {
      // Request account access
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      // Initialize provider and signer
      this.provider = new ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Initialize contract
      this.contract = new ethers.Contract(
        this.contractAddress,
        BookMarketplaceABI.abi,
        this.signer
      );

      // Validate network
      await this.validateNetwork();
    } catch (error) {
      console.error('Web3 initialization error:', error);
      throw error;
    }
  }

  async validateNetwork() {
    const network = await this.provider.getNetwork();
    const requiredChainId = parseInt(import.meta.env.VITE_CHAIN_ID);
    
    if (network.chainId !== requiredChainId) {
      throw new Error('Please connect to the correct network');
    }
  }

  async getAccounts() {
    try {
      const accounts = await this.provider.listAccounts();
      return accounts;
    } catch (error) {
      console.error('Get accounts error:', error);
      throw error;
    }
  }

  async signMessage(message) {
    try {
      const signature = await this.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Sign message error:', error);
      throw error;
    }
  }

  // Contract interactions
  async addBook(title, metadataHash, price) {
    try {
      const tx = await this.contract.addBook(title, metadataHash, price);
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Add book error:', error);
      throw error;
    }
  }

  async purchaseBook(bookId, price) {
    try {
      const tx = await this.contract.purchaseBook(bookId, {
        value: price
      });
      await tx.wait();
      return tx.hash;
    } catch (error) {
      console.error('Purchase book error:', error);
      throw error;
    }
  }

  async getBook(bookId) {
    try {
      const book = await this.contract.books(bookId);
      return book;
    } catch (error) {
      console.error('Get book error:', error);
      throw error;
    }
  }

  parseEth(amount) {
    return ethers.utils.parseEther(amount.toString());
  }

  formatEth(amount) {
    return ethers.utils.formatEther(amount);
  }
}

export const web3Service = new Web3Service();