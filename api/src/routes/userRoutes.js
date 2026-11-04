const express = require('express');
const controller = require('../controllers/userController');
const { authenticate } = require('../middleware/authMiddleware');
const { validateObjectIdParams } = require('../middleware/validateMiddleware');

const router = express.Router();

router.use(authenticate);

// Đặt /search trước /:id để "search" không bị hiểu là một id.
router.get('/search', controller.search);
router.get('/:id', validateObjectIdParams('id'), controller.getById);

module.exports = router;
