# Desk Booking Web App

Full-stack desk booking application with:

- React + Tailwind CSS frontend
- Node.js + Express backend
- MongoDB database
- Authentication via:
  - Dev Login (no third-party setup, ideal for local testing)
  - Slack OpenID Connect (recommended for free internal SSO)
  - Google OAuth 2.0 (legacy optional)

## Features

- Dev Login and Slack login both produce identity (`username`, `email`)
- Authenticated-only booking APIs
- Interactive SVG floor plan with desk status colors
  - Green = available
  - Red = booked
- Click green desk -> confirmation modal
- Click red desk -> tooltip with booking user
- Booking limited to today + 30 days
- Monthly calendar overview showing daily booking counts (e.g. `8/17 Desks`)
- Calendar day click opens Desk View with selected date

## Project Structure

- `server/` - Express API, Slack/Google auth, MongoDB models
- `client/` - React app with Desk View + Calendar View

## Setup

### 1. Install dependencies

```bash
npm install --prefix server
npm install --prefix client
```

### 2. Configure environment variables

```bash
cp server/.env.example server/.env
```

Set the values in `server/.env`:

- `MONGODB_URI`
- `SERVER_BASE_URL` (default: `http://localhost:4000`)
- `CLIENT_BASE_URL` (default: `http://localhost:5173`)
- `SESSION_SECRET`
- `TOTAL_DESKS` (default: `17`)
- `ENABLE_DEV_AUTH` (default: `true`)
- `SLACK_CLIENT_ID` (required for Slack sign-in)
- `SLACK_CLIENT_SECRET` (required for Slack sign-in)
- `SLACK_REDIRECT_URI` (default: `http://localhost:4000/auth/slack/callback`)
- `SLACK_ALLOWED_TEAM_ID` (recommended for internal-only access)
- `GOOGLE_CLIENT_ID` (optional legacy auth)
- `GOOGLE_CLIENT_SECRET` (optional legacy auth)

### 3. Configure Slack app (recommended)

In your Slack App settings:

- Add OpenID scopes: `openid`, `profile`, `email`
- Add redirect URL:
  - `http://localhost:4000/auth/slack/callback`
- Install the app in your workspace
- Set `SLACK_ALLOWED_TEAM_ID` to lock sign-in to your internal workspace

### 4. (Optional) Configure Google OAuth callback URL

In Google Cloud Console OAuth credentials, add:

- `http://localhost:4000/auth/google/callback`

If you only want local testing, skip OAuth setup and use the Dev Login form on the sign-in page.

### 5. Run the app

Run both servers in separate terminals:

```bash
npm run dev:server
npm run dev:client
```

Or run from root:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`

## API Endpoints

### `GET /api/bookings?date=YYYY-MM-DD`

Returns bookings for one day.

### `POST /api/bookings`

Creates a booking.

Request body:

```json
{
  "deskId": "A1",
  "date": "2026-03-20"
}
```

Validation:

- user must be authenticated
- desk must not already be booked
- date must be between today and 30 days in advance

### `DELETE /api/bookings`

Removes a booking for a specific desk/date.

Request body:

```json
{
  "deskId": "A1",
  "date": "2026-03-20"
}
```

### `GET /api/bookings/month?month=YYYY-MM`

Returns grouped booking counts for calendar badges.

## Notes

- The floor plan desk coordinates are defined in:
  - `client/src/config/floorPlanSchema.js`
- Update desk coordinates there to match your PDF floor layout exactly.
