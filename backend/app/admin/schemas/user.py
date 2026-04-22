import uuid

from pydantic import BaseModel, Field

from app.admin.models.user import UserRole, UserStatus


class UserCreate(BaseModel):
    username: str = Field(..., min_length=2, max_length=50)
    password: str = Field(..., min_length=6)
    display_name: str = Field(..., min_length=1, max_length=100)
    email: str = Field(default="", max_length=255)
    department_id: uuid.UUID | None = None
    role: UserRole = UserRole.USER


class UserUpdate(BaseModel):
    display_name: str | None = Field(default=None, max_length=100)
    email: str | None = Field(default=None, max_length=255)
    department_id: uuid.UUID | None = None
    role: UserRole | None = None


class UserStatusUpdate(BaseModel):
    status: UserStatus


class UserResponse(BaseModel):
    id: str
    username: str
    display_name: str
    email: str
    role: str
    department_id: str | None
    status: str
    created_at: str | None = None

    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    users: list[UserResponse]
    total: int
    page: int
    page_size: int
