const statistics = require('../services/statisticsService');

// GET /statistics/tasks
async function tasks(req, res) {
  const all = await statistics.loadAccessible(req.user._id);
  res.json({ statistics: statistics.summarizeTasks(all) });
}

// GET /statistics/assignments
async function assignments(req, res) {
  const all = await statistics.loadAccessible(req.user._id);
  res.json({ statistics: statistics.summarizeAssignments(all, req.user._id) });
}

// GET /statistics/deadlines?days=7
async function deadlines(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 7, 1), 60);
  const all = await statistics.loadAccessible(req.user._id, true);
  const { overdue, upcoming } = statistics.splitDeadlines(all, new Date(), days);
  const LIMIT = 20;
  res.json({
    days,
    overdueCount: overdue.length,
    upcomingCount: upcoming.length,
    overdue: await statistics.presentList(overdue.slice(0, LIMIT), req.user._id),
    upcoming: await statistics.presentList(upcoming.slice(0, LIMIT), req.user._id),
  });
}

module.exports = { tasks, assignments, deadlines };
