const dictionaryRepository = require('./dictionaryRepository');
const ApiError = require('../utils/ApiError');

exports.getDictionary = async (req, res, next) => {
    try {
        const { status, q } = req.query;
        const dictionary = await dictionaryRepository.getDictionary(req.hospitalId, { status, q });
        res.json({ success: true, data: dictionary });
    } catch (err) {
        next(err);
    }
};

exports.requestNewMedicine = async (req, res, next) => {
    try {
        const { medicine_code, brand_name, generic_name, strength, manufacturer, hsn_code } = req.body;
        
        if (!medicine_code || !brand_name || !generic_name) {
            throw ApiError.badRequest('medicine_code, brand_name, and generic_name are required.');
        }

        // Check for duplicates
        const duplicates = await dictionaryRepository.findDuplicates(req.hospitalId, brand_name, generic_name);
        if (duplicates.length > 0 && !req.body.force) {
            return res.json({
                success: false,
                code: 'POSSIBLE_DUPLICATE',
                message: 'Possible duplicates found.',
                data: duplicates
            });
        }

        const newMedicine = await dictionaryRepository.requestNewMedicine(req.hospitalId, {
            ...req.body,
            requested_by: req.user ? req.user.user_id : null
        });

        res.status(201).json({ success: true, data: newMedicine });
    } catch (err) {
        if (err.code === '23505') {
            next(ApiError.conflict('Medicine code already exists in dictionary.'));
        } else {
            next(err);
        }
    }
};

exports.approveMedicine = async (req, res, next) => {
    try {
        const { id } = req.params;
        const approved = await dictionaryRepository.approveMedicine(req.hospitalId, id, req.user ? req.user.user_id : null);
        
        if (!approved) {
            throw ApiError.notFound('Medicine not found in dictionary or not pending.');
        }

        res.json({ success: true, data: approved });
    } catch (err) {
        next(err);
    }
};

exports.rejectMedicine = async (req, res, next) => {
    try {
        const { id } = req.params;
        const rejected = await dictionaryRepository.rejectMedicine(req.hospitalId, id, req.user ? req.user.user_id : null);
        
        if (!rejected) {
            throw ApiError.notFound('Medicine not found in dictionary or not pending.');
        }

        res.json({ success: true, data: rejected });
    } catch (err) {
        next(err);
    }
};
