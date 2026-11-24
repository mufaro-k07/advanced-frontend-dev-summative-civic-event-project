import express from 'express';
import { body, query } from 'express-validator';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import validateBody from '../middlewares/validateBody.middleware.js';
import * as Controller from '../controllers/serviceRequests.controller.js';
import { SERVICE_TYPES } from '../utils/serviceTypes.js';

const router = express.Router();

const STATUSES = ['submitted', 'in_progress', 'resolved'];

// User routes
router.get('/types', authenticate, Controller.getTypes);

router.post(
    '/',
    authenticate,
    [
        body('service_type').isIn(SERVICE_TYPES).withMessage('Service type is not valid'),
        body('title').trim().notEmpty().withMessage('Title is required'),
        body('location').trim().notEmpty().withMessage('Location is required'),
        body('description').optional({ nullable: true }).isString().withMessage('Description must be text')
    ],
    validateBody,
    Controller.createRequest
);

router.get('/my', authenticate, Controller.getMyRequests);

// Admin routes
router.get(
    '/',
    authenticate,
    authorize(['admin']),
    [
        query('status').optional().isIn(STATUSES).withMessage('Status is not valid')
    ],
    validateBody,
    Controller.getAllRequests
);

router.patch(
    '/:id/status',
    authenticate,
    authorize(['admin']),
    [
        body('status').isIn(STATUSES).withMessage('Status must be submitted, in_progress or resolved')
    ],
    validateBody,
    Controller.updateStatus
);

export default router;
