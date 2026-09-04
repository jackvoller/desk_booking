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

let databaseReady = false;

async function connectToDatabase() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured.');
  }

  await mongoose.connect(process.env.MONGODB_URI);
}

// Retries forever rather than exiting, so a transient Atlas outage degrades the
// app instead of killing the instance and failing the platform health check.
async function connectToDatabaseWithRetry() {
  let attempt = 0;

  for (;;) {
    try {
      await connectToDatabase();
      databaseReady = true;
      console.log('Connected to MongoDB.');
      return;
    } catch (error) {
      attempt += 1;
      const delayMs = Math.min(2000 * 2 ** (attempt - 1), 60000);
      console.error(
        `MongoDB connection attempt ${attempt} failed: ${error.message}. Retrying in ${Math.round(delayMs / 1000)}s.`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  databaseReady = false;
});

mongoose.connection.on('connected', () => {
  databaseReady = true;
});

// Reuse mongoose's client for the session store. Letting connect-mongo open its
// own connection means a second, independent connect attempt whose rejection is
// unhandled and takes the whole process down before the retry above can help.
// This promise only ever resolves, so a database outage cannot crash startup.
const sessionClientPromise = new Promise((resolve) => {
  if (mongoose.connection.readyState === 1) {
    resolve(mongoose.connection.getClient());
    return;
  }

  mongoose.connection.once('connected', () => {
    resolve(mongoose.connection.getClient());
  });
});

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
      clientPromise: sessionClientPromise
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

// Intentionally always 200 while the process is up: the platform health check
// decides whether to keep the instance alive, and a database blip must not
// cause the instance to be torn down.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', database: databaseReady ? 'connected' : 'connecting' });
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

// Bind before connecting so the health check can pass during a slow or failing
// database connect instead of the process exiting and the instance never
// becoming healthy.
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

connectToDatabaseWithRetry();

let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`Received ${signal}, shutting down.`);

  // Exit 0 on platform-initiated stops so a normal instance recycle is not
  // recorded as a crashed deployment.
  const forceExit = setTimeout(() => process.exit(0), 10000);
  forceExit.unref();

  server.close(() => {
    mongoose.connection
      .close(false)
      .catch(() => {})
      .finally(() => process.exit(0));
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Node exits on unhandled rejections by default. Driver-level connection
// failures surface this way, and losing the instance is worse than serving
// degraded, so log loudly and stay up.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
});
