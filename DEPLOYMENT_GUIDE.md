# Deployment Guide (Render + MongoDB Atlas + Slack SSO)

This guide explains exactly what each service does and how to deploy this app end-to-end.

## Service Responsibilities

- Render:
  - Runs the Node/Express server.
  - Serves the built React app (`client/dist`) in production.
  - Provides the public app URL (for users and Slack callback).
- MongoDB Atlas:
  - Stores booking records.
  - Stores Express session data (`connect-mongo`).
- Slack App:
  - Handles user authentication via OAuth/OpenID.
  - Returns user identity (`name`, `email`) used by the app.

## Architecture

1. User opens the Render URL.
2. React frontend loads from Express.
3. User clicks `Sign in with Slack`.
4. Slack redirects back to `/auth/slack/callback`.
5. Server creates a session cookie.
6. Frontend calls `/auth/me`, `/api/bookings`, etc.
7. Bookings and sessions are persisted in Atlas.

## Prerequisites

- GitHub repository with this code.
- Render account.
- MongoDB Atlas account.
- Slack workspace where you can install an app.

## Step 1: MongoDB Atlas Setup

1. Go to https://www.mongodb.com/atlas and create a free cluster (M0).
2. Create a database user (username + password).
3. In `Network Access`, allow `0.0.0.0/0` (quick start).
4. In cluster `Connect` -> `Drivers`, copy the URI.
5. Replace placeholders and keep DB name `desk-booking`.

Example format:

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/desk-booking?retryWrites=true&w=majority
```

This value becomes `MONGODB_URI` in Render.

## Step 2: Slack App Setup

1. Go to https://api.slack.com/apps and create app `From scratch`.
2. In `OAuth & Permissions`, add redirect URL:

```text
https://<your-render-service>.onrender.com/auth/slack/callback
```

3. Ensure OpenID scopes are enabled for Sign in with Slack:
   - `openid`
   - `profile`
   - `email`
4. Install app to your workspace.
5. Copy `Client ID` and `Client Secret` from Slack app settings.
6. Find workspace team ID (`T...`) from Slack URL:

```text
https://app.slack.com/client/TXXXXXXX/CXXXXXXX
```

Use `TXXXXXXX` as `SLACK_ALLOWED_TEAM_ID`.

If you are on Slack Enterprise Grid and primarily have an org ID (`E...`), you can use:

- `SLACK_ALLOWED_ORG_ID=E...`

## Step 3: Render Service Setup

1. In Render, create `New` -> `Web Service`.
2. Connect GitHub repo `jackvoller/desk_booking`.
3. Use settings:
   - Root Directory: (blank)
   - Environment: Node
   - Build Command:

```bash
npm install --prefix server && npm install --prefix client --include=dev && npm run build --prefix client
```

   - Start Command:

```bash
npm start --prefix server
```

4. Add environment variables:

```text
NODE_ENV=production
MONGODB_URI=<atlas-uri>
SESSION_SECRET=<long-random-string>
ENABLE_DEV_AUTH=true
SERVER_BASE_URL=https://<your-render-service>.onrender.com
CLIENT_BASE_URL=https://<your-render-service>.onrender.com
SLACK_CLIENT_ID=<slack-client-id>
SLACK_CLIENT_SECRET=<slack-client-secret>
SLACK_REDIRECT_URI=https://<your-render-service>.onrender.com/auth/slack/callback
SLACK_ALLOWED_TEAM_ID=<T...>         # optional
SLACK_ALLOWED_ORG_ID=<E...>          # optional
```

5. Deploy latest commit.

## Step 4: Verify Deployment

Check these URLs:

- `https://<your-render-service>.onrender.com/health`
  - Expect: `{"status":"ok"}`
- `https://<your-render-service>.onrender.com/auth/me`
  - Expect: `authProviders.slack` is `true`

Then open app URL and run login test:

1. Click `Sign in with Slack`.
2. Complete Slack auth.
3. Confirm you are redirected back and logged in.
4. Book and unbook a desk.

## Recommended Production Hardening

- Set `ENABLE_DEV_AUTH=false` after Slack login is confirmed.
- Rotate `SESSION_SECRET` periodically.
- Restrict Atlas network access to known egress IPs if available.
- Keep `SLACK_ALLOWED_TEAM_ID` set for internal-only access.

## Troubleshooting

- Build fails with `vite: not found`:
  - Ensure build command includes `npm install --prefix client --include=dev`.
- Slack callback mismatch:
  - `SLACK_REDIRECT_URI` must exactly match Slack app redirect URL.
- Slack provider disabled in `/auth/me`:
  - Missing `SLACK_CLIENT_ID` or `SLACK_CLIENT_SECRET`.
- Login blocked for workspace:
  - Check `SLACK_ALLOWED_TEAM_ID` and/or `SLACK_ALLOWED_ORG_ID` values.
