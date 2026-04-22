import uuid

import pytest


@pytest.mark.asyncio
async def test_list_users_as_super_admin(client, auth_headers, seed_data):
    resp = await client.get("/api/admin/users", headers=auth_headers["super_admin"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 3
    assert len(data["users"]) == 3


@pytest.mark.asyncio
async def test_list_users_as_dept_admin(client, auth_headers):
    resp = await client.get("/api/admin/users", headers=auth_headers["dept_admin"])
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 1


@pytest.mark.asyncio
async def test_list_users_as_regular_user(client, auth_headers):
    resp = await client.get("/api/admin/users", headers=auth_headers["regular_user"])
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_list_users_with_search(client, auth_headers):
    resp = await client.get("/api/admin/users", headers=auth_headers["super_admin"], params={"search": "super"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 1
    assert data["users"][0]["username"] == "superadmin"


@pytest.mark.asyncio
async def test_create_user_as_super_admin(client, auth_headers, seed_data):
    resp = await client.post("/api/admin/users", headers=auth_headers["super_admin"], json={
        "username": "newuser",
        "password": "newpass123",
        "display_name": "New User",
        "email": "new@example.com",
        "department_id": str(seed_data["department"].id),
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "newuser"
    assert data["role"] == "user"


@pytest.mark.asyncio
async def test_create_user_with_role(client, auth_headers, seed_data):
    resp = await client.post("/api/admin/users", headers=auth_headers["super_admin"], json={
        "username": "newdeptadmin",
        "password": "newpass123",
        "display_name": "New Dept Admin",
        "email": "newdept@example.com",
        "department_id": str(seed_data["department"].id),
        "role": "dept_admin",
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "dept_admin"


@pytest.mark.asyncio
async def test_create_user_as_dept_admin_forced_role(client, auth_headers):
    resp = await client.post("/api/admin/users", headers=auth_headers["dept_admin"], json={
        "username": "deptuser",
        "password": "newpass123",
        "display_name": "Dept User",
        "email": "deptuser@example.com",
        "role": "super_admin",
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "user"


@pytest.mark.asyncio
async def test_create_duplicate_user(client, auth_headers):
    resp = await client.post("/api/admin/users", headers=auth_headers["super_admin"], json={
        "username": "superadmin",
        "password": "newpass123",
        "display_name": "Duplicate",
    })
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_get_user(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.get(f"/api/admin/users/{uid}", headers=auth_headers["super_admin"])
    assert resp.status_code == 200
    assert resp.json()["username"] == "regularuser"


@pytest.mark.asyncio
async def test_get_user_not_found(client, auth_headers):
    fake_id = str(uuid.uuid4())
    resp = await client.get(f"/api/admin/users/{fake_id}", headers=auth_headers["super_admin"])
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_user_dept_admin_other_department(client, auth_headers, seed_data, db_session):
    from app.admin.models.department import Department
    other_dept = Department(name="Other")
    db_session.add(other_dept)
    await db_session.flush()

    uid = seed_data["regular_user"].id
    resp = await client.get(f"/api/admin/users/{uid}", headers=auth_headers["dept_admin"])
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_update_user(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.put(f"/api/admin/users/{uid}", headers=auth_headers["super_admin"], json={
        "display_name": "Updated Name",
        "email": "updated@example.com",
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["display_name"] == "Updated Name"
    assert data["email"] == "updated@example.com"


@pytest.mark.asyncio
async def test_update_user_role(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.put(f"/api/admin/users/{uid}", headers=auth_headers["super_admin"], json={
        "role": "dept_admin",
    })
    assert resp.status_code == 200
    assert resp.json()["role"] == "dept_admin"


@pytest.mark.asyncio
async def test_toggle_user_status(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.put(f"/api/admin/users/{uid}/status", headers=auth_headers["super_admin"], json={
        "status": "disabled",
    })
    assert resp.status_code == 200
    assert resp.json()["status"] == "disabled"


@pytest.mark.asyncio
async def test_toggle_user_status_dept_admin_forbidden(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.put(f"/api/admin/users/{uid}/status", headers=auth_headers["dept_admin"], json={
        "status": "disabled",
    })
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_user(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.delete(f"/api/admin/users/{uid}", headers=auth_headers["super_admin"])
    assert resp.status_code == 200


@pytest.mark.asyncio
async def test_delete_user_dept_admin_forbidden(client, auth_headers, seed_data):
    uid = seed_data["regular_user"].id
    resp = await client.delete(f"/api/admin/users/{uid}", headers=auth_headers["dept_admin"])
    assert resp.status_code == 403


@pytest.mark.asyncio
async def test_delete_user_regular_forbidden(client, auth_headers, seed_data):
    uid = seed_data["super_admin"].id
    resp = await client.delete(f"/api/admin/users/{uid}", headers=auth_headers["regular_user"])
    assert resp.status_code == 403
