const express = require('express');
const controller = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');
const { validate, validateObjectIdParams } = require('../middleware/validateMiddleware');
const validators = require('../validators/taskValidator');
const assignmentRoutes = require('./assignmentRoutes');
const emailLogController = require('../controllers/emailLogController');
const taskShareRoutes = require('./taskShareRoutes');

const router = express.Router();

router.use(authenticate);

router.get('/', validate(validators.validateListQuery, 'query'), controller.list);
router.post('/', validate(validators.validateCreateTask), controller.create);

const withId = validateObjectIdParams('id');

router.get('/:id', withId, requireTaskAccess('view'), controller.get);
router.put(
  '/:id',
  withId,
  requireTaskAccess('edit'),
  validate(validators.validateUpdateTask),
  controller.update
);
router.delete('/:id', withId, requireTaskAccess('delete'), controller.remove);
router.patch(
  '/:id/status',
  withId,
  requireTaskAccess('edit'),
  validate(validators.validateStatus),
  controller.updateStatus
);
router.get('/:id/activities', withId, requireTaskAccess('view'), controller.activities);

router.get('/:id/email-logs', withId, requireTaskAccess('manage'), emailLogController.listForTask);
router.use('/:id/assignees', assignmentRoutes);
router.use('/:id/shares', taskShareRoutes);

module.exports = router;
