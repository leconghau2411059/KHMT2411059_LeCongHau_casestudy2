const express = require('express');
const controller = require('../controllers/taskShareController');
const { requireTaskAccess } = require('../middleware/permissionMiddleware');
const { validate, validateObjectIdParams } = require('../middleware/validateMiddleware');
const validators = require('../validators/assignmentValidator');

// Gắn dưới /tasks/:id/shares – chỉ người tạo công việc được quản lý chia sẻ.
const router = express.Router({ mergeParams: true });
const ids = validateObjectIdParams('id', 'shareId');

router.get('/', validateObjectIdParams('id'), requireTaskAccess('manage'), controller.list);
router.post('/', validateObjectIdParams('id'), requireTaskAccess('manage'),
  validate(validators.validateShare), controller.create);
router.patch('/:shareId', ids, requireTaskAccess('manage'),
  validate(validators.validateShareUpdate), controller.update);
router.delete('/:shareId', ids, requireTaskAccess('manage'), controller.remove);

module.exports = router;
