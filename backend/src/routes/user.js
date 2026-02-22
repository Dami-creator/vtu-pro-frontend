const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get profile
router.get('/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json({
            id: user._id,
            fullName: user.fullName,
            email: user.email,
            balance: user.balance,
            totalSpent: user.totalSpent,
            totalCashback: user.totalCashback
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
