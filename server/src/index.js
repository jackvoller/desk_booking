import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';

try {
  await import('dotenv/config');
} catch (_error) {
  // Ignore when dotenv is unavailable in production runtimes.
}

const PORT = Number(process.env.PORT) || 4000;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.trim()) {
    return secret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET must be configured in production.');
  }

  return 'dev-session-secret';
}

function resolveClientDistPath() {
  const candidates = [
    path.resolve(__dirname, '../public'),
    path.resolve(process.cwd(), 'server/public'),
    path.resolve(process.cwd(), 'public'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(__dirname, '../client/dist')
  ];

  for (const candidate of candidates) {
    const indexFile = path.join(candidate, 'index.html');
    if (fs.existsSync(indexFile)) {
      return candidate;
    }
  }

  return null;
}

const CLIENT_DIST_PATH = resolveClientDistPath();

if (process.env.NODE_ENV === 'production') {
  // Required behind Render's proxy so secure session cookies are set correctly.
  app.set('trust proxy', 1);
}

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
}

configurePassport();

app.use(
  cors({
    origin: process.env.CLIENT_BASE_URL,
    credentials: true
  })
);

app.use(express.json());
app.use(
  session({
    name: 'desk-booking.sid',
    secret: getSessionSecret(),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);

if (process.env.NODE_ENV === 'production') {
  if (CLIENT_DIST_PATH) {
    app.use(express.static(CLIENT_DIST_PATH));
  } else {
    console.error('Frontend build not found. Expected client/dist with index.html.');
  }

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health') {
      return next();
    }

    if (!CLIENT_DIST_PATH) {
      return res.status(500).json({
        message: 'Frontend build not found on server.'
      });
    }

    return res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Internal server error.' });
});

connectToDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to connect to MongoDB:', error.message);
    process.exit(1);
  });
