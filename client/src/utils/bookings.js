// A booking belongs to the signed-in person when it is under their account and
// their own name. Admin bookings made for someone else share the admin's userId
// but carry the guest's name, so they count as someone else's desk.
export function isOwnBooking(booking, user) {
  if (!booking || !user?.id) {
    return false;
  }

  return booking.userId === user.id && (booking.username ?? '') === (user.username ?? '');
}

export function getInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function getFirstName(name) {
  return String(name ?? '').trim().split(/\s+/)[0] ?? '';
}
