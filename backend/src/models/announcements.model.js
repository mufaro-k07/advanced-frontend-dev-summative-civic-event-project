import db from '../config/db.js';

export const findAll = async (filters = {}) => {
    const { page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;
    const res = await db.query(
        'SELECT * FROM announcements ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
    );
    return res.rows;
};

export const findById = async (id) => {
    const res = await db.query('SELECT * FROM announcements WHERE id=$1', [id]);
    return res.rows[0];
};

export const create = async (data) => {
    const { title, audio_url, published = true, transcript = null } = data;

    // An empty transcript is saved as null, so "no transcript" always looks the same
    const res = await db.query(
        `INSERT INTO announcements (title, audio_url, published, transcript)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [title, audio_url, published, transcript || null]
    );

    return res.rows[0];
};

export const update = async (id, data) => {
    const existing = await findById(id);
    if (!existing) {
        throw Object.assign(new Error('Announcement not found'), { status: 404 });
    }

    // If transcript isn't sent, the existing one is kept by this spread
    const updated = { ...existing, ...data };

    const res = await db.query(
        `UPDATE announcements
         SET title = $1,
             audio_url = $2,
             published = $3,
             transcript = $4,
             updated_at = NOW()
         WHERE id = $5
         RETURNING *`,
        [updated.title, updated.audio_url, updated.published, updated.transcript || null, id]
    );

    return res.rows[0];
};

export const remove = async (id) => {
    const existing = await findById(id);
    if (!existing) throw Object.assign(new Error('Announcement not found'), { status: 404 });
    await db.query('DELETE FROM announcements WHERE id=$1', [id]);
};

export const publish = async (id) => {
    const existing = await findById(id);
    if (!existing) {
        throw Object.assign(new Error('Announcement not found'), { status: 404 });
    }

    const res = await db.query(
        `UPDATE announcements
         SET published = true,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return res.rows[0];
};

export const unpublish = async (id) => {
    const existing = await findById(id);
    if (!existing) {
        throw Object.assign(new Error('Announcement not found'), { status: 404 });
    }

    const res = await db.query(
        `UPDATE announcements
         SET published = false,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
    );

    return res.rows[0];
};
