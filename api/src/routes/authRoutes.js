const express = require('express');
const controller = require('../controllers/authController');
const { authenticate } = require('../middleware/authMiddleware');
const { validate } = require('../middleware/validateMiddleware');
const validators = require('../validators/authValidator');

const router = express.Router();

router.post('/register', validate(validators.validateRegister), controller.register);
router.post('/login', validate(validators.validateLogin), controller.login);

router.get('/me', authenticate, controller.me);
router.put('/me', authenticate, validate(validators.validateUpdateProfile), controller.updateMe);
router.put(
  '/change-password',
  authenticate,
  validate(validators.validateChangePassword),
  controller.changePassword
);

module.exports = router;
