from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import Optional, Dict
from app.models.schemas import Analytics, Detection, Alert, Camera

class AnalyticsRepository:
    @staticmethod
    def get_latest(db: Session, user_id: int) -> Optional[Analytics]:
        return db.query(Analytics).filter(Analytics.user_id == user_id).order_by(Analytics.generated_at.desc()).first()

    @staticmethod
    def generate_dashboard_metrics(db: Session, user_id: int) -> Dict:
        total_cameras = db.query(Camera).filter(Camera.user_id == user_id).count()
        processed_cameras = db.query(Camera).filter(Camera.user_id == user_id, Camera.status == 'completed').count()
        total_alerts = db.query(Alert).filter(Alert.user_id == user_id).count()
        
        # Calculate individual threat counts from Alerts
        fall_count = db.query(Alert).filter(Alert.user_id == user_id, Alert.anomaly_type == "FALL").count()
        fight_count = db.query(Alert).filter(Alert.user_id == user_id, Alert.anomaly_type == "FIGHT").count()
        weapon_count = db.query(Alert).filter(Alert.user_id == user_id, Alert.anomaly_type == "WEAPON").count()
        fire_count = db.query(Alert).filter(Alert.user_id == user_id, Alert.anomaly_type == "FIRE").count()
        
        # Calculate confidences from processed videos
        processed_videos = db.query(Camera).filter(Camera.user_id == user_id, Camera.status == 'completed').all()
        avg_conf = sum([c.avg_confidence for c in processed_videos if c.avg_confidence]) / max(1, len(processed_videos))
        max_conf = max([c.max_confidence for c in processed_videos if c.max_confidence], default=0.0)
        min_conf = min([c.min_confidence for c in processed_videos if c.min_confidence], default=0.0)

        # Aggregate object counts
        total_objects = {}
        for video in processed_videos:
            for obj, cnt in (video.object_counts or {}).items():
                total_objects[obj] = total_objects.get(obj, 0) + cnt
                
        most_frequent = max(total_objects, key=total_objects.get) if total_objects else "None"

        # Save to DB
        db_analytics = Analytics(
            user_id=user_id,
            total_alerts=total_alerts,
            total_detections=sum(total_objects.values()),
            fall_count=fall_count,
            fight_count=fight_count,
            weapon_count=weapon_count,
            loitering_count=0,
            object_counts=total_objects,
            generated_at=datetime.utcnow()
        )
        db.add(db_analytics)
        db.commit()

        return {
            "total_uploaded": total_cameras,
            "total_processed": processed_cameras,
            "total_alerts": total_alerts,
            "avg_confidence": avg_conf,
            "max_confidence": max_conf,
            "min_confidence": min_conf,
            "most_frequent_object": most_frequent,
            "object_counts": total_objects,
            "fall_count": fall_count,
            "fight_count": fight_count,
            "weapon_count": weapon_count,
            "fire_count": fire_count
        }

    @staticmethod
    def get_trend_counts(db: Session, user_id: int):
        now = datetime.utcnow()
        trend_data = {}
        # Get the last 7 days of alert counts
        for i in range(6, -1, -1):
            target_date = now - timedelta(days=i)
            start_dt = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_dt = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
            
            day_name = target_date.strftime("%a") # e.g. Mon, Tue
            count = db.query(Alert).filter(
                Alert.user_id == user_id, 
                Alert.created_at >= start_dt,
                Alert.created_at <= end_dt
            ).count()
            
            # If multiple days have the same name (not possible in 7 days but just in case), append
            if day_name in trend_data:
                day_name = f"{day_name} {i}"
            trend_data[day_name] = count
            
        return trend_data
