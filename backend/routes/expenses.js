const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const auth = require('../middleware/auth');

// Get all expenses for logged in user
router.get('/', auth, async (req, res) => {
    try {
        const expenses = await Expense.find({ userId: req.user.userId }).sort({ created_at: -1 });
        res.json({
            message: 'Expenses retrieved successfully',
            data: expenses,
            total_data: expenses.length
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Add new expense
router.post('/', auth, async (req, res) => {
    try {
        const newExpense = new Expense({
            ...req.body,
            userId: req.user.userId
        });
        const expense = await newExpense.save();
        res.status(201).json({
            message: 'Expense added successfully',
            data: expense,
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Update expense
router.put('/:id', auth, async (req, res) => {
    try {
        let expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        
        // Check user ownership
        if (expense.userId.toString() !== req.user.userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        expense = await Expense.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
        res.json({
            message: 'Expense updated successfully',
            data: expense,
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete expense
router.delete('/:id', auth, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });

        if (expense.userId.toString() !== req.user.userId) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        await Expense.findByIdAndDelete(req.params.id);
        res.json({ 
            message: 'Expense removed',
            data: { id: req.params.id },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
