import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.models.skill import Skill, SkillStatus, SkillVisibleUser, SkillVisibility
from app.admin.models.user import UserRole


async def upload_skill(
    db: AsyncSession,
    name: str,
    description: str,
    version: str,
    author_id: uuid.UUID,
    department_id: uuid.UUID | None,
    minio_bucket: str,
    minio_object_key: str,
    file_size: int,
) -> Skill:
    existing = await db.execute(select(Skill).where(Skill.name == name))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Skill name already exists")
    skill = Skill(
        name=name,
        description=description,
        version=version,
        author_id=author_id,
        department_id=department_id,
        visibility=SkillVisibility.PRIVATE,
        status=SkillStatus.PENDING_REVIEW,
        minio_bucket=minio_bucket,
        minio_object_key=minio_object_key,
        file_size=file_size,
    )
    db.add(skill)
    await db.flush()
    return skill


async def list_skills(
    db: AsyncSession,
    page: int,
    page_size: int,
    status_filter: SkillStatus | None = None,
    department_id: uuid.UUID | None = None,
    user_id: uuid.UUID | None = None,
    role: UserRole = UserRole.USER,
) -> tuple[list[Skill], int]:
    query = select(Skill)
    count_query = select(func.count()).select_from(Skill)
    if role == UserRole.SUPER_ADMIN:
        pass
    elif role == UserRole.DEPT_ADMIN:
        condition = or_(Skill.department_id == department_id, Skill.author_id == user_id)
        query = query.where(condition)
        count_query = count_query.where(condition)
    else:
        query = query.where(Skill.author_id == user_id)
        count_query = count_query.where(Skill.author_id == user_id)
    if status_filter:
        query = query.where(Skill.status == status_filter)
        count_query = count_query.where(Skill.status == status_filter)
    if department_id and role == UserRole.SUPER_ADMIN:
        query = query.where(Skill.department_id == department_id)
        count_query = count_query.where(Skill.department_id == department_id)
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    offset = (page - 1) * page_size
    query = query.order_by(Skill.created_at.desc()).offset(offset).limit(page_size)
    result = await db.execute(query)
    skills = list(result.scalars().all())
    return skills, total


async def get_skill(db: AsyncSession, skill_id: uuid.UUID) -> Skill:
    result = await db.execute(select(Skill).where(Skill.id == skill_id))
    skill = result.scalar_one_or_none()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


async def check_skill_visibility(
    db: AsyncSession,
    skill: Skill,
    user_id: uuid.UUID,
    role: UserRole,
    department_id: uuid.UUID | None,
) -> None:
    if role == UserRole.SUPER_ADMIN:
        return
    if skill.author_id == user_id:
        return
    if skill.visibility == SkillVisibility.COMPANY:
        return
    if skill.visibility == SkillVisibility.DEPARTMENT and skill.department_id == department_id:
        return
    if skill.visibility == SkillVisibility.SPECIFIC_USERS:
        result = await db.execute(
            select(SkillVisibleUser).where(
                SkillVisibleUser.skill_id == skill.id,
                SkillVisibleUser.user_id == user_id,
            )
        )
        if result.scalar_one_or_none():
            return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this skill")


async def update_skill(
    db: AsyncSession,
    skill: Skill,
    name: str | None,
    description: str | None,
    version: str | None,
) -> Skill:
    if name is not None:
        skill.name = name
    if description is not None:
        skill.description = description
    if version is not None:
        skill.version = version
    db.add(skill)
    await db.flush()
    return skill


async def set_visibility(
    db: AsyncSession,
    skill: Skill,
    visibility: SkillVisibility,
    visible_user_ids: list[uuid.UUID],
) -> Skill:
    skill.visibility = visibility
    await db.execute(
        SkillVisibleUser.__table__.delete().where(SkillVisibleUser.skill_id == skill.id)
    )
    if visibility == SkillVisibility.SPECIFIC_USERS and visible_user_ids:
        for uid in visible_user_ids:
            db.add(SkillVisibleUser(skill_id=skill.id, user_id=uid))
    db.add(skill)
    await db.flush()
    return skill


async def submit_for_review(db: AsyncSession, skill: Skill) -> Skill:
    if skill.status not in (SkillStatus.WITHDRAWN, SkillStatus.PENDING_REVIEW):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill must be withdrawn to resubmit")
    skill.status = SkillStatus.PENDING_REVIEW
    db.add(skill)
    await db.flush()
    return skill


async def withdraw_skill(db: AsyncSession, skill: Skill) -> Skill:
    if skill.status != SkillStatus.PENDING_REVIEW:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only pending review skills can be withdrawn")
    skill.status = SkillStatus.WITHDRAWN
    db.add(skill)
    await db.flush()
    return skill


async def review_skill(
    db: AsyncSession,
    skill: Skill,
    reviewer_id: uuid.UUID,
    action: str,
    comment: str,
) -> Skill:
    if skill.status != SkillStatus.PENDING_REVIEW:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Skill is not pending review")
    if action == "approve":
        skill.status = SkillStatus.APPROVED
    elif action == "reject":
        skill.status = SkillStatus.REJECTED
    skill.reviewed_by = reviewer_id
    skill.reviewed_at = datetime.now(timezone.utc)
    skill.review_comment = comment
    db.add(skill)
    await db.flush()
    return skill


async def delete_skill(db: AsyncSession, skill_id: uuid.UUID) -> Skill:
    skill = await get_skill(db, skill_id)
    await db.execute(
        SkillVisibleUser.__table__.delete().where(SkillVisibleUser.skill_id == skill.id)
    )
    await db.delete(skill)
    await db.flush()
    return skill


async def get_visible_user_ids(db: AsyncSession, skill_id: uuid.UUID) -> list[str]:
    result = await db.execute(select(SkillVisibleUser.user_id).where(SkillVisibleUser.skill_id == skill_id))
    return [str(row[0]) for row in result.all()]
