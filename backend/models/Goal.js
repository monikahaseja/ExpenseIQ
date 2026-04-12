const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: { type: String, required: true },
    target_amount: { type: Number, required: true },
    current_amount: { type: Number, default: 0 },
    deadline: { type: Date },
    icon: { type: String },
    color: { type: String },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Goal', goalSchema);
