import { ethers } from 'ethers';
import BookMarketplaceABI from '../contracts/BookMarketplace.json';

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.isInitialized = false;
        
        // Ganache configuration
        this.ganacheUrl = import.meta.env.VITE_WEB3_PROVIDER || 'http://127.0.0.1:7545';
        this.contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS;
        this.chainId = parseInt(import.meta.env.VITE_CHAIN_ID || '1337');
    }

    async initialize() {
        try {
            // Connect to Ganache
            this.provider = new ethers.providers.JsonRpcProvider(this.ganacheUrl);
            
            // Get network info
            const network = await this.provider.getNetwork();
            if (network.chainId !== this.chainId) {
                throw new Error(`Wrong network. Please connect to Ganache (Chain ID: ${this.chainId})`);
            }

            // Get first account as default signer
            const accounts = await this.provider.listAccounts();
            if (accounts.length === 0) {
                throw new Error('No accounts found in Ganache');
            }
            
            this.signer = this.provider.getSigner(accounts[0]);
            
            // Initialize contract
            this.contract = new ethers.Contract(
                this.contractAddress,
                BookMarketplaceABI.abi,
                this.signer
            );

            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Failed to initialize Web3:', error);
            throw error;
        }
    }

    async getAccounts() {
        try {
            return await this.provider.listAccounts();
        } catch (error) {
            console.error('Failed to get accounts:', error);
            throw error;
        }
    }

    async getCurrentAccount() {
        try {
            const accounts = await this.getAccounts();
            return accounts[0];
        } catch (error) {
            console.error('Failed to get current account:', error);
            throw error;
        }
    }

    // Contract interactions
    async addBook(title, ipfsHash, price) {
        if (!this.isInitialized) await this.initialize();
        try {
            const tx = await this.contract.addBook(title, ipfsHash, ethers.utils.parseEther(price.toString()));
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Failed to add book:', error);
            throw error;
        }
    }

    async purchaseBook(bookId, price) {
        if (!this.isInitialized) await this.initialize();
        try {
            const tx = await this.contract.purchaseBook(bookId, {
                value: ethers.utils.parseEther(price.toString())
            });
            await tx.wait();
            return tx.hash;
        } catch (error) {
            console.error('Failed to purchase book:', error);
            throw error;
        }
    }

    async getBookDetails(bookId) {
        if (!this.isInitialized) await this.initialize();
        try {
            const book = await this.contract.books(bookId);
            return {
                title: book.title,
                ipfsHash: book.ipfsHash,
                price: ethers.utils.formatEther(book.price),
                owner: book.owner
            };
        } catch (error) {
            console.error('Failed to get book details:', error);
            throw error;
        }
    }

    // Utility functions
    formatEther(wei) {
        return ethers.utils.formatEther(wei);
    }

    parseEther(ether) {
        return ethers.utils.parseEther(ether.toString());
    }
}

export const web3Service = new Web3Service();