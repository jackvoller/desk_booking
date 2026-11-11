import mongoose from 'mongoose';

// People an admin has allowed to book desks for others (for example, external
// visitors), without giving them admin access. Matched on email, which covers
// both Slack and email sign-in.
const bookingDelegateSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true
    },
    name: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

const BookingDelegate = mongoose.model('BookingDelegate', bookingDelegateSchema);

export default BookingDelegate;
