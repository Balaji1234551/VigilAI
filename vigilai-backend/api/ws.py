import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List
import logging

logger = logging.getLogger("VigilAI.WebSocket")

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.loop = None

    def set_loop(self, loop):
        self.loop = loop

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("New WebSocket client connected.")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected.")

    async def broadcast(self, message: str):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"WebSocket broadcast error: {e}")
                self.disconnect(connection)

    def broadcast_sync(self, message: str):
        """Thread-safe synchronous broadcast to be called from background threads."""
        if self.loop is None or self.loop.is_closed():
            logger.warning("No valid event loop available for WebSocket broadcast.")
            return
        asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)

# Global manager instance
manager = ConnectionManager()

@router.websocket("/alerts")
async def websocket_alerts_endpoint(websocket: WebSocket):
    if manager.loop is None:
        manager.set_loop(asyncio.get_running_loop())
    await manager.connect(websocket)
    try:
        while True:
            # We don't expect the client to send anything, but we keep the connection open
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
