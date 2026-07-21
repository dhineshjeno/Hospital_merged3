const purchaseRepository = require('./purchaseRepository');
const ApiError = require('../utils/ApiError');

exports.createPurchase = async (req, res, next) => {
    try {
        const { supplier_id, invoice_no, purchase_date, items } = req.body;
        
        if (!supplier_id || !invoice_no || !purchase_date || !items || items.length === 0) {
            throw ApiError.badRequest('Missing required purchase fields or items');
        }

        const purchase = await purchaseRepository.createPurchase(
            req.hospitalId, 
            req.user ? req.user.user_id : null, 
            req.body
        );

        res.status(201).json({ success: true, data: purchase });
    } catch (err) {
        if (err.code === '23505') {
            if (err.constraint === 'purchases_hospital_id_supplier_id_invoice_no_key') {
                next(ApiError.conflict('Duplicate supplier invoice.'));
            } else if (err.constraint === 'purchase_items_hospital_id_medicine_code_batch_no_expiry__key') {
                next(ApiError.conflict('Duplicate batch entry for same medicine.'));
            } else {
                next(ApiError.conflict('Duplicate entry detected.'));
            }
        } else {
            next(err);
        }
    }
};

exports.getPendingApprovals = async (req, res, next) => {
    try {
        const approvals = await purchaseRepository.getPendingApprovals(req.hospitalId);
        res.json({ success: true, data: approvals });
    } catch (err) {
        next(err);
    }
};

exports.reviewApproval = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        
        if (!['approved', 'rejected'].includes(status)) {
            throw ApiError.badRequest('Invalid status');
        }

        await purchaseRepository.reviewApproval(
            req.hospitalId, 
            id, 
            req.user ? req.user.user_id : null, 
            { status, reason }
        );

        res.json({ success: true, message: 'Approval reviewed successfully' });
    } catch (err) {
        if (err.message === 'Approval not found or already processed') {
            next(ApiError.notFound(err.message));
        } else {
            next(err);
        }
    }
};
