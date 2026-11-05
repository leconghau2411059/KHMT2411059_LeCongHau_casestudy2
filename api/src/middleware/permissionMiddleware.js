const AppError = require('../utils/AppError');
const Task = require('../models/Task');
const taskService = require('../services/taskService');

/**
 * Kiểm tra quyền của người dùng hiện tại trên công việc :id (kiểm tra ở backend, không chỉ ẩn nút).
 *   level: 'view' | 'edit' | 'delete' | 'manage'
 * Thành công: gắn req.task (document Mongoose) và req.access.
 * Người hoàn toàn không có quyền nhận 404 để không lộ việc công việc có tồn tại hay không.
 */
function requireTaskAccess(level) {
  return async (req, res, next) => {
    const task = await Task.findById(req.params.id);
    if (!task) throw new AppError(404, 'Không tìm thấy công việc');

    const access = await taskService.getAccess(task, req.user._id);
    if (!access.canView) throw new AppError(404, 'Không tìm thấy công việc');

    const allowed = {
      view: access.canView,
      edit: access.canEdit,
      delete: access.canDelete,
      manage: access.canManage,
    }[level];

    if (!allowed) {
      const message =
        level === 'edit'
          ? 'Bạn chỉ có quyền xem công việc này'
          : 'Chỉ người tạo công việc mới có quyền thực hiện thao tác này';
      throw new AppError(403, message);
    }

    req.task = task;
    req.access = access;
    next();
  };
}

module.exports = { requireTaskAccess };
