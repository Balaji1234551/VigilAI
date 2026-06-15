from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import StreamingResponse
from app.services.video_service import video_streaming_service
import urllib.parse

router = APIRouter()

@router.get("/stream")
async def video_stream(url: str = Query(..., description="RTSP or HTTP camera URL to stream")):
    """
    Stream video from a camera URL. The video is processed in real-time
    by YOLOv8 to detect objects and add bounding boxes.
    """
    try:
        # Decode the URL in case it contains special characters
        decoded_url = urllib.parse.unquote(url)
        
        # Get the generator function from our service
        generator = video_streaming_service.get_video_generator(decoded_url)
        
        # Return as a multipart streaming response
        return StreamingResponse(
            generator,
            media_type="multipart/x-mixed-replace; boundary=frame"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
