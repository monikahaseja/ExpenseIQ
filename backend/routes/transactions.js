const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const auth = require('../middleware/auth');

// Get all transactions for logged in user
router.get('/', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.user.userId }).sort({ created_at: -1 });
        res.json({
            message: 'Transactions retrieved successfully',
            data: transactions,
            total_data: transactions.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Add new transaction
router.post('/', auth, async (req, res) => {
    try {
        const newTransaction = new Transaction({
            ...req.body,
            userId: req.user.userId
        });
        const transaction = await newTransaction.save();
        res.status(201).json({
            message: 'Transaction added successfully',
            data: transaction,
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update transaction
router.put('/:id', auth, async (req, res) => {
    try {
        let transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });
        
        // Check user ownership
        if (transaction.userId.toString() !== req.user.userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        transaction = await Transaction.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.json({
            message: 'Transaction updated successfully',
            data: transaction,
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete transaction
router.delete('/:id', auth, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id);
        if (!transaction) return res.status(404).json({ message: 'Transaction not found' });

        if (transaction.userId.toString() !== req.user.userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Transaction.findByIdAndDelete(req.params.id);
        res.json({ 
            message: 'Transaction removed',
            data: { id: req.params.id },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
