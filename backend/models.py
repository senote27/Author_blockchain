from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from .database import Base
import enum

class UserRole(str, enum.Enum):
    USER = "USER"
    AUTHOR = "AUTHOR"
    SELLER = "SELLER"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    wallet_address = Column(String(42), unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.USER, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    books = relationship("Book", back_populates="author")
    purchases = relationship("Purchase", back_populates="buyer")

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(String(1000))
    book_hash = Column(String(255), nullable=False)  # IPFS hash for the book file
    cover_hash = Column(String(255))  # IPFS hash for cover image
    metadata_hash = Column(String(255), nullable=False)  # IPFS hash for metadata
    price = Column(Float, nullable=False)
    author_address = Column(String(42), ForeignKey('users.wallet_address'), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    status = Column(String(20), default='active')  # active, deleted, suspended

    # Relationships
    author = relationship("User", back_populates="books")
    purchases = relationship("Purchase", back_populates="book")

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey('books.id'), nullable=False)
    buyer_address = Column(String(42), ForeignKey('users.wallet_address'), nullable=False)
    transaction_hash = Column(String(66), nullable=False)  # Ethereum transaction hash
    purchase_price = Column(Float, nullable=False)
    purchased_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    book = relationship("Book", back_populates="purchases")
    buyer = relationship("User", back_populates="purchases")