from fastapi import APIRouter, HTTPException, UploadFile, File, Depends
from sqlalchemy.orm import Session
from typing import List
import numpy as np
import cv2
from app.database import get_db
from app.repositories import TrustedPersonRepository
from app.schemas import TrustedPerson
from app.services.trusted_service import TrustedPersonsService

router = APIRouter()


# Initialize service (will load embeddings from DB on demand)
def get_trusted_service(db: Session = Depends(get_db)):
    """Dependency to get the trusted persons service with current embeddings."""
    embeddings = TrustedPersonRepository.get_embeddings(db)
    return TrustedPersonsService(embeddings)


@router.post("/add-person")
async def add_trusted_person(
    name: str,
    phone: str = None,
    email: str = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Add a new trusted person by uploading a clear face image.
    The system extracts and stores the facial embedding.
    """
    try:
        # Read the uploaded image
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        # Extract embedding using the service
        service = TrustedPersonsService([])
        embedding = service.get_face_embedding(img)
        
        if embedding is None:
            raise HTTPException(
                status_code=400,
                detail="No face detected in image. Please upload a clear face image."
            )
        
        # Store in database
        person = TrustedPersonRepository.create_person(
            db,
            name=name,
            facial_embedding=embedding,
            phone=phone,
            email=email,
            embedding_model="FaceNet"
        )
        
        return {
            "message": "Trusted person added successfully",
            "person_id": person.id,
            "name": person.name
        }
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@router.get("/list", response_model=List[TrustedPerson])
async def get_trusted_persons(db: Session = Depends(get_db)):
    """
    Retrieve all active trusted persons.
    """
    persons = TrustedPersonRepository.get_all_active(db)
    return persons


@router.get("/{person_id}", response_model=TrustedPerson)
async def get_trusted_person(person_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a specific trusted person by ID.
    """
    person = TrustedPersonRepository.get_person(db, person_id)
    if not person:
        raise HTTPException(status_code=404, detail="Trusted person not found")
    return person


@router.post("/check-face")
async def check_trusted_face(
    file: UploadFile = File(...),
    threshold: float = 0.6,
    db: Session = Depends(get_db),
    service: TrustedPersonsService = Depends(get_trusted_service)
):
    """
    Check if an uploaded face image matches a trusted person.
    Returns match status and confidence.
    """
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image format")
        
        is_trusted, match_id, distance = service.check_face_with_details(img, threshold)
        
        response = {
            "is_trusted": is_trusted,
            "threshold": threshold
        }
        
        if is_trusted and match_id is not None:
            person = TrustedPersonRepository.get_person(db, match_id)
            if person:
                response["matched_person"] = person.name
                response["matched_person_id"] = match_id
                response["distance"] = float(distance)
        
        return response
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


@router.delete("/{person_id}")
async def delete_trusted_person(person_id: int, db: Session = Depends(get_db)):
    """
    Remove a person from the trusted persons list.
    """
    success = TrustedPersonRepository.delete_person(db, person_id)
    if not success:
        raise HTTPException(status_code=404, detail="Trusted person not found")
    return {"message": "Trusted person deleted"}


@router.get("/search/{name}")
async def search_trusted_persons(name: str, db: Session = Depends(get_db)):
    """
    Search trusted persons by name (partial match).
    """
    persons = TrustedPersonRepository.search_by_name(db, name)
    return persons