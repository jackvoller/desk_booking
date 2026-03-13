import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    deskId: {
      type: String,
      required: true,
      trim: true
    },
    userId: {
      type: String,
      required: true,
      trim: true
    },
    username: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/
    }
  },
  {
    timestamps: true
  }
);

bookingSchema.index({ deskId: 1, date: 1 }, { unique: true });
bookingSchema.index({ date: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;
