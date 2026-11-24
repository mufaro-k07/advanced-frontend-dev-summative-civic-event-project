import db from '../config/db.js';

// Create a service request
export const create = async ({ user_id, service_type, title, location, description }) => {
    const res = await db.query(
        `INSERT INTO service_requests (user_id, service_type, title, location, description)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [user_id, service_type, title, location, description]
    );
    return res.rows[0];
};

// Get a user's own requests, newest first
export const findByUser = async (user_id) => {
    const res = await db.query(
        `SELECT *
         FROM service_requests
         WHERE user_id=$1
         ORDER BY created_at DESC`,
        [user_id]
    );
    return res.rows;
};

// Get all requests with the resident's name and email, optionally by status
export const findAll = async (status = null) => {
    const res = await db.query(
        `SELECT sr.*, u.full_name, u.email
         FROM service_requests sr
         JOIN users u ON sr.user_id = u.id
         WHERE $1::varchar IS NULL OR sr.status = $1
         ORDER BY sr.created_at DESC`,
        [status]
    );
    return res.rows;
};

// Find one request by ID
export const findById = async (id) => {
    const res = await db.query('SELECT * FROM service_requests WHERE id=$1', [id]);
    return res.rows[0] || null;
};

// Change the status of a request
export const updateStatus = async (id, status) => {
    const res = await db.query(
        `UPDATE service_requests
         SET status=$1, updated_at=NOW()
         WHERE id=$2
         RETURNING *`,
        [status, id]
    );
    return res.rows[0];
};
