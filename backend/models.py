from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, sessionmaker
from sqlalchemy import create_engine
from datetime import datetime
from passlib.context import CryptContext

# Database configuration
SQLALCHEMY_DATABASE_URL = "sqlite:///./bookmarket.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String)  # "AUTHOR", "SELLER", "USER"
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    # Relationships
    books_authored = relationship("Book", back_populates="author", foreign_keys="Book.author_id")
    books_selling = relationship("Book", back_populates="seller", foreign_keys="Book.seller_id")
    purchases = relationship("Purchase", back_populates="buyer")

    def set_password(self, password):
        self.hashed_password = pwd_context.hash(password)

    def verify_password(self, password):
        return pwd_context.verify(password, self.hashed_password)

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    ipfs_hash = Column(String, unique=True)
    cover_ipfs_hash = Column(String)
    price = Column(Float)
    author_id = Column(Integer, ForeignKey("users.id"))
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    is_available = Column(Boolean, default=True)

    # Relationships
    author = relationship("User", back_populates="books_authored", foreign_keys=[author_id])
    seller = relationship("User", back_populates="books_selling", foreign_keys=[seller_id])
    purchases = relationship("Purchase", back_populates="book")

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"))
    price = Column(Float)
    purchase_date = Column(DateTime, default=datetime.utcnow)

    # Relationships
    book = relationship("Book", back_populates="purchases")
    buyer = relationship("User", back_populates="purchases")

# Create tables
Base.metadata.create_all(bind=engine)