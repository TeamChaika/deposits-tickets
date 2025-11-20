const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

async function postJson(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.detail ?? "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

export function registerUser(payload) {
  return postJson("/auth/register", payload);
}

export function loginUser(payload) {
  return postJson("/auth/login", payload);
}

export function requestPasswordReset(payload) {
  return postJson("/auth/request-password-reset", payload);
}

export function resetPassword(payload) {
  return postJson("/auth/reset-password", payload);
}

export function changePassword(payload) {
  return postJson("/auth/change-password", payload);
}

export function changeEmail(payload) {
  return postJson("/auth/change-email", payload);
}

