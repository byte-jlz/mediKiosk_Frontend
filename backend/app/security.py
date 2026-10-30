"""
security.py - staff login: bcrypt passwords + JWT tokens + role checks.

Two roles (from the use-case diagrams, Figures 3.4 and 3.5):
    clinic_staff  - patient queue, vital signs, priority alerts, live dashboard
    super_admin   - staff accounts, patient records, kiosks, kiosk activity,
                    reports, audit trail

How it works
------------
1. POST /api/staff/login checks the password against the bcrypt hash and
   returns a JWT (signed with JWT_SECRET, valid for JWT_HOURS).
2. The admin console sends it on every request:  Authorization: Bearer <token>
3. Routes declare who may call them:
       @router.get("/x", dependencies=[Depends(require_roles(SUPER_ADMIN))])
   or take the signed-in account as a parameter:
       async def x(me: dict = Depends(current_staff)): ...
   The role is read from the account on EVERY request (not trusted from the
   token), so a suspended or deleted account is locked out immediately.

JWT_SECRET: set it in the environment on the Pi/server. If it isn't set, a
random secret is made at startup - fine for testing, but everyone has to log
in again after every backend restart.
"""

import os
import secrets
import time
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

SUPER_ADMIN = "super_admin"
CLINIC_STAFF = "clinic_staff"
ROLES = (SUPER_ADMIN, CLINIC_STAFF)
ROLE_LABELS = {SUPER_ADMIN: "Super Admin", CLINIC_STAFF: "Clinic Staff"}

JWT_ALGORITHM = "HS256"
JWT_HOURS = float(os.getenv("JWT_HOURS", "8"))       # one clinic shift
JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_urlsafe(48)
if not os.getenv("JWT_SECRET"):
    print("[security] JWT_SECRET not set - using a random one (logins reset on restart)")

_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------- passwords
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt(12)).decode("ascii")


def verify_password(password: str, password_hash: Optional[str]) -> bool:
    if not password or not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("ascii"))
    except ValueError:              # malformed hash
        return False


# ---------------------------------------------------------------- tokens
def create_token(account: dict) -> str:
    now = int(time.time())
    payload = {
        "sub": account["id"],
        "role": account["accessRole"],
        "iat": now,
        "exp": now + int(JWT_HOURS * 3600),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_patient_token(patient: dict) -> str:
    """Kiosk / phone sign-in token for a PATIENT (role "patient" - rejected by
    every staff route). Patient-only routes come with the phone app step."""
    now = int(time.time())
    return jwt.encode({"sub": patient["id"], "role": "patient", "iat": now,
                       "exp": now + int(JWT_HOURS * 3600)}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _unauthorized(detail: str):
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail,
                         headers={"WWW-Authenticate": "Bearer"})


def current_staff(creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> dict:
    """The signed-in staff account (raises 401 if not signed in)."""
    if creds is None or creds.scheme.lower() != "bearer":
        raise _unauthorized("Not signed in")
    return account_from_token(creds.credentials)


def account_from_token(token: str) -> dict:
    """JWT -> staff account. Raises 401/403 HTTPException. (Also used by the
    live WebSocket, where the browser sends the token as ?token=...)"""
    from app.data import find_staff          # late import: data.py imports nothing from here

    if not token:
        raise _unauthorized("Not signed in")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired - please sign in again")
    except jwt.InvalidTokenError:
        raise _unauthorized("Invalid session - please sign in again")
    if payload.get("role") not in ROLES:      # e.g. a patient token: never opens staff routes
        raise _unauthorized("Not a staff session")
    account = find_staff(payload.get("sub", ""))
    if account is None:
        raise _unauthorized("Account no longer exists")
    if account.get("status") == "Suspended":
        raise HTTPException(status_code=403, detail="This account is suspended")
    return account


def current_patient(creds: Optional[HTTPAuthorizationCredentials] = Depends(_bearer)) -> dict:
    """The signed-in PATIENT (phone app). Staff tokens are rejected here, and
    patient tokens are rejected by every staff route (account_from_token)."""
    from app.data import find_patient        # late import, same reason as above

    if creds is None or creds.scheme.lower() != "bearer":
        raise _unauthorized("Not signed in")
    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _unauthorized("Session expired - please sign in again")
    except jwt.InvalidTokenError:
        raise _unauthorized("Invalid session - please sign in again")
    if payload.get("role") != "patient":
        raise _unauthorized("Not a patient session")
    patient = find_patient(payload.get("sub", ""))
    if patient is None:
        raise _unauthorized("Account no longer exists")
    if patient.get("status") == "archived":
        raise HTTPException(status_code=403, detail="This patient record is archived - please ask the clinic staff")
    return patient


def require_roles(*roles: str):
    """Dependency: only these roles may call the route (403 for the others)."""
    def check(account: dict = Depends(current_staff)) -> dict:
        if account.get("accessRole") not in roles:
            raise HTTPException(status_code=403,
                                detail="Your account role can't open this page")
        return account
    return check


def public_account(account: dict) -> dict:
    """An account without its password hash (safe to send to the browser)."""
    out = {k: v for k, v in account.items() if k != "passwordHash"}
    out["accessRoleLabel"] = ROLE_LABELS.get(account.get("accessRole"), "")
    return out
