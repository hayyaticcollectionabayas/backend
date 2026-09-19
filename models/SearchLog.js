import mongoose from 'mongoose';

const searchLogSchema = new mongoose.Schema(
  {
    term: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    resultsCount: {
      type: Number,
      default: 0,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const SearchLog = mongoose.models.SearchLog || mongoose.model('SearchLog', searchLogSchema);
export default SearchLog;
