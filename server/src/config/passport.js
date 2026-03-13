import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';

function getServerBaseUrl() {
  return process.env.SERVER_BASE_URL || 'http://localhost:4000';
}

export function isGoogleOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function buildUsername(profile, email) {
  if (profile?.displayName) {
    return profile.displayName;
  }

  const givenName = profile?.name?.givenName ?? '';
  const familyName = profile?.name?.familyName ?? '';
  const fullName = `${givenName} ${familyName}`.trim();
  if (fullName) {
    return fullName;
  }

  if (email) {
    return email.split('@')[0];
  }

  return 'Unknown User';
}

export function configurePassport() {
  if (isGoogleOAuthConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${getServerBaseUrl()}/auth/google/callback`
        },
        (_accessToken, _refreshToken, profile, done) => {
          const email = profile?.emails?.[0]?.value ?? '';
          const username = buildUsername(profile, email);

          const user = {
            id: profile.id,
            username,
            email
          };

          done(null, user);
        }
      )
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user, done) => {
    done(null, user);
  });
}
