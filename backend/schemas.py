from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    USER = "USER"
    AUTHOR = "AUTHOR"
    SELLER = "SELLER"

# Auth Schemas
class WalletAuth(BaseModel):
    wallet_address: str = Field(..., min_length=42, max_length=42)
    signature: str
    nonce: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: UserRole

# User Schemas
class UserBase(BaseModel):
    wallet_address: str = Field(..., min_length=42, max_length=42)
    role: UserRole

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]

    class Config:
        from_attributes = True

# Book Schemas
class BookBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    price: float = Field(..., gt=0)

class BookCreate(BookBase):
    book_hash: str
    cover_hash: Optional[str]
    metadata_hash: str
    author_address: str = Field(..., min_length=42, max_length=42)

    @validator('price')
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError('Price must be greater than 0')
        return v

class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=1000)
    price: Optional[float] = Field(None, gt=0)
    status: Optional[str] = Field(None, regex='^(active|deleted|suspended)$')

class Book(BookBase):
    id: int
    book_hash: str
    cover_hash: Optional[str]
    metadata_hash: str
    author_address: str
    created_at: datetime
    updated_at: Optional[datetime]
    status: str

    class Config:
        from_attributes = True

# Purchase Schemas
class PurchaseBase(BaseModel):
    book_id: int
    buyer_address: str = Field(..., min_length=42, max_length=42)
    transaction_hash: str = Field(..., min_length=66, max_length=66)
    purchase_price: float

class PurchaseCreate(PurchaseBase):
    pass

class Purchase(PurchaseBase):
    id: int
    purchased_at: datetime

    class Config:
        from_attributes = True

# Response Schemas
class Message(BaseModel):
    detail: str

class BookListResponse(BaseModel):
    books: list[Book]
    total: int
    page: int
    size: int

class UserStats(BaseModel):
    total_books: int
    total_sales: float
    total_purchases: float