import { Router } from 'express';
import Booking from '../models/Booking.js';
import { requireAuth } from '../middleware/auth.js';
import { DESK_IDS, DESK_ID_SET } from '../config/desks.js';

const router = Router();
const MAX_ADVANCE_DAYS = 30;

function parseDateOnly(dateString) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return null;
  }

  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function isWithinBookingWindow(dateString) {
  const targetDate = parseDateOnly(dateString);
  if (!targetDate) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const msPerDay = 24 * 60 * 60 * 1000;
  const differenceInDays = Math.floor((targetDate.getTime() - today.getTime()) / msPerDay);

  return differenceInDays >= 0 && differenceInDays <= MAX_ADVANCE_DAYS;
}

function isPastDate(dateString) {
  const targetDate = parseDateOnly(dateString);
  if (!targetDate) {
    return false;
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return targetDate.getTime() < today.getTime();
}

function isWeekend(dateString) {
  const targetDate = parseDateOnly(dateString);
  if (!targetDate) {
    return false;
  }

  const weekDay = targetDate.getDay();
  return weekDay === 0 || weekDay === 6;
}

router.use(requireAuth);

router.get('/', async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ message: 'Query param "date" is required (YYYY-MM-DD).' });
    }

    if (!parseDateOnly(date)) {
      return res.status(400).json({ message: 'Invalid date format. Use YYYY-MM-DD.' });
    }

    const bookings = await Booking.find({ date })
      .where('deskId')
      .in(DESK_IDS)
      .select('deskId userId username email date')
      .sort({ deskId: 1 })
      .lean();

    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

router.get('/month', async (req, res, next) => {
  try {
    const { month } = req.query;

    if (!/^\d{4}-\d{2}$/.test(month ?? '')) {
      return res.status(400).json({ message: 'Query param "month" is required (YYYY-MM).' });
    }

    const [year, monthValue] = month.split('-').map(Number);
    if (monthValue < 1 || monthValue > 12) {
      return res.status(400).json({ message: 'Query param "month" must be between 01 and 12.' });
    }

    const monthStart = `${month}-01`;
    const monthEndDate = new Date(year, monthValue, 0);
    const monthEnd = `${month}-${String(monthEndDate.getDate()).padStart(2, '0')}`;

    const counts = await Booking.aggregate([
      {
        $match: {
          date: {
            $gte: monthStart,
            $lte: monthEnd
          },
          deskId: { $in: DESK_IDS }
        }
      },
      {
        $group: {
          _id: '$date',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          date: '$_id',
          count: 1
        }
      },
      {
        $sort: {
          date: 1
        }
      }
    ]);

    return res.json({
      month,
      totalDesks: DESK_IDS.length,
      counts
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/mine', async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      userId: req.user.id
    })
      .where('deskId')
      .in(DESK_IDS)
      .select('deskId userId username email date')
      .sort({ date: 1, deskId: 1 })
      .lean();

    return res.json({ bookings });
  } catch (error) {
    return next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { deskId, date } = req.body;

    if (!deskId || typeof deskId !== 'string') {
      return res.status(400).json({ message: '"deskId" is required.' });
    }

    if (!DESK_ID_SET.has(deskId)) {
      return res.status(400).json({ message: 'Invalid desk ID for this floor.' });
    }

    if (!date || typeof date !== 'string' || !parseDateOnly(date)) {
      return res.status(400).json({ message: '"date" is required in YYYY-MM-DD format.' });
    }

    if (isPastDate(date)) {
      return res.status(400).json({
        message: 'You cannot book a desk for a past date.'
      });
    }

    if (!isWithinBookingWindow(date)) {
      return res.status(400).json({
        message: `Bookings are only allowed from today to ${MAX_ADVANCE_DAYS} days in advance.`
      });
    }

    if (isWeekend(date)) {
      return res.status(400).json({
        message: 'Weekend bookings are unavailable. Please choose a weekday.'
      });
    }

    const existingUserBooking = await Booking.findOne({
      userId: req.user.id,
      date
    })
      .select('deskId')
      .lean();

    if (existingUserBooking) {
      if (existingUserBooking.deskId === deskId) {
        return res.status(409).json({
          message: 'You already booked this desk for the selected date.'
        });
      }

      return res.status(409).json({
        message: `You already have a desk booking (${existingUserBooking.deskId}) for this date. You can only book one desk per day.`
      });
    }

    const booking = await Booking.create({
      deskId,
      date,
      userId: req.user.id,
      username: req.user.username,
      email: req.user.email
    });

    return res.status(201).json({
      booking: {
        id: booking.id,
        deskId: booking.deskId,
        date: booking.date,
        userId: booking.userId,
        username: booking.username,
        email: booking.email
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      if (error?.keyPattern?.userId && error?.keyPattern?.date) {
        return res.status(409).json({
          message: 'You can only have one desk booking per day.'
        });
      }

      return res.status(409).json({
        message: 'That desk is already booked for the selected date.'
      });
    }

    return next(error);
  }
});

router.delete('/', async (req, res, next) => {
  try {
    const { deskId, date } = req.body;

    if (!deskId || typeof deskId !== 'string') {
      return res.status(400).json({ message: '"deskId" is required.' });
    }

    if (!DESK_ID_SET.has(deskId)) {
      return res.status(400).json({ message: 'Invalid desk ID for this floor.' });
    }

    if (!date || typeof date !== 'string' || !parseDateOnly(date)) {
      return res.status(400).json({ message: '"date" is required in YYYY-MM-DD format.' });
    }

    const existingBooking = await Booking.findOne({ deskId, date }).lean();

    if (!existingBooking) {
      return res.status(404).json({
        message: 'No booking was found for that desk and date.'
      });
    }

    if (existingBooking.userId !== req.user.id) {
      return res.status(403).json({
        message: 'You can only remove your own bookings.'
      });
    }

    const deletedBooking = await Booking.findOneAndDelete({
      _id: existingBooking._id,
      userId: req.user.id
    }).lean();

    if (!deletedBooking) {
      return res.status(409).json({
        message: 'This booking was already removed.'
      });
    }

    return res.status(200).json({
      booking: {
        id: deletedBooking._id.toString(),
        deskId: deletedBooking.deskId,
        date: deletedBooking.date,
        userId: deletedBooking.userId,
        username: deletedBooking.username,
        email: deletedBooking.email
      }
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
