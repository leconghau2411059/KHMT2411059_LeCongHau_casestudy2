const express = require('express');
const controller = require('../controllers/emailLogController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateObjectIdParams } = require('../middleware/validateMiddleware');

const router = express.Router();
router.use(authenticate);

router.post('/:id/retry', validateObjectIdParams('id'), controller.retry);

module.exports = router;
