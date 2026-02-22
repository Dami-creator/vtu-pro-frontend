const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Fund wallet
router.post('/fund', auth, async (req, res) => {
    try {
        const { reference, amount } = req.body;
        
        // Verify Paystack payment
        const paystackRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );
        
        if (paystackRes.data.data.status !== 'success') {
            return res.status(400).json({ message: 'Payment verification failed' });
        }
        
        // Create transaction record
        const transaction = await Transaction.create({
            user: req.user.id,
            type: 'wallet_funding',
            amount: amount,
            reference: reference,
            paymentMethod: 'paystack',
            status: 'success'
        });
        
        // Update user balance
        const user = await User.findById(req.user.id);
        user.balance += amount;
        await user.save();
        
        res.json({ transaction, newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
