const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    month: { type: String, required: true }, // Format: YYYY-MM
    amount: { type: Number, required: true },
    updated_at: { type: Date, default: Date.now }
});

// Ensure unique budget per user per month
budgetSchema.index({ userId: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);
