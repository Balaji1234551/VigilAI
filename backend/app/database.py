"""
Database connection and session management for VigilAI.
Supports both synchronous (psycopg2) and high-performance asynchronous (asyncpg) operations
with secure environment variables and connection pooling.
"""
import os
from typing import Generator, AsyncGenerator
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import sessionmaker, Session

# Ensure env variables are loaded
load_dotenv()

# Secure Database Connection variables (Supports Railway PG variables)
DB_HOST = os.getenv("PGHOST", os.getenv("DB_HOST", "localhost"))
DB_PORT = os.getenv("PGPORT", os.getenv("DB_PORT", "5432"))
DB_NAME = os.getenv("PGDATABASE", os.getenv("DB_NAME", "vigilai_db"))
DB_USER = os.getenv("PGUSER", os.getenv("DB_USER", "postgres"))
DB_PASSWORD = os.getenv("PGPASSWORD", os.getenv("DB_PASSWORD", "postgres"))

# Base Connection URL Construction (Standard & Async)
_db_url_env = os.getenv("DATABASE_URL")
if _db_url_env:
    if _db_url_env.startswith("postgres://"):
        _db_url_env = _db_url_env.replace("postgres://", "postgresql://", 1)
    DATABASE_URL_SYNC = _db_url_env
    DATABASE_URL_ASYNC = _db_url_env.replace("postgresql://", "postgresql+asyncpg://")
else:
    DATABASE_URL_SYNC = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    DATABASE_URL_ASYNC = f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# --- Connection Pooling Settings ---
# pool_size: The number of connections to keep open inside the pool
# max_overflow: The number of connections to allow in addition to pool_size
# pool_recycle: Recycle connections older than this (in seconds)
# pool_pre_ping: Verify connection health on each checkout
POOL_SIZE = 20
MAX_OVERFLOW = 10
POOL_RECYCLE = 3600
POOL_PRE_PING = True

# --- Synchronous SQLAlchemy Engine & Session Setup ---
engine = create_engine(
    DATABASE_URL_SYNC,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=POOL_PRE_PING,
    echo=False  # Set to True for detailed SQL logging
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# --- Asynchronous SQLAlchemy Engine & Session Setup ---
async_engine = create_async_engine(
    DATABASE_URL_ASYNC,
    pool_size=POOL_SIZE,
    max_overflow=MAX_OVERFLOW,
    pool_recycle=POOL_RECYCLE,
    pool_pre_ping=POOL_PRE_PING,
    echo=False
)
AsyncSessionLocal = async_sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency injecting synchronous database sessions.
    Used for general REST CRUD routes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency injecting asynchronous database sessions.
    Optimized for real-time high-throughput AI detection inserts and notifications.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def init_db():
    """
    Synchronously verify connection and create all tables.
    Invoked on FastAPI application startup.
    """
    from app.models.schemas import Base
    # Import all models here so that they are registered correctly on Base.metadata
    Base.metadata.create_all(bind=engine)
