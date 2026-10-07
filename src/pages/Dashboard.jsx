import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import { formatReadableDate } from '../services/scheduler';

export function Dashboard() {
  const { courses, assignments, exams, studyPlan, insights, toggleSessionCompleted } = useApp();

  const completedAssignmentsCount = assignments.filter((a) => a.completed).length;
  const pendingAssignments = assignments.filter((a) => !a.completed);

  // Filter exams that are in the future or today
  const upcomingExams = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return exams
      .filter((exam) => {
        if (!exam.date) return false;
        const examDate = new Date(`${exam.date}T23:59:59`);
        return examDate >= today;
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [exams]);

  // Tasks due within 7 days
  const tasksDueSoon = useMemo(() => {
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    return pendingAssignments
      .filter((a) => {
        if (!a.dueDate) return false;
        const due = new Date(`${a.dueDate}T23:59:59`);
        return due >= now && due <= weekFromNow;
      })
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  }, [pendingAssignments]);

  // Study plan stats
  const taskSessions = useMemo(
    () => studyPlan.filter((s) => s.type !== 'Break'),
    [studyPlan]
  );
  const completedSessionsCount = taskSessions.filter((s) => s.completed).length;
  const totalPlannedHours = useMemo(() => {
    const totalMinutes = taskSessions.reduce((sum, s) => sum + Number(s.sessionLength || 0), 0);
    return (totalMinutes / 60).toFixed(1);
  }, [taskSessions]);

  const studyProgressPercent =
    taskSessions.length === 0 ? 0 : Math.round((completedSessionsCount / taskSessions.length) * 100);

  // Next recommended study session
  const nextSession = useMemo(() => {
    const uncompleted = taskSessions.filter((s) => !s.completed);
    return uncompleted[0] || null;
  }, [taskSessions]);

  // Workload breakdown by course
  const courseWorkloadBreakdown = useMemo(() => {
    const breakdown = {};
    courses.forEach((c) => {
      breakdown[c.name] = { course: c, assignments: 0, exams: 0, estimatedHours: 0 };
    });

    pendingAssignments.forEach((a) => {
      const cName = a.course || 'General';
      if (!breakdown[cName]) {
        breakdown[cName] = { course: { name: cName, color: '#38bdf8' }, assignments: 0, exams: 0, estimatedHours: 0 };
      }
      breakdown[cName].assignments += 1;
      breakdown[cName].estimatedHours += Number(a.estimatedWorkload || 3);
    });

    upcomingExams.forEach((e) => {
      const cName = e.course || 'General';
      if (!breakdown[cName]) {
        breakdown[cName] = { course: { name: cName, color: '#818cf8' }, assignments: 0, exams: 0, estimatedHours: 0 };
      }
      breakdown[cName].exams += 1;
      breakdown[cName].estimatedHours += Number(e.estimatedWorkload || 5);
    });

    return Object.values(breakdown).filter((b) => b.assignments > 0 || b.exams > 0);
  }, [courses, pendingAssignments, upcomingExams]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Academic Dashboard</h1>
          <p className="page-subtitle">
            Welcome back! Here is your workload, upcoming milestones, and schedule progress.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/study-planner" className="btn btn-primary">
            <span>✨</span> Open Study Planner
          </Link>
        </div>
      </div>

      {/* Top Stat Cards Grid */}
      <section className="stats-grid" aria-label="Key Academic Metrics">
        <div className="stat-card">
          <div className="stat-icon-wrapper icon-blue" aria-hidden="true">📚</div>
          <div className="stat-content">
            <span className="stat-label">Active Courses</span>
            <div className="stat-value">{courses.length}</div>
            <span className="stat-subtext">
              {courses.length === 1 ? '1 course registered' : `${courses.length} courses registered`}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper icon-amber" aria-hidden="true">📝</div>
          <div className="stat-content">
            <span className="stat-label">Pending Assignments</span>
            <div className="stat-value">{pendingAssignments.length}</div>
            <span className="stat-subtext">
              {completedAssignmentsCount} completed so far
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper icon-purple" aria-hidden="true">📅</div>
          <div className="stat-content">
            <span className="stat-label">Upcoming Exams</span>
            <div className="stat-value">{upcomingExams.length}</div>
            <span className="stat-subtext">
              {upcomingExams.length > 0 ? `Next: ${upcomingExams[0].date}` : 'No upcoming exams'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper icon-cyan" aria-hidden="true">⏱️</div>
          <div className="stat-content">
            <span className="stat-label">Planned Study Hours</span>
            <div className="stat-value">{totalPlannedHours}h</div>
            <span className="stat-subtext">
              {taskSessions.length} total sessions in plan
            </span>
          </div>
        </div>
      </section>

      {/* Next Recommended Session Spotlight */}
      {nextSession ? (
        <section className="spotlight-card" aria-label="Next Recommended Study Session">
          <div className="spotlight-header">
            <div className="spotlight-badge">
              <span className="pulse-dot" /> NEXT RECOMMENDED SESSION
            </div>
            <span className="spotlight-timing">
              {formatReadableDate(nextSession.date)} • {nextSession.startTime} - {nextSession.endTime} ({nextSession.sessionLength}m)
            </span>
          </div>

          <div className="spotlight-body">
            <div className="spotlight-info">
              <h2 className="spotlight-title">{nextSession.title}</h2>
              <div className="spotlight-meta">
                <span className="course-tag" style={{ borderColor: nextSession.courseColor }}>
                  {nextSession.course}
                </span>
                <Badge variant={nextSession.priority}>{nextSession.priority} Priority</Badge>
                <Badge variant={nextSession.difficulty}>{nextSession.difficulty} Difficulty</Badge>
              </div>
              <p className="spotlight-recommendation">{nextSession.recommendation}</p>
            </div>

            <div className="spotlight-action">
              <button
                type="button"
                className="btn btn-success"
                onClick={() => toggleSessionCompleted(nextSession.id)}
              >
                Mark as Completed ✓
              </button>
            </div>
          </div>
        </section>
      ) : (
        <section className="spotlight-empty">
          <div className="spotlight-empty-content">
            <span className="empty-icon" aria-hidden="true">💡</span>
            <div>
              <h3>No study session currently queued</h3>
              <p>
                {courses.length === 0
                  ? 'Get started by adding your semester courses and pending tasks!'
                  : 'Configure your weekly availability in the Smart Planner to generate an optimized study plan.'}
              </p>
            </div>
          </div>
          <Link to="/study-planner" className="btn btn-secondary">
            Go to Planner
          </Link>
        </section>
      )}

      {/* Main Grid: Study Progress & Due Soon */}
      <div className="dashboard-grid">
        {/* Left Column: Progress & Workload */}
        <div className="dashboard-column">
          <section className="card card-section" aria-label="Study Plan Progress">
            <div className="card-section-header">
              <h2 className="card-section-title">Study Plan Execution</h2>
              <span className="progress-badge">{studyProgressPercent}% Completed</span>
            </div>

            <div className="progress-container">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-cyan"
                  style={{ width: `${studyProgressPercent}%` }}
                  role="progressbar"
                  aria-valuenow={studyProgressPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                />
              </div>
              <div className="progress-subtext">
                <span>{completedSessionsCount} of {taskSessions.length} sessions completed</span>
                {insights?.hasImpossibleSchedule && (
                  <span className="text-warning">⚠ Schedule overload detected</span>
                )}
              </div>
            </div>

            {insights?.unscheduledTasks?.length > 0 && (
              <div className="warning-callout">
                <strong>Schedule Warning:</strong> {insights.unscheduledTasks.length} task(s) could not fully fit before their deadlines. Consider adding more study slots.
              </div>
            )}
          </section>

          {/* Workload Breakdown */}
          <section className="card card-section" aria-label="Course Workload Overview">
            <div className="card-section-header">
              <h2 className="card-section-title">Course Workload Overview</h2>
              <span className="badge-neutral">{courseWorkloadBreakdown.length} active courses</span>
            </div>

            {courseWorkloadBreakdown.length === 0 ? (
              <div className="empty-placeholder">
                <p>No active assignments or exams to calculate workload from.</p>
                <Link to="/assignments" className="btn btn-xs btn-outline">Add an Assignment</Link>
              </div>
            ) : (
              <div className="workload-list">
                {courseWorkloadBreakdown.map((item) => (
                  <div key={item.course.name} className="workload-item">
                    <div className="workload-info">
                      <strong className="workload-course-name">{item.course.name}</strong>
                      <span className="workload-counts">
                        {item.assignments} assignment(s) • {item.exams} exam(s)
                      </span>
                    </div>
                    <div className="workload-hours">
                      <span className="hours-value">~{item.estimatedHours}h</span>
                      <span className="hours-label">est. workload</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Due Soon & Upcoming Exams */}
        <div className="dashboard-column">
          {/* Urgent Deadlines */}
          <section className="card card-section" aria-label="Tasks Due Soon">
            <div className="card-section-header">
              <h2 className="card-section-title">Due in the Next 7 Days</h2>
              <Link to="/assignments" className="section-link">View all →</Link>
            </div>

            {tasksDueSoon.length === 0 ? (
              <div className="empty-placeholder">
                <span>🎉</span>
                <p>No assignments due in the next 7 days. You are ahead of schedule!</p>
              </div>
            ) : (
              <div className="task-feed">
                {tasksDueSoon.map((task) => (
                  <div key={task.id} className="feed-item">
                    <div className="feed-item-left">
                      <div className="feed-title">{task.title}</div>
                      <div className="feed-meta">
                        <span className="feed-course">{task.course}</span>
                        <span>•</span>
                        <span className="feed-date">Due: {task.dueDate}</span>
                      </div>
                    </div>
                    <Badge variant={task.priority}>{task.priority}</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Upcoming Exams */}
          <section className="card card-section" aria-label="Upcoming Exams">
            <div className="card-section-header">
              <h2 className="card-section-title">Upcoming Exams</h2>
              <Link to="/exams" className="section-link">Manage exams →</Link>
            </div>

            {upcomingExams.length === 0 ? (
              <div className="empty-placeholder">
                <p>No upcoming exams scheduled.</p>
                <Link to="/exams" className="btn btn-xs btn-outline">Schedule an Exam</Link>
              </div>
            ) : (
              <div className="task-feed">
                {upcomingExams.map((exam) => (
                  <div key={exam.id} className="feed-item">
                    <div className="feed-item-left">
                      <div className="feed-title">{exam.title}</div>
                      <div className="feed-meta">
                        <span className="feed-course">{exam.course}</span>
                        <span>•</span>
                        <span className="feed-date">{exam.date}</span>
                        {exam.location && <span>• {exam.location}</span>}
                      </div>
                    </div>
                    <Badge variant="exam">Exam</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;