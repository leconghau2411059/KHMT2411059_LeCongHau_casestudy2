const express = require('express');
const controller = require('../controllers/assignmentController');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');
const { validate, validateObjectIdParams } = require('../middleware/validateMiddleware');
const validators = require('../validators/assignmentValidator');

// Gắn dưới /tasks/:id/assignees (xác thực đã được taskRoutes thực hiện).
const router = express.Router({ mergeParams: true });
const ids = validateObjectIdParams('id', 'userId');

router.get('/', validateObjectIdParams('id'), requireTaskAccess('view'), controller.list);
router.post('/', validateObjectIdParams('id'), requireTaskAccess('manage'),
  validate(validators.validateAssign), controller.assign);
router.patch('/:userId', ids, requireTaskAccess('manage'),
  validate(validators.validateAssigneeUpdate), controller.update);
router.delete('/:userId', ids, requireTaskAccess('manage'), controller.remove);

module.exports = router;
