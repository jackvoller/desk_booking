import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import path from 'path';
import { fileURLToPath } from 'url';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import bookingRoutes from './routes/bookings.js';

const PORT = Number(process.env.PORT) || 4000;
const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLIENT_DIST_PATH = path.resolve(__dirname, '../../client/dist');

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
    secret: process.env.SESSION_SECRET || 'dev-session-secret',
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
  app.use(express.static(CLIENT_DIST_PATH));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/auth') || req.path === '/health') {
      return next();
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
