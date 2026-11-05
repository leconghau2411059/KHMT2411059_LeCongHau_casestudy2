const express = require('express');
const controller = require('../controllers/taskController');
const { authenticate } = require('../middleware/authMiddleware');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');
const { validate, validateObjectIdParams } = require('../middleware/validateMiddleware');
const validators = require('../validators/taskValidator');

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

module.exports = router;
