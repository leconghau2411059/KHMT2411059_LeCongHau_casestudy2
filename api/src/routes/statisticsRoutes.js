const express = require('express');
const controller = require('../controllers/statisticsController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authenticate);

router.get('/tasks', controller.tasks);
router.get('/assignments', controller.assignments);
router.get('/deadlines', controller.deadlines);

module.exports = router;
