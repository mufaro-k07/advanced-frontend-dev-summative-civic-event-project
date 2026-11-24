import * as ServiceRequests from '../models/serviceRequests.model.js';
import * as Notifications from '../models/notifications.model.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

// Friendly names for the notification message
const STATUS_LABELS = {
    submitted: 'Submitted',
    in_progress: 'In progress',
    resolved: 'Resolved'
};

export const getTypes = async (req, res, next) => {
    try {
        res.status(200).json({ status: 200, data: SERVICE_TYPES });
    } catch (err) {
        next(err);
    }
};

export const createRequest = async (req, res, next) => {
    try {
        const user_id = req.user.id;
        const { service_type, title, location, description } = req.body;

        const request = await ServiceRequests.create({
            user_id,
            service_type,
            title,
            location,
            description: description || null
        });
        res.status(201).json({ status: 201, message: 'Service request submitted', data: request });
    } catch (err) {
        next(err);
    }
};

export const getMyRequests = async (req, res, next) => {
    try {
        const requests = await ServiceRequests.findByUser(req.user.id);
        res.status(200).json({ status: 200, data: requests });
    } catch (err) {
        next(err);
    }
};

export const getAllRequests = async (req, res, next) => {
    try {
        const { status } = req.query;
        const requests = await ServiceRequests.findAll(status || null);
        res.status(200).json({ status: 200, data: requests });
    } catch (err) {
        next(err);
    }
};

export const updateStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const request = await ServiceRequests.findById(id);
        if (!request) return res.status(404).json({ status: 404, message: 'Service request not found' });

        const updated = await ServiceRequests.updateStatus(id, status);

        // Let the resident know, only them (not a broadcast)
        await Notifications.create({
            title: 'Update on your service request',
            message: `'${updated.title}' is now ${STATUS_LABELS[status]}.`,
            type: 'service',
            recipient_id: updated.user_id,
            metadata: { service_request_id: updated.id },
            created_by: req.user.id
        });

        res.status(200).json({ status: 200, message: 'Status updated', data: updated });
    } catch (err) {
        next(err);
    }
};
