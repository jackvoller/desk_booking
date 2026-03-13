import { randomBytes } from 'crypto';
import { Router } from 'express';
import passport from 'passport';
import { isGoogleOAuthConfigured } from '../config/passport.js';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLACK_AUTHORIZE_URL = 'https://slack.com/openid/connect/authorize';
const SLACK_TOKEN_URL = 'https://slack.com/api/openid.connect.token';
const SLACK_USERINFO_URL = 'https://slack.com/api/openid.connect.userInfo';
const SLACK_STATE_TTL_MS = 10 * 60 * 1000;

function getClientBaseUrl() {
  return process.env.CLIENT_BASE_URL || 'http://localhost:5173';
}

function getServerBaseUrl() {
  return process.env.SERVER_BASE_URL || 'http://localhost:4000';
}

function getSlackRedirectUri() {
  return process.env.SLACK_REDIRECT_URI || `${getServerBaseUrl()}/auth/slack/callback`;
}

function isDevAuthEnabled() {
  if (process.env.ENABLE_DEV_AUTH === 'true') {
    return true;
  }

  if (process.env.ENABLE_DEV_AUTH === 'false') {
    return false;
  }

  return process.env.NODE_ENV !== 'production';
}

function isSlackAuthConfigured() {
  return Boolean(process.env.SLACK_CLIENT_ID && process.env.SLACK_CLIENT_SECRET);
}

function getAuthProviders() {
  return {
    devLogin: isDevAuthEnabled(),
    slack: isSlackAuthConfigured(),
    google: isGoogleOAuthConfigured()
  };
}

function redirectAuthError(res, code) {
  const url = new URL(getClientBaseUrl());
  url.searchParams.set('authError', code);
  return res.redirect(url.toString());
}

function parseJwtClaims(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    return {};
  }

  const parts = idToken.split('.');
  if (parts.length < 2) {
    return {};
  }

  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  payload += '='.repeat((4 - (payload.length % 4)) % 4);

  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch (_error) {
    return {};
  }
}

function buildUsername(value, email) {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  if (trimmed) {
    return trimmed;
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'Slack User';
}

router.get('/google', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return redirectAuthError(res, 'googleDisabled');
  }

  return passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  if (!isGoogleOAuthConfigured()) {
    return redirectAuthError(res, 'googleDisabled');
  }

  return passport.authenticate('google', { failureRedirect: `${getClientBaseUrl()}/?authError=google` })(
    req,
    res,
    next
  );
}, (_req, res) => {
  res.redirect(getClientBaseUrl());
});

router.get('/slack', (req, res) => {
  if (!isSlackAuthConfigured()) {
    return redirectAuthError(res, 'slackDisabled');
  }

  const state = randomBytes(24).toString('hex');
  req.session.slackAuthState = {
    value: state,
    expiresAt: Date.now() + SLACK_STATE_TTL_MS
  };

  const params = new URLSearchParams({
    client_id: process.env.SLACK_CLIENT_ID,
    response_type: 'code',
    redirect_uri: getSlackRedirectUri(),
    scope: 'openid profile email',
    state
  });

  return res.redirect(`${SLACK_AUTHORIZE_URL}?${params.toString()}`);
});

router.get('/slack/callback', async (req, res, next) => {
  if (!isSlackAuthConfigured()) {
    return redirectAuthError(res, 'slackDisabled');
  }

  const { code, state, error: slackError } = req.query;
  if (slackError) {
    return redirectAuthError(res, 'slackDenied');
  }

  const stateRecord = req.session.slackAuthState;
  req.session.slackAuthState = null;

  if (
    !stateRecord?.value ||
    !state ||
    stateRecord.value !== state ||
    typeof stateRecord.expiresAt !== 'number' ||
    stateRecord.expiresAt < Date.now()
  ) {
    return redirectAuthError(res, 'slackState');
  }

  if (!code || typeof code !== 'string') {
    return redirectAuthError(res, 'slackDenied');
  }

  try {
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: getSlackRedirectUri(),
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET
    });

    const tokenResponse = await fetch(SLACK_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenBody.toString()
    });

    const tokenPayload = await tokenResponse.json().catch(() => ({}));
    if (!tokenResponse.ok || !tokenPayload?.ok) {
      return redirectAuthError(res, 'slackToken');
    }

    const slackClaims = parseJwtClaims(tokenPayload.id_token);
    const userInfoResponse = await fetch(SLACK_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${tokenPayload.access_token}`
      }
    });
    const userInfoPayload = await userInfoResponse.json().catch(() => ({}));

    if (!userInfoResponse.ok || userInfoPayload?.ok === false) {
      return redirectAuthError(res, 'slackProfile');
    }

    const teamId =
      userInfoPayload['https://slack.com/team_id'] ?? tokenPayload['https://slack.com/team_id'] ?? slackClaims['https://slack.com/team_id'] ?? '';
    const userId =
      userInfoPayload['https://slack.com/user_id'] ?? tokenPayload['https://slack.com/user_id'] ?? slackClaims['https://slack.com/user_id'] ?? userInfoPayload.sub ?? '';
    const email = (userInfoPayload.email ?? slackClaims.email ?? '').trim().toLowerCase();
    const username = buildUsername(
      userInfoPayload.name ?? `${userInfoPayload.given_name ?? ''} ${userInfoPayload.family_name ?? ''}`,
      email
    );

    if (!userId || !email || !EMAIL_REGEX.test(email)) {
      return redirectAuthError(res, 'slackProfile');
    }

    const allowedTeamId = (process.env.SLACK_ALLOWED_TEAM_ID || '').trim();
    if (allowedTeamId && teamId !== allowedTeamId) {
      return redirectAuthError(res, 'slackWorkspace');
    }

    const user = {
      id: `slack-${teamId || 'team'}-${userId}`,
      username,
      email
    };

    return req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }

      return res.redirect(getClientBaseUrl());
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/me', (req, res) => {
  const authProviders = getAuthProviders();

  if (!req.isAuthenticated?.()) {
    return res.json({
      user: null,
      authProviders
    });
  }

  return res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    },
    authProviders
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
