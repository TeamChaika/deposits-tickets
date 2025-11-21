const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

function getAuthHeaders(token) {
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

async function postJson(path, payload, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.detail ?? "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

async function getJson(path, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "GET",
    headers: getAuthHeaders(token),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.detail ?? "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

async function putJson(path, payload, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "PUT",
    headers: getAuthHeaders(token),
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.detail ?? "Request failed";
    throw new Error(errorMessage);
  }

  return data;
}

async function deleteJson(path, token = null) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "DELETE",
    headers: getAuthHeaders(token),
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

export function logoutUser(payload = {}) {
  return postJson("/auth/logout", payload);
}

// Establishment API functions
export function createEstablishment(payload, token) {
  return postJson("/establishments", payload, token);
}

export function getEstablishments(token, skip = 0, limit = 100) {
  return getJson(`/establishments?skip=${skip}&limit=${limit}`, token);
}

export function getEstablishmentById(id, token) {
  return getJson(`/establishments/${id}`, token);
}

export function updateEstablishment(id, payload, token) {
  return putJson(`/establishments/${id}`, payload, token);
}

export function deleteEstablishment(id, token) {
  return deleteJson(`/establishments/${id}`, token);
}

// Events API functions
export function createEvent(payload, token) {
  return postJson("/events", payload, token);
}

export function getEvents(token, establishmentId = null, skip = 0, limit = 100) {
  let path = `/events?skip=${skip}&limit=${limit}`;
  if (establishmentId) {
    path += `&establishment_id=${establishmentId}`;
  }
  return getJson(path, token);
}

export function getEventById(id, token) {
  return getJson(`/events/${id}`, token);
}

export function getEventPublic(id) {
  return getJson(`/events/public/${id}`);
}

export function updateEvent(id, payload, token) {
  return putJson(`/events/${id}`, payload, token);
}

export function deleteEvent(id, token) {
  return deleteJson(`/events/${id}`, token);
}

// Deposits API functions
export function createDeposit(payload, token) {
  return postJson("/deposits", payload, token);
}

export function getDeposits(token, establishmentId = null, eventId = null, skip = 0, limit = 100) {
  let path = `/deposits?skip=${skip}&limit=${limit}`;
  if (establishmentId) {
    path += `&establishment_id=${establishmentId}`;
  }
  if (eventId) {
    path += `&event_id=${eventId}`;
  }
  return getJson(path, token);
}

export function getDepositById(id, token) {
  return getJson(`/deposits/${id}`, token);
}

export function getDepositByLink(paymentLink) {
  return getJson(`/deposits/by-link/${paymentLink}`);
}

export function updateDeposit(id, payload, token) {
  return putJson(`/deposits/${id}`, payload, token);
}

export function deleteDeposit(id, token) {
  return deleteJson(`/deposits/${id}`, token);
}

// Tickets API functions
export function createTicket(payload, token) {
  return postJson("/tickets", payload, token);
}

export function getTickets(token, eventId = null, skip = 0, limit = 100) {
  let path = `/tickets?skip=${skip}&limit=${limit}`;
  if (eventId) {
    path += `&event_id=${eventId}`;
  }
  return getJson(path, token);
}

export function getTicketById(id, token) {
  return getJson(`/tickets/${id}`, token);
}

export function getTicketByQR(qrCode) {
  return getJson(`/tickets/by-qr/${qrCode}`);
}

export function checkInTicket(qrCode, payload) {
  return postJson(`/tickets/check-in/${qrCode}`, payload);
}

export function updateTicket(id, payload, token) {
  return putJson(`/tickets/${id}`, payload, token);
}

export function deleteTicket(id, token) {
  return deleteJson(`/tickets/${id}`, token);
}

// Promo Codes API functions
export function createPromoCode(payload, token) {
  return postJson("/promo-codes", payload, token);
}

export function getPromoCodes(token, eventId = null, skip = 0, limit = 100) {
  let path = `/promo-codes?skip=${skip}&limit=${limit}`;
  if (eventId) {
    path += `&event_id=${eventId}`;
  }
  return getJson(path, token);
}

export function getPromoCodeById(id, token) {
  return getJson(`/promo-codes/${id}`, token);
}

export function validatePromoCode(payload) {
  return postJson("/promo-codes/validate", payload);
}

export function updatePromoCode(id, payload, token) {
  return putJson(`/promo-codes/${id}`, payload, token);
}

export function deletePromoCode(id, token) {
  return deleteJson(`/promo-codes/${id}`, token);
}

