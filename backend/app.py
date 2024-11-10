from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Optional
import models
from models import SessionLocal
from ipfs_handler import IPFSHandler
import auth
from datetime import datetime

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize IPFS handler
ipfs_handler = IPFSHandler()

# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# User registration
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
    
    # Check if username exists
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    
    # Create new user
    user = models.User(username=username, email=email, role=role)
    user.set_password(password)
    
    db.add(user)
    db.commit()
    
    return {"message": "Registration successful"}

# User login
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
        "username": user.username
    }

# Author endpoints
@app.post("/author/upload-book")
async def upload_book(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    book_file: UploadFile = File(...),
    cover_file: UploadFile = File(None),
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    if token["role"] != "AUTHOR":
        raise HTTPException(status_code=403, detail="Author access required")
    
    author = db.query(models.User).filter(models.User.username == token["sub"]).first()
    
    # Upload book to IPFS
    book_hash = await ipfs_handler.upload_file(book_file)
    cover_hash = None
    if cover_file:
        cover_hash = await ipfs_handler.upload_file(cover_file)
    
    # Create book record
    book = models.Book(
        title=title,
        description=description,
        ipfs_hash=book_hash,
        cover_ipfs_hash=cover_hash,
        price=price,
        author_id=author.id
    )
    
    db.add(book)
    db.commit()
    
    return {"message": "Book uploaded successfully", "book_id": book.id}

# Seller endpoints
@app.post("/seller/list-book/{book_id}")
async def list_book(
    book_id: int,
    price: float = Form(...),
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    if token["role"] != "SELLER":
        raise HTTPException(status_code=403, detail="Seller access required")
    
    seller = db.query(models.User).filter(models.User.username == token["sub"]).first()
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if book.seller_id:
        raise HTTPException(status_code=400, detail="Book already listed")
    
    book.seller_id = seller.id
    book.price = price
    db.commit()
    
    return {"message": "Book listed successfully"}

# User endpoints
@app.post("/user/purchase-book/{book_id}")
async def purchase_book(
    book_id: int,
    token: dict = Depends(auth.verify_token),
    db: Session = Depends(get_db)
):
    if token["role"] != "USER":
        raise HTTPException(status_code=403, detail="User access required")
    
    buyer = db.query(models.User).filter(models.User.username == token["sub"]).first()
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if not book.is_available:
        raise HTTPException(status_code=400, detail="Book not available")
    
    # Create purchase record
    purchase = models.Purchase(
        book_id=book.id,
        buyer_id=buyer.id,
        price=book.price
    )
    
    db.add(purchase)
    db.commit()
    
    return {
        "message": "Purchase successful",
        "ipfs_hash": book.ipfs_hash
    }

# Get book list
@app.get("/books")
async def get_books(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 10
):
    books = db.query(models.Book).offset(skip).limit(limit).all()
    return books

# Run server
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)