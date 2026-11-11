import { Router } from 'express';
import BookingDelegate from '../models/BookingDelegate.js';
import { requireAuth } from '../middleware/auth.js';
import { isAdminUser } from '../services/permissions.js';

const router = Router();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 80;

router.use(requireAuth);
router.use((req, res, next) => {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ message: 'Admin access required.' });
  }

  return next();
});

function toResponse(delegate) {
  return {
    id: delegate._id.toString(),
    email: delegate.email,
    name: delegate.name ?? '',
    createdAt: delegate.createdAt
  };
}

router.get('/delegates', async (_req, res, next) => {
  try {
    const delegates = await BookingDelegate.find({}).sort({ email: 1 }).lean();
    return res.json({ delegates: delegates.map(toResponse) });
  } catch (error) {
    return next(error);
  }
});

router.post('/delegates', async (req, res, next) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';

  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ message: 'Enter a valid email address.' });
  }

  if (name.length > MAX_NAME_LENGTH) {
    return res.status(400).json({ message: `Name must be ${MAX_NAME_LENGTH} characters or fewer.` });
  }

  try {
    const delegate = await BookingDelegate.create({ email, name });
    return res.status(201).json({ delegate: toResponse(delegate) });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: `${email} can already book for others.` });
    }

    return next(error);
  }
});

router.delete('/delegates/:id', async (req, res, next) => {
  try {
    const deleted = await BookingDelegate.findByIdAndDelete(req.params.id).lean();
    if (!deleted) {
      return res.status(404).json({ message: 'That person is no longer on the list.' });
    }

    return res.json({ delegate: toResponse(deleted) });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'That person is no longer on the list.' });
    }

    return next(error);
  }
});

export default router;
