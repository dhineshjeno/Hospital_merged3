const walletRepository = require('./walletRepository');
const ApiError = require('../utils/ApiError');

exports.getBalance = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const wallet = await walletRepository.getWallet(req.hospitalId, patientId);
        
        if (!wallet) {
            return res.json({ success: true, data: { patient_id: patientId, balance: '0.00' } });
        }
        
        res.json({ success: true, data: wallet });
    } catch (err) {
        next(err);
    }
};

exports.credit = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { amount, reference, description } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
            throw ApiError.badRequest('Amount must be positive.');
        }

        const txn = await walletRepository.credit(req.hospitalId, patientId, amount, {
            reference,
            description,
            createdBy: req.user ? req.user.user_id : null
        });

        res.status(201).json({ success: true, data: txn });
    } catch (err) {
        next(err);
    }
};

exports.debit = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { amount, reference, description } = req.body;
        
        if (!amount || parseFloat(amount) <= 0) {
            throw ApiError.badRequest('Amount must be positive.');
        }

        const txn = await walletRepository.debit(req.hospitalId, patientId, amount, {
            reference,
            description,
            createdBy: req.user ? req.user.user_id : null
        });

        res.status(201).json({ success: true, data: txn });
    } catch (err) {
        if (err.code === 'INSUFFICIENT_BALANCE') {
            next(ApiError.conflict('Insufficient wallet balance for this debit.'));
        } else {
            next(err);
        }
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const { patientId } = req.params;
        const { page = 1, pageSize = 20 } = req.query;

        const history = await walletRepository.getHistory(req.hospitalId, patientId, parseInt(page), parseInt(pageSize));
        res.json({ success: true, data: history });
    } catch (err) {
        next(err);
    }
};
