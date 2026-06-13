import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.repositories.dependency import _memory_user_repo, _memory_family_repo, _memory_car_repo, _memory_booking_repo

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_repos():
    # Clear memory repositories before each test to guarantee isolation
    from app.repositories.memory import USERS_DB, FAMILIES_DB, CARS_DB, BOOKINGS_DB, USER_ALLOWED_CARS
    USERS_DB.clear()
    FAMILIES_DB.clear()
    CARS_DB.clear()
    BOOKINGS_DB.clear()
    USER_ALLOWED_CARS.clear()


def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert "message" in response.json()


def test_auth_register_and_login():
    # 1. Register a manager (creates a new family)
    reg_data = {
        "name": "Manager Bob",
        "email": "bob@example.com",
        "password": "securepassword123",
        "family_name": "Bob's Family"
    }
    response = client.post("/api/auth/register", json=reg_data)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    token = token_data["access_token"]

    # Get user profile
    headers = {"Authorization": f"Bearer {token}"}
    profile_resp = client.get("/api/auth/me", headers=headers)
    assert profile_resp.status_code == 200
    user = profile_resp.json()
    assert user["name"] == "Manager Bob"
    assert user["role"] == "manager"
    assert "family_id" in user

    # 2. Register a member (joins Bob's family)
    # First, get family details to obtain invite code
    family_resp = client.get("/api/family/info", headers=headers)
    assert family_resp.status_code == 200
    invite_code = family_resp.json()["invite_code"]

    reg_member_data = {
        "name": "Member Alice",
        "email": "alice@example.com",
        "password": "memberpassword123",
        "invite_code": invite_code
    }
    response2 = client.post("/api/auth/register", json=reg_member_data)
    assert response2.status_code == 200
    assert "access_token" in response2.json()

    # 3. Test login
    login_data = {
        "email": "bob@example.com",
        "password": "securepassword123"
    }
    login_resp = client.post("/api/auth/login", json=login_data)
    assert login_resp.status_code == 200
    assert "access_token" in login_resp.json()


def test_car_and_permissions_management():
    # 1. Register Manager
    reg_data = {
        "name": "Manager Bob",
        "email": "bob@example.com",
        "password": "password",
        "family_name": "Bob Family"
    }
    resp = client.post("/api/auth/register", json=reg_data)
    token = resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Add a car (Manager only)
    car_data = {
        "name": "Tesla Model Y",
        "license_plate": "TSLA-2026",
        "photo_url": "https://example.com/tesla.jpg",
        "priority": 5
    }
    car_resp = client.post("/api/cars/", json=car_data, headers=headers)
    assert car_resp.status_code == 201
    car = car_resp.json()
    assert car["name"] == "Tesla Model Y"
    assert car["priority"] == 5

    # 3. Add family member
    family_info = client.get("/api/family/info", headers=headers).json()
    invite_code = family_info["invite_code"]

    mem_resp = client.post("/api/auth/register", json={
        "name": "Member Alice",
        "email": "alice@example.com",
        "password": "password",
        "invite_code": invite_code
    })
    member_token = mem_resp.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # 4. Member profile should have empty allowed cars by default
    member_profile = client.get("/api/auth/me", headers=member_headers).json()
    assert len(member_profile["allowed_car_ids"]) == 0

    # 5. Manager grants permission to drive the Tesla
    members = client.get("/api/family/members", headers=headers).json()
    alice_id = next(m["id"] for m in members if m["email"] == "alice@example.com")

    permission_resp = client.put(
        f"/api/family/members/{alice_id}/permissions",
        json={"allowed_car_ids": [car["id"]]},
        headers=headers
    )
    assert permission_resp.status_code == 200
    assert car["id"] in permission_resp.json()["allowed_car_ids"]

    # 6. Verify Member now gets the Tesla in their available list
    avail_resp = client.get("/api/cars/available", headers=member_headers)
    assert avail_resp.status_code == 200
    assert len(avail_resp.json()) == 1
    assert avail_resp.json()[0]["name"] == "Tesla Model Y"


def test_bookings_and_conflict_resolution():
    # 1. Register Manager and add car
    reg_data = {
        "name": "Manager Bob",
        "email": "bob@example.com",
        "password": "password",
        "family_name": "Bob Family"
    }
    token = client.post("/api/auth/register", json=reg_data).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    car = client.post("/api/cars/", json={
        "name": "Family Sedan",
        "license_plate": "PLATE-1",
        "photo_url": "url",
        "priority": 3
    }, headers=headers).json()

    # 2. Book car from 10:00 to 12:00
    booking_data = {
        "car_id": car["id"],
        "start_time": "2026-06-15T10:00:00Z",
        "end_time": "2026-06-15T12:00:00Z",
        "purpose": "Morning errand"
    }
    booking_resp = client.post("/api/bookings/", json=booking_data, headers=headers)
    assert booking_resp.status_code == 201
    booking = booking_resp.json()
    assert booking["status"] in ["scheduled", "active"]

    # 3. Try to book same car from 11:30 to 13:00 (overlapping start)
    overlap_data_1 = {
        "car_id": car["id"],
        "start_time": "2026-06-15T11:30:00Z",
        "end_time": "2026-06-15T13:00:00Z",
        "purpose": "Lunch"
    }
    overlap_resp_1 = client.post("/api/bookings/", json=overlap_data_1, headers=headers)
    assert overlap_resp_1.status_code == 400
    assert "already booked" in overlap_resp_1.json()["detail"]

    # 4. Try to book same car from 09:00 to 10:30 (overlapping end)
    overlap_data_2 = {
        "car_id": car["id"],
        "start_time": "2026-06-15T09:00:00Z",
        "end_time": "2026-06-15T10:30:00Z",
        "purpose": "Gym"
    }
    overlap_resp_2 = client.post("/api/bookings/", json=overlap_data_2, headers=headers)
    assert overlap_resp_2.status_code == 400

    # 5. Book car in non-overlapping slot (12:30 to 14:00)
    ok_data = {
        "car_id": car["id"],
        "start_time": "2026-06-15T12:30:00Z",
        "end_time": "2026-06-15T14:00:00Z",
        "purpose": "Afternoon shopping"
    }
    ok_resp = client.post("/api/bookings/", json=ok_data, headers=headers)
    assert ok_resp.status_code == 201
