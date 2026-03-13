import { Router } from 'express';
import passport from 'passport';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isDevAuthEnabled() {
  if (process.env.ENABLE_DEV_AUTH === 'true') {
    return true;
  }

  if (process.env.ENABLE_DEV_AUTH === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_BASE_URL}/?authError=1`
  }),
  (req, res) => {
    res.redirect(process.env.CLIENT_BASE_URL);
  }
);

router.get('/me', (req, res) => {
  if (!req.isAuthenticated?.()) {
    return res.json({ user: null });
  }

  return res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    }
  });
});

router.post('/dev-login', (req, res, next) => {
  if (!isDevAuthEnabled()) {
    return res.status(403).json({
      message: 'Development login is disabled.'
    });
  }

  const rawUsername = typeof req.body?.username === 'string' ? req.body.username : '';
  const rawEmail = typeof req.body?.email === 'string' ? req.body.email : '';

  const username = rawUsername.trim();
  const email = rawEmail.trim().toLowerCase();

  if (!username || username.length > 80) {
    return res.status(400).json({
      message: 'Provide a username between 1 and 80 characters.'
    });
  }

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({
      message: 'Provide a valid email address.'
    });
  }

  const user = {
    id: `dev-${email}`,
    username,
    email
  };

  req.login(user, (loginError) => {
    if (loginError) {
      return next(loginError);
    }

    return res.status(200).json({ user });
  });
});

router.post('/logout', (req, res, next) => {
  req.logout((logoutError) => {
    if (logoutError) {
      return next(logoutError);
    }

    req.session.destroy((sessionError) => {
      if (sessionError) {
        return next(sessionError);
      }

      res.clearCookie('desk-booking.sid');
      return res.status(200).json({ message: 'Logged out.' });
    });
  });
});

export default router;
