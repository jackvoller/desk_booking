async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = payload?.message || 'Request failed.';
    throw new Error(message);
  }

  return payload;
}

export const api = {
  getCurrentUser() {
    return request('/auth/me');
  },
  loginWithSlack() {
    window.location.href = '/auth/slack';
  },
  devLogin(username, email) {
    return request('/auth/dev-login', {
      method: 'POST',
      body: JSON.stringify({ username, email })
    });
  },
  logout() {
    return request('/auth/logout', { method: 'POST' });
  },
  getBookingsByDate(date) {
    return request(`/api/bookings?date=${date}`);
  },
  getMyBookings() {
    return request('/api/bookings/mine');
  },
  createBooking(deskId, date) {
    return request('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ deskId, date })
    });
  },
  deleteBooking(deskId, date) {
    return request('/api/bookings', {
      method: 'DELETE',
      body: JSON.stringify({ deskId, date })
    });
  },
  getMonthlyCounts(month) {
    return request(`/api/bookings/month?month=${month}`);
  }
};
