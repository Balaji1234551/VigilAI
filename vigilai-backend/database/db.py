"""
Database connection, session management, and table initializers for VigilAI.
Configures SQLAlchemy to support multi-threaded SQLite access.
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
from config import DATABASE_URL

import logging

logger = logging.getLogger("VigilAI.Database")

# Configure database connection arguments based on the dialect
connect_args = {}
engine_kwargs = {
    "pool_pre_ping": True,
    "pool_recycle": 1800  # Automatically refresh connections every 30 mins
}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
    engine_kwargs["connect_args"] = connect_args
else:
    # PostgreSQL production optimizations
    engine_kwargs["pool_size"] = 10
    engine_kwargs["max_overflow"] = 20

# Setup SQLAlchemy DB Engine
engine = create_engine(
    DATABASE_URL,
    **engine_kwargs
)

# Setup Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Declare Declarative Base for Model mapping
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    FastAPI dependency injection for database sessions.
    Guarantees session closing upon request completion.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Creates all tables in the database if they do not exist.
    Called once during FastAPI server startup.
    """
    # Import models here to register schemas on Base
    import database.models
    Base.metadata.create_all(bind=engine)
