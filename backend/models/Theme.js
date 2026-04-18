const mongoose = require('mongoose');

const themeSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    mode: { type: String, required: true, default: 'light' } // light or dark
});

module.exports = mongoose.model('Theme', themeSchema);
