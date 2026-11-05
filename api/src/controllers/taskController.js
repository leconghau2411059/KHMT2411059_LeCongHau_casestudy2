const Task = require('../models/Task');
const TaskActivity = require('../models/TaskActivity');
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const { ACTIVITY } = require('../utils/constants');
const { taskView, activityView } = require('../utils/serializers');

// GET /tasks?scope=&status=&priority=&q=&assigneeId=&sortBy=&order=&page=&limit=
async function list(req, res) {
  const query = req.valid;
  const filter = await taskService.buildListFilter(req.user._id, query);
  const tasks = await Task.find(filter).populate(taskService.POPULATE).lean();

  const sorted = taskService.sortTasks(tasks, query.sortBy, query.order);
  const start = (query.page - 1) * query.limit;
  const pageItems = sorted.slice(start, start + query.limit);

  const resolveAccess = await taskService.buildAccessResolver(pageItems, req.user._id);
  res.json({
    tasks: pageItems.map((t) => taskView(t, resolveAccess(t))),
    page: query.page,
    limit: query.limit,
    total: sorted.length,
  });
}

// POST /tasks
async function create(req, res) {
  const task = await Task.create({ ...req.valid, createdBy: req.user._id });
  await taskService.logActivity(task._id, req.user._id, ACTIVITY.CREATED, { title: task.title });
  res.status(201).json({
    message: 'Tạo công việc thành công',
    task: await taskService.presentTask(task._id, req.user._id),
  });
}

// GET /tasks/:id
async function get(req, res) {
  res.json({ task: await taskService.presentTask(req.task._id, req.user._id) });
}

// PUT /tasks/:id
async function update(req, res) {
  const { diff } = await taskService.applyChanges(req.task, req.valid, req.user._id);
  await notificationService.notifyTaskChanges(req.task, diff, req.user);
  res.json({
    message: 'Cập nhật công việc thành công',
    task: await taskService.presentTask(req.task._id, req.user._id),
  });
}

// PATCH /tasks/:id/status
async function updateStatus(req, res) {
  const { diff } = await taskService.applyChanges(req.task, { status: req.valid.status }, req.user._id);
  await notificationService.notifyTaskChanges(req.task, diff, req.user);
  res.json({
    message: 'Cập nhật trạng thái thành công',
    task: await taskService.presentTask(req.task._id, req.user._id),
  });
}

// DELETE /tasks/:id
async function remove(req, res) {
  await taskService.deleteTask(req.task);
  res.json({ message: 'Đã xóa công việc' });
}

// GET /tasks/:id/activities
async function activities(req, res) {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 100);
  const items = await TaskActivity.find({ taskId: req.task._id })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', taskService.USER_FIELDS)
    .lean();
  res.json({ activities: items.map(activityView) });
}

module.exports = { list, create, get, update, updateStatus, remove, activities };
