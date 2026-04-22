import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.admin.auth.jwt import decode_token
from app.admin.models.user import UserRole
from deerflow.config import get_app_config

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
):
    config = get_app_config().admin.jwt
    try:
        payload = decode_token(token, config.secret_key)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    return _UserHolder(user_id=user_id, role=payload.get("role"), department_id=payload.get("department_id"))


class _UserHolder:
    def __init__(self, user_id: str, role: str | None, department_id: str | None):
        self.id = uuid.UUID(user_id)
        self.role = UserRole(role) if role else UserRole.USER
        self.department_id = uuid.UUID(department_id) if department_id else None
