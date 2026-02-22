const express = require('express');
const axios = require('axios');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const router = express.Router();

// Get all transactions
router.get('/', auth, async (req, res) => {
    try {
        const transactions = await Transaction.find({ user: req.user.id }).sort({ createdAt: -1 });
        res.json({ transactions });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Wallet payment
router.post('/wallet-pay', auth, async (req, res) => {
    try {
        const { type, network, phone, amount } = req.body;
        
        if (req.user.balance < amount) {
            return res.status(400).json({ message: 'Insufficient balance' });
        }
        
        const transaction = await Transaction.create({
            user: req.user.id,
            type,
            network,
            phone,
            amount,
            paymentMethod: 'wallet',
            status: 'pending'
        });
        
        const user = await User.findById(req.user.id);
        user.balance -= amount;
        
        // Simulate VTU success (replace with real API later)
        transaction.status = 'success';
        user.totalSpent += amount;
        
        const cashbackRates = { mtn: 0.02, glo: 0.02, airtel: 0.015, '9mobile': 0.01 };
        const cashback = amount * (cashbackRates[network] || 0);
        transaction.cashback = cashback;
        user.totalCashback += cashback;
        user.balance += cashback;
        
        await transaction.save();
        await user.save();
        
        res.json({ transaction, newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Verify Paystack payment
router.post('/verify', auth, async (req, res) => {
    try {
        const { reference, method, transaction_details } = req.body;
        
        // Verify with Paystack
        const paystackRes = await axios.get(
            `https://api.paystack.co/transaction/verify/${reference}`,
            { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
        );
        
        if (paystackRes.data.data.status !== 'success') {
            return res.status(400).json({ message: 'Payment verification failed' });
        }
        
        const transaction = await Transaction.create({
            user: req.user.id,
            ...transaction_details,
            reference,
            paymentMethod: 'paystack',
            status: 'success'
        });
        
        const user = await User.findById(req.user.id);
        user.totalSpent += transaction_details.amount;
        await user.save();
        
        res.json({ transaction, newBalance: user.balance });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;
