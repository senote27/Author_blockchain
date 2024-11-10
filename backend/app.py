from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timedelta
from eth_account.messages import encode_defunct
from web3 import Web3
import jwt
import os
from dotenv import load_dotenv

from . import models, schemas, database

# Load environment variables
load_dotenv()

app = FastAPI(title="Book Marketplace API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-for-development")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Database dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Authentication functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        wallet_address: str = payload.get("wallet")
        if wallet_address is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.wallet_address == wallet_address).first()
    if user is None:
        raise credentials_exception
    return user

# Authentication endpoints
@app.post("/auth/verify", response_model=schemas.Token)
async def verify_wallet(auth_data: schemas.WalletAuth, db: Session = Depends(get_db)):
    # Create message for signature verification
    message = encode_defunct(text=f"Login to Book Marketplace: {auth_data.nonce}")
    w3 = Web3()
    
    try:
        # Recover address from signature
        recovered_address = w3.eth.account.recover_message(message, signature=auth_data.signature)
        if recovered_address.lower() != auth_data.wallet_address.lower():
            raise HTTPException(status_code=401, detail="Invalid signature")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid signature")

    # Get or create user
    user = db.query(models.User).filter(models.User.wallet_address == recovered_address).first()
    if not user:
        user = models.User(
            wallet_address=recovered_address,
            role=models.UserRole.USER
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # Create access token
    access_token = create_access_token(
        data={"wallet": recovered_address, "role": user.role}
    )
    return {"access_token": access_token, "token_type": "bearer", "role": user.role}

# Book endpoints
@app.post("/books", response_model=schemas.Book)
async def create_book(
    book: schemas.BookCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role not in [models.UserRole.AUTHOR, models.UserRole.SELLER]:
        raise HTTPException(
            status_code=403,
            detail="Only authors and sellers can create books"
        )
    
    db_book = models.Book(**book.model_dump())
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

@app.get("/books", response_model=schemas.BookListResponse)
async def list_books(
    skip: int = 0,
    limit: int = 10,
    db: Session = Depends(get_db)
):
    books = db.query(models.Book).filter(
        models.Book.status == 'active'
    ).offset(skip).limit(limit).all()
    
    total = db.query(models.Book).filter(
        models.Book.status == 'active'
    ).count()
    
    return {
        "books": books,
        "total": total,
        "page": skip // limit + 1,
        "size": limit
    }

@app.get("/books/{book_id}", response_model=schemas.Book)
async def get_book(
    book_id: int,
    db: Session = Depends(get_db)
):
    book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

@app.patch("/books/{book_id}", response_model=schemas.Book)
async def update_book(
    book_id: int,
    book_update: schemas.BookUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db_book = db.query(models.Book).filter(models.Book.id == book_id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    if db_book.author_address != current_user.wallet_address:
        raise HTTPException(status_code=403, detail="Not authorized to update this book")
    
    for field, value in book_update.model_dump(exclude_unset=True).items():
        setattr(db_book, field, value)
    
    db.commit()
    db.refresh(db_book)
    return db_book

# Purchase endpoints
@app.post("/purchases", response_model=schemas.Purchase)
async def create_purchase(
    purchase: schemas.PurchaseCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify book exists and is active
    book = db.query(models.Book).filter(models.Book.id == purchase.book_id).first()
    if not book or book.status != 'active':
        raise HTTPException(status_code=404, detail="Book not found or not available")
    
    # Create purchase record
    db_purchase = models.Purchase(**purchase.model_dump())
    db.add(db_purchase)
    db.commit()
    db.refresh(db_purchase)
    return db_purchase

@app.get("/users/me/stats", response_model=schemas.UserStats)
async def get_user_stats(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get total books published
    total_books = db.query(models.Book).filter(
        models.Book.author_address == current_user.wallet_address
    ).count()
    
    # Get total sales amount
    total_sales = db.query(func.sum(models.Purchase.purchase_price)).join(models.Book).filter(
        models.Book.author_address == current_user.wallet_address
    ).scalar() or 0.0
    
    # Get total purchases amount
    total_purchases = db.query(func.sum(models.Purchase.purchase_price)).filter(
        models.Purchase.buyer_address == current_user.wallet_address
    ).scalar() or 0.0
    
    return {
        "total_books": total_books,
        "total_sales": float(total_sales),
        "total_purchases": float(total_purchases)
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return {"detail": exc.detail}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)