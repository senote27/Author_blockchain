from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base, engine
from passlib.context import CryptContext
import enum

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRole(str, enum.Enum):
    AUTHOR = "AUTHOR"
    SELLER = "SELLER"
    USER = "USER"

class PurchaseStatus(str, enum.Enum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    role = Column(String, default=UserRole.USER)
    ethereum_address = Column(String, unique=True)
    ethereum_private_key = Column(String, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    books_authored = relationship("Book", back_populates="author")
    purchases = relationship("Purchase", back_populates="buyer")

    def set_password(self, password: str):
        self.hashed_password = pwd_context.hash(password)

    def verify_password(self, password: str):
        return pwd_context.verify(password, self.hashed_password)

class Book(Base):
    __tablename__ = "books"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String)
    price = Column(Float)
    book_hash = Column(String)  # IPFS hash of the book file
    cover_hash = Column(String, nullable=True)  # IPFS hash of the cover image
    author_id = Column(Integer, ForeignKey("users.id"))
    contract_id = Column(Integer)  # ID in the smart contract
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    author = relationship("User", back_populates="books_authored")
    purchases = relationship("Purchase", back_populates="book")

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "price": self.price,
            "book_hash": self.book_hash,
            "cover_hash": self.cover_hash,
            "author_id": self.author_id,
            "contract_id": self.contract_id,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    book_id = Column(Integer, ForeignKey("books.id"))
    buyer_id = Column(Integer, ForeignKey("users.id"))
    transaction_hash = Column(String, unique=True)
    purchase_price = Column(Float)
    status = Column(Enum(PurchaseStatus), default=PurchaseStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    book = relationship("Book", back_populates="purchases")
    buyer = relationship("User", back_populates="purchases")

    def to_dict(self):
        return {
            "id": self.id,
            "book_id": self.book_id,
            "buyer_id": self.buyer_id,
            "transaction_hash": self.transaction_hash,
            "purchase_price": self.purchase_price,
            "status": self.status,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()