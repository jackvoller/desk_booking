# Desk Booking Web App

Desk booking app for internal teams with:

- React + Tailwind frontend
- Node.js + Express API
- MongoDB storage
- Session auth with Slack SSO (recommended) and Dev Login fallback

## What Is Running Where

- `client/`: React UI (`Desk View` and `Calendar View`)
- `server/`: auth, bookings API, session handling, and production static serving
- MongoDB Atlas: persistent bookings + session store
- Render or Koyeb: hosts the web service (`server`) and serves built frontend in production
- Slack App: handles user login via OpenID Connect (`openid profile email`)

## Features

- Interactive floor plan with booking status
- Monthly calendar with occupancy indicators
- Booking limit: today + 30 days
- Weekends disabled for booking
- Users can only remove their own bookings
- Authenticated-only booking endpoints

## Quick Local Setup

1. Install dependencies:

```bash
npm install --prefix server
npm install --prefix client
```

2. Create env file:

```bash
cp server/.env.example server/.env
```

3. Start app:

```bash
npm run dev
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/health`

## Environment Variables

See `server/.env.example` for full list.

Required in production:

- `MONGODB_URI`
- `SESSION_SECRET`
- `SERVER_BASE_URL`
- `CLIENT_BASE_URL`
- `SLACK_CLIENT_ID`
- `SLACK_CLIENT_SECRET`
- `SLACK_REDIRECT_URI`
- One or both allowlists for internal-only access:
  - `SLACK_ALLOWED_TEAM_ID` (`T...`)
  - `SLACK_ALLOWED_ORG_ID` (`E...`)

Common flags:

- `ENABLE_DEV_AUTH=true|false`
- `NODE_ENV=production`

Security notes:

- `SESSION_SECRET` is required in production.
- Development login is always disabled in production.

To remove Quick Local Access from the login page in production, set:

- `ENABLE_DEV_AUTH=false`

## API Summary

- `GET /health`
- `GET /auth/me`
- `GET /auth/slack`
- `GET /auth/slack/callback`
- `POST /auth/dev-login` (if enabled)
- `POST /auth/logout`
- `GET /api/bookings?date=YYYY-MM-DD`
- `POST /api/bookings`
- `DELETE /api/bookings`
- `GET /api/bookings/month?month=YYYY-MM`

## Deploy Guide

Use the full deployment and service breakdown here:

- [DEPLOYMENT_GUIDE.md](/Users/jackvoller/desk_booking/DEPLOYMENT_GUIDE.md)

## Notes

- Floor layout schema: `client/src/config/floorPlanSchema.js`
- Production server serves `client/dist` from Express so app + API are same-origin.
