from __future__ import annotations

from fastapi import HTTPException, status
from fastapi.concurrency import run_in_threadpool
import requests
from supabase import Client

from app.schemas.auth import (
    ChangeEmailRequest,
    ChangePasswordRequest,
    LoginRequest,
    MessageResponse,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    RegisterRequest,
)
from app.core.config import get_settings
from typing import Any


async def register_user(client: Client, payload: RegisterRequest) -> MessageResponse:
    def _sign_up():
        return client.auth.sign_up({"email": payload.email, "password": payload.password})

    try:
        response = await run_in_threadpool(_sign_up)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Registration failed: {exc}",
        ) from exc

    token = response.session.access_token if response.session else None
    return MessageResponse(message="Registration successful", access_token=token)


async def login_user(client: Client, payload: LoginRequest) -> MessageResponse:
    def _sign_in():
        return client.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )

    try:
        response = await run_in_threadpool(_sign_in)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Login failed: {exc}",
        ) from exc

    if not response.session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials.",
        )

    return MessageResponse(
        message="Login successful",
        access_token=response.session.access_token,
    )


async def request_password_reset(
    client: Client, payload: PasswordResetRequest
) -> MessageResponse:
    def _reset():
        client.auth.reset_password_email(payload.email)

    try:
        await run_in_threadpool(_reset)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password reset failed: {exc}",
        ) from exc

    return MessageResponse(message="Password reset email sent")


async def _update_user_with_token(
    access_token: str,
    attributes: dict[str, Any],
) -> None:
    settings = get_settings()

    def _send_request():
        return requests.put(
            f"{settings.supabase_url}/auth/v1/user",
            headers={
                "apikey": settings.supabase_anon_key,
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            json=attributes,
            timeout=10,
        )

    response = await run_in_threadpool(_send_request)

    if response.status_code >= 400:
        detail = response.json().get("message", "Supabase user update failed")
        raise HTTPException(
            status_code=response.status_code,
            detail=detail,
        )


async def confirm_password_reset(
    client: Client, payload: PasswordResetConfirmRequest
) -> MessageResponse:
    if not payload.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="access_token is required to reset password",
        )

    try:
        await _update_user_with_token(
            access_token=payload.access_token,
            attributes={"password": payload.new_password},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password update failed: {exc}",
        ) from exc

    return MessageResponse(message="Password updated")


async def change_password(client: Client, payload: ChangePasswordRequest) -> MessageResponse:
    if not payload.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="access_token is required to change password",
        )

    try:
        await _update_user_with_token(
            access_token=payload.access_token,
            attributes={"password": payload.new_password},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Change password failed: {exc}",
        ) from exc

    return MessageResponse(message="Password changed")


async def change_email(client: Client, payload: ChangeEmailRequest) -> MessageResponse:
    if not payload.access_token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="access_token is required to change email",
        )

    try:
        await _update_user_with_token(
            access_token=payload.access_token,
            attributes={"email": payload.new_email},
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Change email failed: {exc}",
        ) from exc

    return MessageResponse(message="Email change requested")

