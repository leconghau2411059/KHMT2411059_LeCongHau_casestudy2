const express = require('express');
const controller = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateObjectIdParams } = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(authenticate);

router.get('/', controller.list);
router.get('/unread-count', controller.unreadCount);
router.patch('/read-all', controller.markAllRead);
router.patch('/:id/read', validateObjectIdParams('id'), controller.markRead);

module.exports = router;
