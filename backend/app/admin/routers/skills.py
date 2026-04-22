import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.deps import get_db, get_current_user, require_role
from app.admin.models.skill import SkillStatus, SkillVisibility
from app.admin.models.user import User, UserRole
from app.admin.schemas.skill import SkillUpdate, SkillVisibilityUpdate, SkillReviewRequest, SkillResponse, SkillListResponse
from app.admin.services import skill_service
from app.admin.minio import MinioClient
from deerflow.config import get_app_config

router = APIRouter(prefix="/api/admin/skills", tags=["admin-skills"])


def _get_minio_client() -> MinioClient:
    from app.gateway.app import get_app
    app = get_app()
    return app.state.minio_client


def _skill_to_response(skill, author_name=None, department_name=None, visible_user_ids=None) -> SkillResponse:
    return SkillResponse(
        id=str(skill.id),
        name=skill.name,
        description=skill.description,
        version=skill.version,
        author_id=str(skill.author_id),
        department_id=str(skill.department_id) if skill.department_id else None,
        visibility=skill.visibility.value,
        status=skill.status.value,
        file_size=skill.file_size,
        reviewed_by=str(skill.reviewed_by) if skill.reviewed_by else None,
        reviewed_at=skill.reviewed_at.isoformat() if skill.reviewed_at else None,
        review_comment=skill.review_comment,
        created_at=skill.created_at.isoformat() if skill.created_at else None,
        author_name=author_name,
        department_name=department_name,
        visible_user_ids=visible_user_ids or [],
    )


@router.get("", response_model=SkillListResponse)
async def list_skills(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: SkillStatus | None = Query(default=None, alias="status"),
    department_id: uuid.UUID | None = Query(default=None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skills, total = await skill_service.list_skills(db, page, page_size, status_filter, department_id, user.id, user.role)
    items = []
    for s in skills:
        visible_ids = await skill_service.get_visible_user_ids(db, s.id)
        items.append(_skill_to_response(s, visible_user_ids=visible_ids))
    return SkillListResponse(skills=items, total=total, page=page, page_size=page_size)


@router.post("", response_model=SkillResponse)
async def upload_skill(
    name: str = Form(...),
    version: str = Form(default="1.0.0"),
    description: str = Form(default=""),
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    minio_client = _get_minio_client()
    file_data = await file.read()
    skill_id = uuid.uuid4()
    object_key = minio_client.build_skill_key(user.department_id, skill_id, file.filename or "upload")
    minio_client.upload(object_key, file_data)
    skill = await skill_service.upload_skill(
        db, name, description, version, user.id, user.department_id,
        minio_client.bucket, object_key, len(file_data),
    )
    return _skill_to_response(skill)


@router.get("/{skill_id}", response_model=SkillResponse)
async def get_skill(
    skill_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    await skill_service.check_skill_visibility(db, skill, user.id, user.role, user.department_id)
    visible_ids = await skill_service.get_visible_user_ids(db, skill.id)
    return _skill_to_response(skill, visible_user_ids=visible_ids)


@router.get("/{skill_id}/download")
async def download_skill(
    skill_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    await skill_service.check_skill_visibility(db, skill, user.id, user.role, user.department_id)
    minio_client = _get_minio_client()
    url = minio_client.get_presigned_url(skill.minio_object_key)
    return {"download_url": url}


@router.put("/{skill_id}", response_model=SkillResponse)
async def update_skill(
    skill_id: uuid.UUID,
    req: SkillUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    if skill.author_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or super admin can edit")
    updated = await skill_service.update_skill(db, skill, req.name, req.description, req.version)
    return _skill_to_response(updated)


@router.put("/{skill_id}/visibility", response_model=SkillResponse)
async def set_visibility(
    skill_id: uuid.UUID,
    req: SkillVisibilityUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    if skill.author_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can set visibility")
    if skill.status != SkillStatus.APPROVED:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Visibility can only be set on approved skills")
    updated = await skill_service.set_visibility(db, skill, req.visibility, req.visible_user_ids)
    visible_ids = await skill_service.get_visible_user_ids(db, updated.id)
    return _skill_to_response(updated, visible_user_ids=visible_ids)


@router.post("/{skill_id}/submit", response_model=SkillResponse)
async def submit_for_review(
    skill_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    if skill.author_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can submit")
    updated = await skill_service.submit_for_review(db, skill)
    return _skill_to_response(updated)


@router.post("/{skill_id}/withdraw", response_model=SkillResponse)
async def withdraw_skill(
    skill_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    if skill.author_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can withdraw")
    updated = await skill_service.withdraw_skill(db, skill)
    return _skill_to_response(updated)


@router.post("/{skill_id}/review", response_model=SkillResponse)
async def review_skill(
    skill_id: uuid.UUID,
    req: SkillReviewRequest,
    user: User = Depends(require_role(UserRole.SUPER_ADMIN)),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    updated = await skill_service.review_skill(db, skill, user.id, req.action, req.comment)
    return _skill_to_response(updated)


@router.delete("/{skill_id}")
async def delete_skill(
    skill_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    skill = await skill_service.get_skill(db, skill_id)
    if skill.author_id != user.id and user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author or super admin can delete")
    deleted = await skill_service.delete_skill(db, skill_id)
    try:
        minio_client = _get_minio_client()
        minio_client.delete(deleted.minio_object_key)
    except Exception:
        pass
    return {"message": "Skill deleted"}
