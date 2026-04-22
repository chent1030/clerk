import uuid

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models.department import Department
from app.admin.models.user import User


async def create_department(db: AsyncSession, name: str, parent_id: uuid.UUID | None) -> Department:
    dept = Department(name=name, parent_id=parent_id)
    db.add(dept)
    await db.flush()
    return dept


async def get_all_departments(db: AsyncSession) -> list[Department]:
    result = await db.execute(select(Department).order_by(Department.name))
    return list(result.scalars().all())


def build_department_tree(departments: list[Department]) -> list[dict]:
    dept_map = {}
    for dept in departments:
        dept_map[str(dept.id)] = {
            "id": str(dept.id),
            "name": dept.name,
            "parent_id": str(dept.parent_id) if dept.parent_id else None,
            "created_at": dept.created_at.isoformat() if dept.created_at else None,
            "children": [],
            "member_count": 0,
        }
    tree = []
    for dept in departments:
        node = dept_map[str(dept.id)]
        if dept.parent_id and str(dept.parent_id) in dept_map:
            dept_map[str(dept.parent_id)]["children"].append(node)
        else:
            tree.append(node)
    return tree


async def get_department(db: AsyncSession, dept_id: uuid.UUID) -> Department:
    result = await db.execute(select(Department).where(Department.id == dept_id))
    dept = result.scalar_one_or_none()
    if dept is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Department not found")
    return dept


async def update_department(
    db: AsyncSession, dept: Department, name: str | None, parent_id: uuid.UUID | None
) -> Department:
    if name is not None:
        dept.name = name
    if parent_id is not None:
        if parent_id == dept.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="Department cannot be its own parent"
            )
        dept.parent_id = parent_id
    db.add(dept)
    await db.flush()
    return dept


async def delete_department(db: AsyncSession, dept_id: uuid.UUID) -> None:
    children_result = await db.execute(select(Department).where(Department.parent_id == dept_id))
    if children_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department has child departments")
    users_result = await db.execute(select(User).where(User.department_id == dept_id))
    if users_result.scalars().first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Department has users")
    dept = await get_department(db, dept_id)
    await db.delete(dept)
    await db.flush()
