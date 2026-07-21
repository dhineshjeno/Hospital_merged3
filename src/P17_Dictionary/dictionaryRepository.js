const { query } = require('../config/database');

/**
 * Calculates Levenshtein distance in SQL if needed, but we'll fetch and calculate in JS for safety 
 * unless the dataset is huge. For a dictionary, it's typically a few thousand.
 */

// Helper: Levenshtein distance in JS
function levenshtein(a, b) {
    const matrix = [];

    // Increment along the first column of each row
    let i;
    for (i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    // Increment each column in the first row
    let j;
    for (j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    // Fill in the rest of the matrix
    for (i = 1; i <= b.length; i++) {
        for (j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(
                        matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1 // deletion
                    )
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

class DictionaryRepository {
    async getDictionary(hospitalId, filters = {}) {
        let sql = 'SELECT * FROM medicines_dictionary WHERE hospital_id = $1';
        const params = [hospitalId];
        let paramCount = 2;

        if (filters.status) {
            sql += ` AND status = $${paramCount++}`;
            params.push(filters.status);
        }

        if (filters.q) {
            sql += ` AND (brand_name ILIKE $${paramCount} OR generic_name ILIKE $${paramCount})`;
            params.push(`%${filters.q}%`);
            paramCount++;
        }

        sql += ' ORDER BY brand_name ASC';
        
        const result = await query(sql, params);
        return result.rows;
    }

    async findDuplicates(hospitalId, brandName, genericName) {
        // Fetch all approved medicines to check similarity
        const result = await query(
            'SELECT * FROM medicines_dictionary WHERE hospital_id = $1 AND status != \'rejected\'',
            [hospitalId]
        );
        
        const allMedicines = result.rows;
        const potentialDuplicates = [];
        const threshold = 3; // Max levenshtein distance to flag

        for (const med of allMedicines) {
            const brandDist = levenshtein(med.brand_name.toLowerCase(), brandName.toLowerCase());
            const genericDist = levenshtein(med.generic_name.toLowerCase(), genericName.toLowerCase());

            // Check sound-alike heuristics or small distance
            if (brandDist <= threshold || genericDist <= threshold) {
                // Calculate percentage similarity
                const maxLength = Math.max(med.brand_name.length, brandName.length);
                const similarity = Math.round(((maxLength - brandDist) / maxLength) * 100);
                
                if (similarity >= 80) { // Flag if 80% or more similar
                    potentialDuplicates.push({
                        ...med,
                        similarity_score: similarity,
                        match_type: brandDist <= genericDist ? 'brand' : 'generic'
                    });
                }
            }
        }

        return potentialDuplicates.sort((a, b) => b.similarity_score - a.similarity_score);
    }

    async requestNewMedicine(hospitalId, data) {
        const sql = `
            INSERT INTO medicines_dictionary 
            (hospital_id, medicine_code, brand_name, generic_name, strength, manufacturer, hsn_code, status, requested_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
            RETURNING *
        `;
        const params = [
            hospitalId,
            data.medicine_code,
            data.brand_name,
            data.generic_name,
            data.strength,
            data.manufacturer,
            data.hsn_code,
            data.requested_by
        ];
        
        const result = await query(sql, params);
        return result.rows[0];
    }

    async approveMedicine(hospitalId, dictionaryId, adminId) {
        const sql = `
            UPDATE medicines_dictionary 
            SET status = 'approved', approved_by = $3, updated_at = now()
            WHERE hospital_id = $1 AND dictionary_id = $2
            RETURNING *
        `;
        const result = await query(sql, [hospitalId, dictionaryId, adminId]);
        return result.rows[0];
    }

    async rejectMedicine(hospitalId, dictionaryId, adminId) {
        const sql = `
            UPDATE medicines_dictionary 
            SET status = 'rejected', approved_by = $3, updated_at = now()
            WHERE hospital_id = $1 AND dictionary_id = $2
            RETURNING *
        `;
        const result = await query(sql, [hospitalId, dictionaryId, adminId]);
        return result.rows[0];
    }
}

module.exports = new DictionaryRepository();
