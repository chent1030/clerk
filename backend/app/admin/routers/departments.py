import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.deps import get_current_user, get_db, require_role
from app.admin.models.user import User, UserRole
from app.admin.schemas.department import (
    DepartmentCreate,
    DepartmentResponse,
    DepartmentTreeResponse,
    DepartmentUpdate,
)
from app.admin.services import department_service

router = APIRouter(prefix="/api/admin/departments", tags=["admin-departments"])


@router.get("", response_model=DepartmentTreeResponse)
async def list_departments(
    user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    departments = await department_service.get_all_departments(db)
    tree = department_service.build_department_tree(departments)
    return DepartmentTreeResponse(departments=tree)


@router.post("", response_model=DepartmentResponse)
async def create_department(
    req: DepartmentCreate,
    user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    dept = await department_service.create_department(db, req.name, req.parent_id)
    return DepartmentResponse(
        id=str(dept.id),
        name=dept.name,
        parent_id=str(dept.parent_id) if dept.parent_id else None,
        created_at=dept.created_at.isoformat() if dept.created_at else None,
    )


@router.get("/{dept_id}", response_model=DepartmentResponse)
async def get_department(
    dept_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.SUPER_ADMIN, UserRole.DEPT_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    if user.role == UserRole.DEPT_ADMIN and user.department_id != dept_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot access other department")
    dept = await department_service.get_department(db, dept_id)
    return DepartmentResponse(
        id=str(dept.id),
        name=dept.name,
        parent_id=str(dept.parent_id) if dept.parent_id else None,
        created_at=dept.created_at.isoformat() if dept.created_at else None,
    )


@router.put("/{dept_id}", response_model=DepartmentResponse)
async def update_department(
    dept_id: uuid.UUID,
    req: DepartmentUpdate,
    user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    dept = await department_service.get_department(db, dept_id)
    updated = await department_service.update_department(db, dept, req.name, req.parent_id)
    return DepartmentResponse(
        id=str(updated.id),
        name=updated.name,
        parent_id=str(updated.parent_id) if updated.parent_id else None,
        created_at=updated.created_at.isoformat() if updated.created_at else None,
    )


@router.delete("/{dept_id}")
async def delete_department(
    dept_id: uuid.UUID,
    user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    await department_service.delete_department(db, dept_id)
    return {"message": "Department deleted"}
