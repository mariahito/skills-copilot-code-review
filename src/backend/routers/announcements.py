"""Announcement endpoints for the High School Management System API."""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field, root_validator

from ..database import announcements_collection, teachers_collection

router = APIRouter(
    prefix="/announcements",
    tags=["announcements"]
)


class AnnouncementPayload(BaseModel):
    """Payload used for announcement creation and updates."""

    message: str = Field(..., min_length=5, max_length=320)
    expires_at: datetime
    start_date: Optional[datetime] = None

    @root_validator
    def validate_dates(cls, values):
        start_date = values.get("start_date")
        expires_at = values.get("expires_at")

        if not expires_at:
            raise ValueError("Expiration date is required")

        if start_date and expires_at <= start_date:
            raise ValueError("Expiration date must be after start date")

        return values


def _validate_teacher_session(teacher_username: Optional[str]) -> Dict[str, Any]:
    if not teacher_username:
        raise HTTPException(status_code=401, detail="Authentication required for this action")

    teacher = teachers_collection.find_one({"_id": teacher_username})
    if not teacher:
        raise HTTPException(status_code=401, detail="Invalid teacher credentials")

    return teacher


def _to_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None

    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)

    return value.astimezone(timezone.utc)


def _serialize_announcement(announcement: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": announcement["_id"],
        "message": announcement["message"],
        "start_date": announcement.get("start_date"),
        "expires_at": announcement["expires_at"],
        "created_at": announcement.get("created_at"),
        "updated_at": announcement.get("updated_at"),
        "created_by": announcement.get("created_by"),
    }


@router.get("", response_model=List[Dict[str, Any]])
@router.get("/", response_model=List[Dict[str, Any]])
def get_announcements(
    include_all: bool = False,
    teacher_username: Optional[str] = Query(None)
) -> List[Dict[str, Any]]:
    """Get active announcements for public view, or all announcements for authenticated users."""
    now = datetime.now(timezone.utc)

    if include_all:
        _validate_teacher_session(teacher_username)
        query = {}
    else:
        query = {
            "expires_at": {"$gte": now},
            "$or": [
                {"start_date": {"$exists": False}},
                {"start_date": None},
                {"start_date": {"$lte": now}}
            ]
        }

    announcements = announcements_collection.find(query).sort(
        [("expires_at", 1), ("created_at", -1)]
    )

    return [_serialize_announcement(announcement) for announcement in announcements]


@router.post("", response_model=Dict[str, Any])
@router.post("/", response_model=Dict[str, Any])
def create_announcement(
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Create a new announcement. Requires authentication."""
    teacher = _validate_teacher_session(teacher_username)
    now = datetime.now(timezone.utc)

    expires_at = _to_utc(payload.expires_at)
    if expires_at <= now:
        raise HTTPException(status_code=400, detail="Expiration date must be in the future")

    announcement_id = f"announcement-{uuid4().hex[:12]}"
    announcement = {
        "_id": announcement_id,
        "message": payload.message.strip(),
        "start_date": _to_utc(payload.start_date),
        "expires_at": expires_at,
        "created_at": now,
        "updated_at": now,
        "created_by": teacher["username"]
    }

    announcements_collection.insert_one(announcement)

    return _serialize_announcement(announcement)


@router.put("/{announcement_id}", response_model=Dict[str, Any])
def update_announcement(
    announcement_id: str,
    payload: AnnouncementPayload,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, Any]:
    """Update an existing announcement. Requires authentication."""
    _validate_teacher_session(teacher_username)
    now = datetime.now(timezone.utc)

    expires_at = _to_utc(payload.expires_at)
    if expires_at <= now:
        raise HTTPException(status_code=400, detail="Expiration date must be in the future")

    update_data = {
        "message": payload.message.strip(),
        "start_date": _to_utc(payload.start_date),
        "expires_at": expires_at,
        "updated_at": now
    }

    result = announcements_collection.update_one(
        {"_id": announcement_id},
        {"$set": update_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    announcement = announcements_collection.find_one({"_id": announcement_id})
    return _serialize_announcement(announcement)


@router.delete("/{announcement_id}", response_model=Dict[str, str])
def delete_announcement(
    announcement_id: str,
    teacher_username: Optional[str] = Query(None)
) -> Dict[str, str]:
    """Delete an existing announcement. Requires authentication."""
    _validate_teacher_session(teacher_username)

    result = announcements_collection.delete_one({"_id": announcement_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Announcement not found")

    return {"message": "Announcement deleted successfully"}
