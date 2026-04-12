const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');
const jwt = require('jsonwebtoken');

// Signup
router.post('/signup', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: 'User already exists' });
        }

        user = new User({ name, email, password, phoneNumber: req.body.phoneNumber });
        await user.save();

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie
        res.cookie('token', token, {
            httpOnly: false, // Set to false so it can be seen more easily in Postman/Frontend
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.status(201).json({ 
            message: 'User registered successfully',
            data: { 
                token, 
                user: {
                    id: user._id, 
                    name: user.name, 
                    email: user.email, 
                    phoneNumber: user.phoneNumber,
                    profilePhoto: user.profilePhoto,
                    password: user.password
                }
            },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        
        // Set cookie
        res.cookie('token', token, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        res.json({ 
            message: 'Login successful',
            data: { 
                token, 
                user: {
                    id: user._id, 
                    name: user.name, 
                    email: user.email, 
                    phoneNumber: user.phoneNumber,
                    profilePhoto: user.profilePhoto,
                    password: user.password
                }
            },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Get Profile
router.get('/profile', auth, async (req, res) => {
    try {
        // Auth middleware will be used here to populate req.user
        res.json({
            message: 'Profile retrieved successfully',
            data: {
                id: user._id,
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber,
                profilePhoto: user.profilePhoto
            },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update Profile
router.put('/profile', auth, async (req, res) => {
    try {
        const { name, email, phoneNumber } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (name) user.name = name;
        if (email) user.email = email;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (req.body.profilePhoto !== undefined) user.profilePhoto = req.body.profilePhoto;

        await user.save();
        res.json({ 
            message: 'Profile updated successfully',
            data: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                phoneNumber: user.phoneNumber, 
                profilePhoto: user.profilePhoto 
            },
            total_data: 1
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

// Change Password
router.put('/change-password', auth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) return res.status(400).json({ message: 'Current password incorrect' });

        user.password = newPassword;
        await user.save();
        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
});

module.exports = router;
