from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
import numpy as np
from app.models.schemas import TrustedPerson


class TrustedPersonRepository:
    """Data access layer for trusted persons."""
    
    @staticmethod
    def create_person(
        db: Session,
        name: str,
        facial_embedding: np.ndarray,
        phone: str = None,
        email: str = None,
        embedding_model: str = "FaceNet"
    ) -> TrustedPerson:
        """Create a new trusted person with facial embedding."""
        # Convert numpy array to binary for storage
        embedding_bytes = facial_embedding.astype(np.float32).tobytes()
        
        person = TrustedPerson(
            name=name,
            phone=phone,
            email=email,
            facial_embedding=embedding_bytes,
            embedding_model=embedding_model
        )
        db.add(person)
        db.commit()
        db.refresh(person)
        return person
    
    @staticmethod
    def get_person(db: Session, person_id: int) -> Optional[TrustedPerson]:
        """Fetch a trusted person by ID."""
        return db.query(TrustedPerson).filter(TrustedPerson.id == person_id).first()
    
    @staticmethod
    def get_all_active(db: Session) -> List[TrustedPerson]:
        """Fetch all active trusted persons."""
        return (
            db.query(TrustedPerson)
            .filter(TrustedPerson.is_active == True)
            .order_by(desc(TrustedPerson.added_at))
            .all()
        )
    
    @staticmethod
    def get_embeddings(db: Session) -> List[np.ndarray]:
        """Get all active trusted person embeddings as numpy arrays."""
        persons = TrustedPersonRepository.get_all_active(db)
        embeddings = []
        for person in persons:
            # Convert binary back to numpy array
            embedding = np.frombuffer(person.facial_embedding, dtype=np.float32)
            embeddings.append(embedding)
        return embeddings
    
    @staticmethod
    def update_person(db: Session, person_id: int, **kwargs) -> Optional[TrustedPerson]:
        """Update a trusted person's information."""
        person = db.query(TrustedPerson).filter(TrustedPerson.id == person_id).first()
        if person:
            for key, value in kwargs.items():
                if key != 'facial_embedding':  # Don't allow direct embedding update
                    setattr(person, key, value)
            db.commit()
            db.refresh(person)
        return person
    
    @staticmethod
    def delete_person(db: Session, person_id: int) -> bool:
        """Delete a trusted person."""
        person = db.query(TrustedPerson).filter(TrustedPerson.id == person_id).first()
        if person:
            db.delete(person)
            db.commit()
            return True
        return False
    
    @staticmethod
    def search_by_name(db: Session, name: str) -> List[TrustedPerson]:
        """Search trusted persons by name (partial match)."""
        return (
            db.query(TrustedPerson)
            .filter(TrustedPerson.is_active == True, TrustedPerson.name.ilike(f"%{name}%"))
            .all()
        )
