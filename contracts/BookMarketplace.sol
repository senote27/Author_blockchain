// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract BookMarketplace is Ownable, ReentrancyGuard, Pausable {
    using Counters for Counters.Counter;

    struct Book {
        uint256 id;
        address author;
        string title;
        string ipfsHash;
        uint256 price;
        bool isActive;
        uint256 copiesSold;
        uint256 totalRevenue;
        uint256 createdAt;
        uint256 updatedAt;
    }

    // State variables
    Counters.Counter private _bookIds;
    mapping(uint256 => Book) public books;
    mapping(address => uint256[]) public authorBooks;
    mapping(address => mapping(uint256 => bool)) public purchases;
    
    uint256 public platformFeePercent = 10; // 10% platform fee
    uint256 public constant MAX_FEE_PERCENT = 30; // Maximum 30% platform fee
    
    // Events
    event BookCreated(
        uint256 indexed bookId,
        address indexed author,
        string title,
        uint256 price,
        string ipfsHash
    );
    
    event BookPurchased(
        uint256 indexed bookId,
        address indexed buyer,
        address indexed author,
        uint256 price
    );
    
    event BookUpdated(
        uint256 indexed bookId,
        string title,
        uint256 price,
        bool isActive
    );
    
    event PlatformFeeUpdated(uint256 newFeePercent);
    
    // Modifiers
    modifier onlyBookAuthor(uint256 bookId) {
        require(books[bookId].author == msg.sender, "Not the book author");
        _;
    }
    
    modifier bookExists(uint256 bookId) {
        require(bookId > 0 && bookId <= _bookIds.current(), "Book does not exist");
        _;
    }
    
    modifier bookActive(uint256 bookId) {
        require(books[bookId].isActive, "Book is not active");
        _;
    }
    
    // Constructor
    constructor() {
        _bookIds.increment(); // Start book IDs at 1
    }
    
    // Core functions
    function createBook(
        string memory title,
        string memory ipfsHash,
        uint256 price
    ) external whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(price > 0, "Price must be greater than 0");
        
        uint256 bookId = _bookIds.current();
        
        Book storage newBook = books[bookId];
        newBook.id = bookId;
        newBook.author = msg.sender;
        newBook.title = title;
        newBook.ipfsHash = ipfsHash;
        newBook.price = price;
        newBook.isActive = true;
        newBook.copiesSold = 0;
        newBook.totalRevenue = 0;
        newBook.createdAt = block.timestamp;
        newBook.updatedAt = block.timestamp;
        
        authorBooks[msg.sender].push(bookId);
        _bookIds.increment();
        
        emit BookCreated(bookId, msg.sender, title, price, ipfsHash);
        return bookId;
    }
    
    function purchaseBook(uint256 bookId) 
        external 
        payable 
        nonReentrant 
        whenNotPaused 
        bookExists(bookId) 
        bookActive(bookId) 
    {
        Book storage book = books[bookId];
        require(msg.value == book.price, "Incorrect payment amount");
        require(!purchases[msg.sender][bookId], "Already purchased this book");
        
        purchases[msg.sender][bookId] = true;
        book.copiesSold++;
        book.totalRevenue += msg.value;
        
        uint256 platformFee = (msg.value * platformFeePercent) / 100;
        uint256 authorPayment = msg.value - platformFee;
        
        (bool success, ) = book.author.call{value: authorPayment}("");
        require(success, "Author payment failed");
        
        emit BookPurchased(bookId, msg.sender, book.author, msg.value);
    }
    
    function updateBook(
        uint256 bookId,
        string memory title,
        uint256 price,
        bool isActive
    ) 
        external 
        whenNotPaused 
        bookExists(bookId) 
        onlyBookAuthor(bookId) 
    {
        Book storage book = books[bookId];
        
        if (bytes(title).length > 0) {
            book.title = title;
        }
        if (price > 0) {
            book.price = price;
        }
        book.isActive = isActive;
        book.updatedAt = block.timestamp;
        
        emit BookUpdated(bookId, title, price, isActive);
    }
    
    // View functions
    function getBook(uint256 bookId) 
        external 
        view 
        bookExists(bookId) 
        returns (Book memory) 
    {
        return books[bookId];
    }
    
    function getAuthorBooks(address author) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return authorBooks[author];
    }
    
    function hasPurchased(address buyer, uint256 bookId) 
        external 
        view 
        returns (bool) 
    {
        return purchases[buyer][bookId];
    }
    
    // Admin functions
    function updatePlatformFee(uint256 newFeePercent) external onlyOwner {
        require(newFeePercent <= MAX_FEE_PERCENT, "Fee too high");
        platformFeePercent = newFeePercent;
        emit PlatformFeeUpdated(newFeePercent);
    }
    
    function pause() external onlyOwner {
        _pause();
    }
    
    function unpause() external onlyOwner {
        _unpause();
    }
    
    // Emergency functions
    function withdrawStuckFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}