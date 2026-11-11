import BookingDelegate from '../models/BookingDelegate.js';

export function isAdminUser(user) {
  return Boolean(user?.isAdmin);
}

// Admins, and anyone on the admin-managed list, can book a desk under someone
// else's name. Checked on every request so removing someone takes effect at once.
export async function canBookForOthers(user) {
  if (isAdminUser(user)) {
    return true;
  }

  const email = typeof user?.email === 'string' ? user.email.trim().toLowerCase() : '';
  if (!email) {
    return false;
  }

  return Boolean(await BookingDelegate.exists({ email }));
}
