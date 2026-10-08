import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import { formatReadableDate } from '../services/scheduler';
import { calculateCourseReadiness } from '../services/coach';

export function Dashboard() {
  const {
    courses,
    assignments,
    exams,
    studyPlan,
    insights,
    studentProfile,
    syllabusTopics = [],
    checkIns = [],
    adaptiveSignals,
    emergencyExamMode,
    toggleEmergencyExamMode,
    toggleSessionCompleted,
    openCheckInModal,
    loadScenario,
  } = useApp();

  const completedAssignmentsCount = assignments.filter((a) => a.completed).length;
  const pendingAssignments = assignments.filter((a) => !a.completed);

  // Filter exams in the future or today
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

  // "What should I do today?" Daily Agenda
  // Filter sessions for today's date (or next scheduled day if today is empty)
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const todaySessions = useMemo(() => {
    const forToday = taskSessions.filter((s) => s.date === todayDateStr);
    if (forToday.length > 0) return forToday;

    // Fallback: next upcoming day's sessions
    const sortedFuture = [...taskSessions]
      .filter((s) => !s.completed)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    if (sortedFuture.length === 0) return [];
    const firstDate = sortedFuture[0].date;
    return sortedFuture.filter((s) => s.date === firstDate);
  }, [taskSessions, todayDateStr]);

  const todayDateLabel = useMemo(() => {
    if (todaySessions.length === 0) return 'Today';
    if (todaySessions[0].date === todayDateStr) return 'Today';
    return formatReadableDate(todaySessions[0].date);
  }, [todaySessions, todayDateStr]);

  // Course Readiness calculated for each course
  const courseReadinessList = useMemo(() => {
    return courses.map((course) =>
      calculateCourseReadiness(course, syllabusTopics, assignments, exams)
    );
  }, [courses, syllabusTopics, assignments, exams]);

  // Most urgent course (lowest readiness score or nearest exam)
  const mostUrgentCourse = useMemo(() => {
    if (courseReadinessList.length === 0) return null;
    const sorted = [...courseReadinessList].sort((a, b) => {
      // Prioritize courses with exams within 7 days
      if (a.hasExamUrgency && !b.hasExamUrgency) return -1;
      if (!a.hasExamUrgency && b.hasExamUrgency) return 1;
      return a.readinessScore - b.readinessScore;
    });
    return sorted[0];
  }, [courseReadinessList]);

  // Outstanding topics across all courses (unstarted or low confidence)
  const outstandingTopics = useMemo(() => {
    return syllabusTopics
      .filter((t) => t.status === 'not_started' || (t.confidence && t.confidence <= 2))
      .slice(0, 5);
  }, [syllabusTopics]);

  // Has check-in been completed recently?
  const hasRecentCheckIn = useMemo(() => {
    if (!checkIns || checkIns.length === 0) return false;
    const last = checkIns[checkIns.length - 1];
    if (!last?.date) return false;
    const diffDays = (new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24);
    return diffDays < 5;
  }, [checkIns]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div className="planner-flagship-pill">Adaptive Academic Coach</div>
          <h1 className="page-title">Academic Dashboard</h1>
          <p className="page-subtitle">
            Welcome back{studentProfile?.name ? `, ${studentProfile.name}` : ''}! Workload monitoring, observable readiness, and adaptive daily guidance.
          </p>
        </div>
        <div className="header-actions">
          <Link to="/syllabus-import" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📑</span> Import Syllabus
          </Link>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={openCheckInModal}
          >
            <span>🧭</span> Take Weekly Check-In
          </button>
          <Link to="/study-planner" className="btn btn-primary">
            <span>✨</span> Open Adaptive Planner
          </Link>
        </div>
      </div>

      {/* Adaptive Coach Guidance Banner */}
      <section className="coach-status-banner" aria-label="Academic Coach Status">
        <div className="coach-banner-left">
          <div className="coach-avatar-badge">🧠</div>
          <div>
            <div className="coach-banner-title">
              <strong>Personal Coach Status:</strong>{' '}
              {adaptiveSignals?.paceMultiplier > 1.1 ? (
                <span className="coach-buffer-tag">
                  +{Math.round((adaptiveSignals.paceMultiplier - 1) * 100)}% Buffer Pace Active
                </span>
              ) : (
                <span className="coach-normal-tag">Balanced Realistic Pace</span>
              )}
            </div>
            <p className="coach-banner-description">
              {adaptiveSignals?.paceMultiplier > 1.1
                ? 'Based on recent check-ins, we added breathing room buffer to study session durations so you stay on track without burnout.'
                : 'Your study plan is running at standard calibrated pace with high consistency.'}
            </p>
          </div>
        </div>

        <div className="coach-banner-actions">
          <div className="persona-switch-group">
            <span className="persona-switch-label">Simulate Student:</span>
            <button
              type="button"
              className={`btn btn-xs ${studentProfile?.name?.includes('Alex') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadScenario('consistent')}
              title="Simulate Student A: Alex Chen (Consistent, On-Track)"
            >
              🟢 Alex (Consistent)
            </button>
            <button
              type="button"
              className={`btn btn-xs ${studentProfile?.name?.includes('Jordan') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadScenario('delayed')}
              title="Simulate Student B: Jordan Taylor (Delayed, Catch-Up)"
            >
              🟠 Jordan (Delayed)
            </button>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${emergencyExamMode ? 'btn-danger' : 'btn-outline'}`}
            onClick={toggleEmergencyExamMode}
            title="Focus schedule heavily on upcoming exams"
          >
            {emergencyExamMode ? '🚨 Emergency Exam Mode ON' : '⚡ Enable Emergency Exam Mode'}
          </button>
        </div>
      </section>

      {/* Weekly Check-In Reminder Banner */}
      {!hasRecentCheckIn && (
        <section className="checkin-reminder-banner" aria-label="Weekly Check-In Due">
          <div className="checkin-banner-content">
            <span className="checkin-banner-icon" aria-hidden="true">⏱️</span>
            <div>
              <h3>Weekly Academic Check-In Ready</h3>
              <p>
                Takes approximately 2 minutes. Reflect on lectures attended, readings completed, and topic confidence so your coach can adapt your schedule.
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={openCheckInModal}
          >
            Start 2-Min Check-In →
          </button>
        </section>
      )}

      {/* Top Stat Cards Grid */}
      <section className="stats-grid" aria-label="Key Academic Metrics">
        <div className="stat-card">
          <div className="stat-icon-wrapper icon-blue" aria-hidden="true">📚</div>
          <div className="stat-content">
            <span className="stat-label">Active Courses</span>
            <div className="stat-value">{courses.length}</div>
            <span className="stat-subtext">
              {syllabusTopics.length} syllabus topics tracked
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
            <span className="stat-label">Next Exam</span>
            <div className="stat-value">
              {upcomingExams.length > 0 ? upcomingExams[0].course : 'None'}
            </div>
            <span className="stat-subtext">
              {upcomingExams.length > 0 ? `${upcomingExams[0].date}` : 'No upcoming exams'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper icon-cyan" aria-hidden="true">🎯</div>
          <div className="stat-content">
            <span className="stat-label">Urgent Course</span>
            <div className="stat-value">
              {mostUrgentCourse ? mostUrgentCourse.courseName : 'None'}
            </div>
            <span className="stat-subtext">
              {mostUrgentCourse
                ? `${mostUrgentCourse.readinessScore}% readiness (${mostUrgentCourse.tier})`
                : 'All courses balanced'}
            </span>
          </div>
        </div>
      </section>

      {/* "What Should I Do Today?" Daily Agenda Section */}
      <section className="card card-section daily-agenda-section" aria-label="What Should I Do Today">
        <div className="card-section-header">
          <div>
            <div className="section-pill">Actionable Daily Plan</div>
            <h2 className="card-section-title">What Should I Do {todayDateLabel}?</h2>
            <p className="card-section-subtitle">
              Prioritized, concrete micro-steps generated by your coach. No vague instructions.
            </p>
          </div>
          <span className="badge-neutral">{todaySessions.length} session(s) scheduled</span>
        </div>

        {todaySessions.length === 0 ? (
          <div className="empty-placeholder">
            <span>🎉</span>
            <h3>No study session currently queued</h3>
            <p>No study sessions scheduled for {todayDateLabel.toLowerCase()}.</p>
            <p className="subtext">
              Take time to recharge, or open the Adaptive Planner to generate your next study block.
            </p>
            <Link to="/study-planner" className="btn btn-secondary btn-sm" style={{ marginTop: '10px' }}>
              Open Adaptive Planner
            </Link>
          </div>
        ) : (
          <div className="daily-agenda-list">
            {todaySessions.map((session) => (
              <div
                key={session.id}
                className={`daily-agenda-card ${session.completed ? 'session-completed' : ''}`}
                style={{ borderLeftColor: session.courseColor || '#0284c7' }}
              >
                <div className="agenda-card-top">
                  <div className="agenda-time-pill">
                    <strong>{session.startTime} – {session.endTime}</strong>
                    <span>({session.sessionLength} min)</span>
                  </div>

                  <div className="agenda-course-info">
                    <h3 className="agenda-task-title">{session.title}</h3>
                    <div className="agenda-tag-row">
                      <span className="course-tag" style={{ borderColor: session.courseColor }}>
                        {session.course}
                      </span>
                      <Badge variant={session.priority}>{session.priority} Priority</Badge>
                      <Badge variant={session.difficulty}>{session.difficulty} Difficulty</Badge>
                    </div>
                  </div>

                  <div className="agenda-action-col">
                    <button
                      type="button"
                      className={`btn btn-sm ${session.completed ? 'btn-secondary' : 'btn-success'}`}
                      onClick={() => toggleSessionCompleted(session.id)}
                    >
                      {session.completed ? 'Undo ✓' : 'Mark Completed ✓'}
                    </button>
                  </div>
                </div>

                <p className="agenda-recommendation">{session.recommendation}</p>

                {/* Granular Concrete Micro-Steps */}
                {session.actionBreakdown && session.actionBreakdown.length > 0 && (
                  <div className="action-breakdown-box">
                    <div className="breakdown-header">
                      <span className="breakdown-icon">📋</span>
                      <strong>Concrete Session Action Plan:</strong>
                    </div>
                    <ol className="action-steps-list">
                      {session.actionBreakdown.map((step) => (
                        <li key={step.step} className="action-step-item">
                          <span className="step-num">{step.step}.</span>
                          <span className="step-text">{step.action}</span>
                          <span className="step-time">({step.duration} min)</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Main Grid: Transparent Course Readiness & Deadlines */}
      <div className="dashboard-grid">
        {/* Left Column: Course Readiness Meters */}
        <div className="dashboard-column">
          <section className="card card-section" aria-label="Course Academic Readiness">
            <div className="card-section-header">
              <div>
                <h2 className="card-section-title">Observable Course Readiness</h2>
                <p className="card-section-subtitle">
                  Calculated from topic coverage, homework completion, and self-reported confidence.
                </p>
              </div>
              <Link to="/courses" className="section-link">Manage Syllabus →</Link>
            </div>

            {/* Transparent Disclaimer Box */}
            <div className="readiness-disclaimer-card">
              <span className="disclaimer-icon" aria-hidden="true">ℹ️</span>
              <p>
                <strong>Transparent Readiness Indicator:</strong> This score reflects your documented progress through syllabus topics and homework tasks. It is an organizational coaching metric, never a scientifically validated probability of passing an exam.
              </p>
            </div>

            {courseReadinessList.length === 0 ? (
              <div className="empty-placeholder">
                <p>No courses registered yet. Add courses and syllabus topics to see your readiness.</p>
                <Link to="/courses" className="btn btn-xs btn-outline">Add Courses</Link>
              </div>
            ) : (
              <div className="readiness-cards-list">
                {courseReadinessList.map((cr) => (
                  <div key={cr.courseId || cr.courseName} className="readiness-card">
                    <div className="readiness-top-row">
                      <div>
                        <strong className="readiness-course-name">{cr.courseName}</strong>
                        {cr.hasExamUrgency && (
                          <span className="exam-urgency-tag">
                            ⚠️ Exam in {cr.daysToNearestExam} days
                          </span>
                        )}
                      </div>
                      <div className="readiness-score-badge" style={{ backgroundColor: `${cr.tierColor}20`, color: cr.tierColor }}>
                        {cr.readinessScore}% ({cr.tier})
                      </div>
                    </div>

                    <div className="progress-bar-track">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${cr.readinessScore}%`,
                          backgroundColor: cr.tierColor,
                        }}
                        role="progressbar"
                        aria-valuenow={cr.readinessScore}
                        aria-valuemin="0"
                        aria-valuemax="100"
                      />
                    </div>

                    <div className="readiness-metrics-row">
                      <span>📖 Topics: {cr.topicProgress.completed}/{cr.topicProgress.total}</span>
                      <span>•</span>
                      <span>📝 Tasks: {cr.assignmentProgress.completed}/{cr.assignmentProgress.total}</span>
                      <span>•</span>
                      <span>⭐ Confidence: {cr.avgConfidence}/5</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Outstanding Topics Card */}
          <section className="card card-section" aria-label="Outstanding Topics">
            <div className="card-section-header">
              <h2 className="card-section-title">Outstanding Syllabus Topics</h2>
              <span className="badge-neutral">{outstandingTopics.length} need focus</span>
            </div>

            {outstandingTopics.length === 0 ? (
              <div className="empty-placeholder">
                <p>All syllabus topics are currently practiced or have good confidence! 🌟</p>
              </div>
            ) : (
              <div className="outstanding-topics-list">
                {outstandingTopics.map((top) => (
                  <div key={top.id} className="outstanding-topic-item">
                    <div>
                      <div className="outstanding-title">{top.title}</div>
                      <div className="outstanding-meta">
                        <span className="topic-course-badge">{top.courseName}</span>
                        <span>• Week {top.weekNumber || top.week}</span>
                        <span>• Status: {top.status === 'not_started' ? 'Not Started' : top.status}</span>
                      </div>
                    </div>
                    <Link to="/courses" className="btn btn-xs btn-outline">
                      Update →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Deadlines & Upcoming Exams */}
        <div className="dashboard-column">
          {/* Due Soon */}
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

          {/* Study Plan Progress Summary */}
          <section className="card card-section" aria-label="Study Plan Progress">
            <div className="card-section-header">
              <h2 className="card-section-title">Weekly Study Plan Execution</h2>
              <span className="progress-badge">{studyProgressPercent}% Done</span>
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
                <span>{completedSessionsCount} of {taskSessions.length} sessions completed ({totalPlannedHours}h total)</span>
              </div>
            </div>

            {insights?.hasImpossibleSchedule && (
              <div className="warning-callout" style={{ marginTop: '12px' }}>
                <strong>Overload Notice:</strong> Total estimated workload exceeds available study hours prior to deadlines. Add more availability windows.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;