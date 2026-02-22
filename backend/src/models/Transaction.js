const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, enum: ['airtime', 'data', 'wallet_funding'], required: true },
    network: { type: String, enum: ['mtn', 'airtel', 'glo', '9mobile', null], default: null },
    phone: { type: String, default: null },
    amount: { type: Number, required: true },
    status: { type: String, enum: ['pending', 'success', 'failed'], default: 'pending' },
    reference: { type: String, unique: true, sparse: true },
    paymentMethod: { type: String, enum: ['paystack', 'wallet'], required: true },
    cashback: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
