import numpy as np
from typing import List, Tuple, Optional
import cv2


class TrustedPersonsService:
    """Service for managing trusted persons and facial recognition."""
    
    def __init__(self, embeddings_db: List[np.ndarray]):
        """
        Initialize with a database of facial embeddings for trusted persons.
        
        Args:
            embeddings_db: List of numpy arrays representing facial embeddings
        """
        self.embeddings_db = embeddings_db
        self.model_name = "Facenet"  # Using FaceNet for embeddings
        self.threshold = 0.6  # Default distance threshold
    
    def get_face_embedding(self, face_image: np.ndarray) -> Optional[np.ndarray]:
        """
        Extract facial embedding from an image.
        
        Args:
            face_image: The face image as numpy array (BGR format from OpenCV)
        
        Returns:
            Embedding as numpy array, or None if no face detected
        """
        try:
            from deepface import DeepFace
            # DeepFace returns list of results, we take the first one
            embeddings = DeepFace.represent(
                face_image,
                model_name=self.model_name,
                enforce_detection=True  # Require face detection
            )
            
            if embeddings and len(embeddings) > 0:
                embedding = np.array(embeddings[0]['embedding'])
                return embedding
            return None
        except Exception as e:
            print(f"Error extracting face embedding: {e}")
            return None
    
    def is_trusted_person(self, face_image: np.ndarray, threshold: float = None) -> bool:
        """
        Check if a detected face belongs to a trusted person.
        
        Args:
            face_image: The detected face image
            threshold: Distance threshold for matching (default: 0.6)
        
        Returns:
            True if match found within threshold
        """
        if threshold is None:
            threshold = self.threshold
        
        _, is_match, _ = self.check_face_with_details(face_image, threshold)
        return is_match
    
    def check_face_with_details(
        self,
        face_image: np.ndarray,
        threshold: float = None
    ) -> Tuple[int, bool, float]:
        """
        Check face and return detailed match information.
        
        Args:
            face_image: The detected face image
            threshold: Distance threshold for matching
        
        Returns:
            Tuple of (matched_person_id, is_trusted, distance)
            matched_person_id: index of matched person or -1 if no match
            is_trusted: Boolean indicating if match found
            distance: Euclidean distance to closest match
        """
        if threshold is None:
            threshold = self.threshold
        
        try:
            # Extract embedding for the detected face
            detected_embedding = self.get_face_embedding(face_image)
            
            if detected_embedding is None:
                return (-1, False, float('inf'))
            
            # Compare with each trusted embedding
            min_distance = float('inf')
            matched_id = -1
            
            for idx, trusted_embedding in enumerate(self.embeddings_db):
                distance = np.linalg.norm(detected_embedding - trusted_embedding)
                
                if distance < min_distance:
                    min_distance = distance
                    matched_id = idx
            
            # Check if minimum distance is within threshold
            is_match = min_distance < threshold
            
            return (matched_id if is_match else -1, is_match, min_distance)
        
        except Exception as e:
            print(f"Error in facial recognition: {e}")
            return (-1, False, float('inf'))
    
    def batch_check_faces(
        self,
        face_images: List[np.ndarray],
        threshold: float = None
    ) -> List[dict]:
        """
        Check multiple faces at once.
        
        Args:
            face_images: List of face images
            threshold: Distance threshold
        
        Returns:
            List of result dicts with is_trusted and distance
        """
        results = []
        for img in face_images:
            matched_id, is_trusted, distance = self.check_face_with_details(img, threshold)
            results.append({
                "is_trusted": is_trusted,
                "matched_id": matched_id,
                "distance": float(distance)
            })
        return results
