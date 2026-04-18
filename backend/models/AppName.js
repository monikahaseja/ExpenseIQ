const mongoose = require('mongoose');

const appNameSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, default: '💰ExpenseIQ' }
});

module.exports = mongoose.model('AppName', appNameSchema);
