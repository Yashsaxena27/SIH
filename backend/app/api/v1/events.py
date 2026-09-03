from fastapi import APIRouter, Request
from sse_starlette.sse import EventSourceResponse
import asyncio
import json
import logging

router = APIRouter(prefix="/api/v1/events", tags=["Events"])
logger = logging.getLogger(__name__)

# Very simple global broadcaster
# In production, use Redis pub/sub
clients = set()

def broadcast_event(event_type: str, data: dict):
    message = json.dumps({"type": event_type, "data": data})
    logger.info(f"Broadcasting event: {event_type} to {len(clients)} clients")
    for client_queue in list(clients):
        try:
            client_queue.put_nowait(message)
        except asyncio.QueueFull:
            pass

@router.get("/stream")
async def message_stream(request: Request):
    client_queue = asyncio.Queue(maxsize=100)
    clients.add(client_queue)
    
    async def event_generator():
        try:
            while True:
                # Disconnect if client leaves
                if await request.is_disconnected():
                    break
                
                # Wait for a message with a timeout to send keepalives
                try:
                    message = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    yield {"data": message}
                except asyncio.TimeoutError:
                    yield {"event": "keepalive", "data": "ping"}
        finally:
            clients.remove(client_queue)
            
    return EventSourceResponse(event_generator())
