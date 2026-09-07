"""Authentication and Role-Based Access Control (RBAC) dependencies.

Provides:
- `get_current_user`: extracts and validates JWT from Authorization header.
- `require_role`: verifies user role against permitted roles.
- Safe demo-mode fallback allowing default operator credentials when explicitly enabled.
"""

from typing import List, Optional
from dataclasses import dataclass
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt.exceptions import InvalidTokenError

from app.core.config import settings
from app.models.domain import UserRole

security_scheme = HTTPBearer(auto_error=False)


@dataclass
class AuthenticatedUser:
    id: str
    username: str
    role: UserRole
    is_demo: bool = False


DEFAULT_DEMO_USER = AuthenticatedUser(
    id="usr_demo_operator",
    username="operator@potholewala.sih",
    role=UserRole.operator,
    is_demo=True
)

DEFAULT_VIEWER_USER = AuthenticatedUser(
    id="usr_demo_viewer",
    username="viewer@potholewala.sih",
    role=UserRole.viewer,
    is_demo=True
)

DEFAULT_ADMIN_USER = AuthenticatedUser(
    id="usr_demo_admin",
    username="admin@potholewala.sih",
    role=UserRole.admin,
    is_demo=True
)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)
) -> AuthenticatedUser:
    """
    Validates JWT access token.
    In DEMO_MODE, allows 'demo-operator-token', 'demo-admin-token', 'demo-viewer-token'.
    In production mode (DEMO_MODE=False), strictly enforces valid cryptographic JWT.
    Missing credentials on protected routes raises 401 Unauthorized.
    """
    if credentials:
        token = credentials.credentials
        # Check standard demo convenience tokens
        if settings.DEMO_MODE:
            if token == "demo-admin-token":
                return DEFAULT_ADMIN_USER
            if token in ("demo-operator-token", "demo-token"):
                return DEFAULT_DEMO_USER
            if token == "demo-viewer-token":
                return DEFAULT_VIEWER_USER

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub")
            role_str = payload.get("role", "operator")
            try:
                role = UserRole(role_str)
            except ValueError:
                role = UserRole.operator

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload: missing subject"
                )

            return AuthenticatedUser(
                id=user_id,
                username=payload.get("username", user_id),
                role=role,
                is_demo=settings.DEMO_MODE
            )
        except InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication token: {str(e)}"
            )

    # Missing credentials on protected routes is strictly 401 Unauthorized
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required. Please provide a valid Bearer token.",
        headers={"WWW-Authenticate": "Bearer"}
    )


def require_role(allowed_roles: List[UserRole]):
    """
    Enforces server-side Role-Based Access Control (RBAC).
    """
    async def role_checker(current_user: AuthenticatedUser = Depends(get_current_user)) -> AuthenticatedUser:
        if current_user.role not in allowed_roles and current_user.role != UserRole.admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access forbidden: User role '{current_user.role.value}' lacks required permissions ({[r.value for r in allowed_roles]})"
            )
        return current_user
    return role_checker
