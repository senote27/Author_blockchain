from fastapi import FastAPI, HTTPException, Depends, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from web3 import Web3
from eth_account import Account
from dotenv import load_dotenv
import os
import models
import auth
import json
from typing import Optional
from datetime import datetime
from pathlib import Path

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Web3 configuration
w3 = Web3(Web3.HTTPProvider(os.getenv('WEB3_PROVIDER_URI')))

# Load contract ABI and address
contract_path = Path(__file__).parent / "contracts" / "BookMarketplace.json"
with open(contract_path) as f:
    contract_json = json.load(f)
    CONTRACT_ABI = contract_json['abi']

CONTRACT_ADDRESS = os.getenv('CONTRACT_ADDRESS')
contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=CONTRACT_ABI)

# Database configuration
from database import SessionLocal, engine
models.Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Blockchain helper functions
def get_nonce(address):
    return w3.eth.get_transaction_count(address)

def send_transaction(transaction, private_key):
    signed_txn = w3.eth.account.sign_transaction(transaction, private_key)
    tx_hash = w3.eth.send_raw_transaction(signed_txn.rawTransaction)
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return tx_receipt

# API Routes

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "blockchain_connected": w3.is_connected(),
        "current_block": w3.eth.block_number
    }

@app.post("/register")
async def register(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    role: str = Form(...),
    db: Session = Depends(get_db)
):
    if role not in ["AUTHOR", "SELLER", "USER"]:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create Ethereum account for user
    account = Account.create()
    
    user = models.User(
        username=username,
        email=email,
        role=role,
        ethereum_address=account.address,
        ethereum_private_key=account.key.hex()  # In production, encrypt this!
    )
    user.set_password(password)
    
    db.add(user)
    db.commit()
    
    return {
        "message": "Registration successful",
        "ethereum_address": account.address
    }

@app.post("/login")
async def login(
    username: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not user.verify_password(password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "ethereum_address": user.ethereum_address
    }

@app.post("/author/upload-book")
async def upload_book(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    book_file: UploadFile = File(...),
    cover_file: Optional[UploadFile] = File(None),
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    if token["role"] != "AUTHOR":
        raise HTTPException(status_code=403, detail="Author access required")
    
    user = db.query(models.User).filter(models.User.username == token["sub"]).first()
    
    try:
        # Upload to IPFS
        book_hash = await ipfs_handler.upload_file(book_file)
        cover_hash = None
        if cover_file:
            cover_hash = await ipfs_handler.upload_file(cover_file)
        
        # Create blockchain transaction
        nonce = get_nonce(user.ethereum_address)
        
        transaction = contract.functions.addBook(
            title,
            book_hash,
            w3.to_wei(price, 'ether')
        ).build_transaction({
            'chainId': int(os.getenv('CHAIN_ID')),
            'gas': int(os.getenv('GAS_LIMIT')),
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
        })
        
        # Send transaction
        tx_receipt = send_transaction(transaction, user.ethereum_private_key)
        
        # Create database record
        book = models.Book(
            title=title,
            description=description,
            ipfs_hash=book_hash,
            cover_ipfs_hash=cover_hash,
            price=price,
            author_id=user.id,
            contract_address=CONTRACT_ADDRESS,
            transaction_hash=tx_receipt['transactionHash'].hex()
        )
        
        db.add(book)
        db.commit()
        
        return {
            "message": "Book uploaded successfully",
            "book_id": book.id,
            "transaction_hash": tx_receipt['transactionHash'].hex()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/purchase-book/{book_id}")
async def purchase_book(
    book_id: int,
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == token["sub"]).first()
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    try:
        nonce = get_nonce(user.ethereum_address)
        
        transaction = contract.functions.purchaseBook(
            book_id
        ).build_transaction({
            'chainId': int(os.getenv('CHAIN_ID')),
            'gas': int(os.getenv('GAS_LIMIT')),
            'gasPrice': w3.eth.gas_price,
            'nonce': nonce,
            'value': w3.to_wei(book.price, 'ether')
        })
        
        tx_receipt = send_transaction(transaction, user.ethereum_private_key)
        
        purchase = models.Purchase(
            book_id=book.id,
            buyer_id=user.id,
            price=book.price,
            transaction_hash=tx_receipt['transactionHash'].hex()
        )
        
        db.add(purchase)
        db.commit()
        
        return {
            "message": "Book purchased successfully",
            "transaction_hash": tx_receipt['transactionHash'].hex()
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/user/books")
async def get_user_books(
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.username == token["sub"]).first()
    
    if token["role"] == "AUTHOR":
        books = db.query(models.Book).filter(models.Book.author_id == user.id).all()
    else:
        purchases = db.query(models.Purchase).filter(models.Purchase.buyer_id == user.id).all()
        books = [purchase.book for purchase in purchases]
    
    return books

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)