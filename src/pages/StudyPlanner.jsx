import { useState, useMemo } from 'react';
import { useApp } from '../context/useApp';
import { Badge } from '../components/Badge';
import {
  DAY_START_MINUTES,
  NIGHT_START_MINUTES,
  timeToMinutes,
  formatReadableDate,
} from '../services/scheduler';

export function StudyPlanner() {
  const {
    availability,
    studyPlan,
    insights,
    adaptiveSignals,
    emergencyExamMode,
    toggleEmergencyExamMode,
    addAvailability,
    deleteAvailability,
    generatePlan,
    toggleSessionCompleted,
    clearPlan,
  } = useApp();

  // Availability form state
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('13:00');
  const [endTime, setEndTime] = useState('17:00');
  const [availError, setAvailError] = useState('');

  // Generation options
  const [preserveCompleted, setPreserveCompleted] = useState(true);

  // View mode tab: 'list' | 'by-day' | 'insights'
  const [activeTab, setActiveTab] = useState('list');

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleAddAvailability = (e) => {
    e.preventDefault();
    if (!startTime || !endTime) {
      setAvailError('Please select both a start time and an end time.');
      return;
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
      setAvailError('End time must be after start time.');
      return;
    }

    if (end - start < 30) {
      setAvailError('Availability window must be at least 30 minutes long.');
      return;
    }

    const hasNightHours = start < DAY_START_MINUTES || end > NIGHT_START_MINUTES;

    addAvailability({
      day,
      startTime,
      endTime,
      warning: hasNightHours ? 'Night hours detected: only 06:00–22:00 will be scheduled.' : '',
    });

    setAvailError('');
  };

  const handleGenerateClick = () => {
    generatePlan({ preserveCompleted });
  };

  // Study plan stats
  const taskSessions = useMemo(
    () => studyPlan.filter((s) => s.type !== 'Break'),
    [studyPlan]
  );
  const completedCount = taskSessions.filter((s) => s.completed).length;
  const progressPercent =
    taskSessions.length === 0 ? 0 : Math.round((completedCount / taskSessions.length) * 100);

  // Group sessions by date for the "By Day" view
  const sessionsByDate = useMemo(() => {
    const grouped = {};
    studyPlan.forEach((session) => {
      if (!grouped[session.date]) {
        grouped[session.date] = [];
      }
      grouped[session.date].push(session);
    });
    return grouped;
  }, [studyPlan]);

  const uniqueDates = useMemo(() => Object.keys(sessionsByDate).sort(), [sessionsByDate]);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <div className="planner-flagship-pill">Flagship Engine</div>
          <h1 className="page-title">Smart Study Planner</h1>
          <p className="page-subtitle">
            Autonomous, explainable schedule generation based on multi-factor heuristics, deadlines, course difficulty, and your weekly availability.
          </p>
        </div>

        <div className="planner-header-actions">
          <button
            type="button"
            className={`btn ${emergencyExamMode ? 'btn-danger' : 'btn-outline'}`}
            onClick={toggleEmergencyExamMode}
            title="Accelerate preparation for approaching exams"
          >
            {emergencyExamMode ? '🚨 Emergency Exam Mode ON' : '⚡ Emergency Exam Mode'}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleGenerateClick}
          >
            <span>✨</span> Generate Smart Plan
          </button>
          {studyPlan.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={clearPlan}
            >
              Clear Plan
            </button>
          )}
        </div>
      </div>

      {/* Emergency Exam Mode Active Banner */}
      {emergencyExamMode && (
        <div className="emergency-mode-banner" role="alert">
          <div className="emergency-banner-icon">🚨</div>
          <div className="emergency-banner-content">
            <strong>Emergency Exam Preparation Mode Active:</strong>
            <p>
              The scheduler is dedicating 75% of available study slots to high-priority exam preparation. Non-urgent tasks are deferred to maximize retention for your nearest test.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-light"
            onClick={toggleEmergencyExamMode}
          >
            Deactivate
          </button>
        </div>
      )}

      {/* Adaptive Pace Signal Banner */}
      {adaptiveSignals?.paceMultiplier > 1.05 && (
        <div className="coach-pace-banner">
          <span className="pace-icon">🛡️</span>
          <div>
            <strong>Adaptive Pacing Active (+{Math.round((adaptiveSignals.paceMultiplier - 1) * 100)}% buffer):</strong>
            <span> Study session lengths are calibrated with extra breathing room to accommodate observed pace and prevent schedule collapse.</span>
          </div>
        </div>
      )}

      {/* AI / Algorithm Transparency Notice */}
      <div className="engine-transparency-card">
        <div className="transparency-icon" aria-hidden="true">⚙️</div>
        <div className="transparency-text">
          <strong>Deterministic Heuristic Scheduling Engine:</strong> This planner uses a pure, rule-based algorithmic model factoring in deadline exponential urgency decay, user priorities, course difficulty tiers, and break intervals. It does not send your data to external paid APIs or large language models.
        </div>
      </div>

      {/* Impossible Schedule Warning Banner */}
      {insights?.hasImpossibleSchedule && (
        <div className="schedule-alert-banner" role="alert">
          <div className="alert-banner-header">
            <span className="alert-icon" aria-hidden="true">⚠️</span>
            <div>
              <h3>Schedule Overload Detected</h3>
              <p>
                The total estimated workload for {insights.unscheduledTasks.length} task(s) exceeds your available study hours prior to their deadlines.
              </p>
            </div>
          </div>
          <div className="unscheduled-tags">
            {insights.unscheduledTasks.map((t) => (
              <div key={t.id} className="unscheduled-chip">
                <strong>{t.course} — {t.title}</strong>
                <span>Deficit: ~{t.deficitHours}h before {t.date}</span>
              </div>
            ))}
          </div>
          <p className="alert-advice">
            💡 <strong>Recommendation:</strong> Add more availability hours earlier in the week or reduce estimated workload.
          </p>
        </div>
      )}

      {/* Availability Management Section */}
      <section className="card card-section" aria-label="Weekly Availability Configuration">
        <div className="card-section-header">
          <div>
            <h2 className="card-section-title">Weekly Availability Windows</h2>
            <p className="card-section-subtitle">
              Configure your repeating weekly free study blocks. Sessions are scheduled between 06:00 and 22:00.
            </p>
          </div>
          <span className="badge-neutral">{availability.length} active window(s)</span>
        </div>

        {availError && (
          <div className="form-error-banner" role="alert">
            <span>✕</span> {availError}
          </div>
        )}

        <form onSubmit={handleAddAvailability} className="availability-inline-form">
          <div className="form-group-inline">
            <label htmlFor="avail-day" className="form-label">Day of Week</label>
            <select
              id="avail-day"
              className="form-select"
              value={day}
              onChange={(e) => setDay(e.target.value)}
            >
              {daysOfWeek.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="form-group-inline">
            <label htmlFor="avail-start" className="form-label">Start Time</label>
            <input
              id="avail-start"
              type="time"
              className="form-input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div className="form-group-inline">
            <label htmlFor="avail-end" className="form-label">End Time</label>
            <input
              id="avail-end"
              type="time"
              className="form-input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-secondary add-slot-btn">
            + Add Window
          </button>
        </form>

        {/* Existing Availability Slots Pills */}
        <div className="slots-container">
          {availability.length === 0 ? (
            <p className="empty-hint">No availability windows defined yet. Add at least one slot above.</p>
          ) : (
            <div className="slots-chips-grid">
              {availability.map((slot) => (
                <div key={slot.id} className="slot-chip">
                  <div className="slot-chip-info">
                    <strong>{slot.day}</strong>
                    <span>{slot.startTime} – {slot.endTime}</span>
                    {slot.warning && <span className="slot-warn" title={slot.warning}>⚠️</span>}
                  </div>
                  <button
                    type="button"
                    className="slot-delete-btn"
                    onClick={() => deleteAvailability(slot.id)}
                    aria-label={`Remove ${slot.day} ${slot.startTime} to ${slot.endTime}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Plan Controls & Progress Banner */}
      {taskSessions.length > 0 && (
        <section className="planner-summary-panel">
          <div className="summary-col">
            <span className="summary-label">Progress</span>
            <div className="summary-progress-wrapper">
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill fill-cyan"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="summary-percent">{progressPercent}%</span>
            </div>
            <span className="summary-subtext">
              {completedCount} of {taskSessions.length} sessions completed
            </span>
          </div>

          <div className="summary-col">
            <span className="summary-label">Planned Time</span>
            <div className="summary-value">
              {insights ? `${Math.floor(insights.totalMinutes / 60)}h ${insights.totalMinutes % 60}m` : '—'}
            </div>
            <span className="summary-subtext">across {taskSessions.length} study sessions</span>
          </div>

          <div className="summary-col">
            <span className="summary-label">Nearest Milestone</span>
            <div className="summary-value-truncate">
              {insights?.nearestDeadline || 'None'}
            </div>
            <span className="summary-subtext">
              Hardest course: <strong>{insights?.hardestCourse || 'None'}</strong>
            </span>
          </div>

          <div className="summary-options-col">
            <label className="checkbox-label" title="Preserve completed sessions when regenerating">
              <input
                type="checkbox"
                checked={preserveCompleted}
                onChange={(e) => setPreserveCompleted(e.target.checked)}
              />
              <span>Keep completed sessions</span>
            </label>
          </div>
        </section>
      )}

      {/* Plan Navigation Tabs */}
      <div className="planner-tabs-bar">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'list' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Detailed Schedule ({studyPlan.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'by-day' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('by-day')}
        >
          Daily Timeline ({uniqueDates.length} days)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'insights' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          Workload Insights
        </button>
      </div>

      {/* TAB 1: Detailed Schedule List */}
      {activeTab === 'list' && (
        <div className="schedule-view">
          {studyPlan.length === 0 ? (
            <div className="empty-state-card">
              <span className="empty-icon" aria-hidden="true">✨</span>
              <h3>No study plan generated yet</h3>
              <p>
                {availability.length === 0
                  ? 'Add your weekly availability above, then click "Generate Smart Plan".'
                  : 'Click the "Generate Smart Plan" button above to create an optimized study plan.'}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleGenerateClick}
              >
                Generate Smart Plan Now
              </button>
            </div>
          ) : (
            <div className="session-cards-list">
              {studyPlan.map((item) => {
                const isBreak = item.type === 'Break';

                if (isBreak) {
                  return (
                    <div key={item.id} className="break-card">
                      <div className="break-icon" aria-hidden="true">☕</div>
                      <div className="break-content">
                        <div className="break-title-row">
                          <strong>{item.title} ({item.sessionLength} min)</strong>
                          <span className="break-time">{formatReadableDate(item.date)} • {item.startTime} - {item.endTime}</span>
                        </div>
                        <p className="break-rec">{item.recommendation}</p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={item.id}
                    className={`session-card ${item.completed ? 'session-completed' : ''}`}
                    style={{ borderLeftColor: item.courseColor || '#0284c7' }}
                  >
                    <div className="session-card-header">
                      <div className="session-time-block">
                        <span className="session-date-label">{formatReadableDate(item.date)}</span>
                        <strong className="session-hours">
                          {item.startTime} – {item.endTime}
                        </strong>
                        <span className="session-duration-tag">{item.sessionLength} min</span>
                      </div>

                      <div className="session-header-details">
                        <div className="session-title-group">
                          <h3 className="session-title">{item.title}</h3>
                          <span className="course-pill">{item.course}</span>
                          <Badge variant={item.type === 'Exam Review' ? 'exam' : 'assignment'}>
                            {item.type}
                          </Badge>
                          <Badge variant={item.priority}>{item.priority}</Badge>
                          {item.isRescheduled && (
                            <Badge variant="warning">Rescheduled</Badge>
                          )}
                          {item.isEmergencyExam && (
                            <Badge variant="danger">Emergency Prep</Badge>
                          )}
                        </div>
                        <p className="session-rec">{item.recommendation}</p>
                      </div>

                      <div className="session-action-col">
                        <button
                          type="button"
                          className={`btn btn-sm ${item.completed ? 'btn-secondary' : 'btn-success'}`}
                          onClick={() => toggleSessionCompleted(item.id)}
                        >
                          {item.completed ? 'Undo Completion' : 'Mark Completed ✓'}
                        </button>
                      </div>
                    </div>

                    {/* Concrete Micro-Step Action Breakdown */}
                    {item.actionBreakdown && item.actionBreakdown.length > 0 && (
                      <div className="action-breakdown-box">
                        <div className="breakdown-header">
                          <span className="breakdown-icon">📋</span>
                          <strong>Session Action Breakdown (Concrete Steps):</strong>
                        </div>
                        <ol className="action-steps-list">
                          {item.actionBreakdown.map((step) => (
                            <li key={step.step} className="action-step-item">
                              <span className="step-num">{step.step}.</span>
                              <span className="step-text">{step.action}</span>
                              <span className="step-time">({step.duration} min)</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Explainability Accordion */}
                    {item.explanation && (
                      <details className="session-explain-details">
                        <summary className="explain-summary">
                          <span>🔍 Why was this session scheduled?</span>
                        </summary>
                        <ul className="explain-list">
                          {item.explanation.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Daily Timeline */}
      {activeTab === 'by-day' && (
        <div className="timeline-view">
          {uniqueDates.length === 0 ? (
            <div className="empty-state-card">
              <p>Generate a plan to view your daily schedule breakdown.</p>
            </div>
          ) : (
            <div className="timeline-dates-stack">
              {uniqueDates.map((dateStr) => {
                const daySessions = sessionsByDate[dateStr] || [];
                const dayTasks = daySessions.filter((s) => s.type !== 'Break');

                return (
                  <div key={dateStr} className="day-block-card">
                    <div className="day-block-header">
                      <div>
                        <h3 className="day-block-title">{formatReadableDate(dateStr)}</h3>
                        <span className="day-block-count">
                          {dayTasks.length} task sessions • {daySessions.length - dayTasks.length} breaks
                        </span>
                      </div>
                    </div>

                    <div className="day-sessions-row">
                      {daySessions.map((session) => (
                        <div
                          key={session.id}
                          className={`day-session-mini ${session.type === 'Break' ? 'day-break-mini' : ''} ${
                            session.completed ? 'mini-completed' : ''
                          }`}
                        >
                          <div className="mini-time">{session.startTime} - {session.endTime}</div>
                          <div className="mini-title">{session.title}</div>
                          <span className="mini-course">{session.course}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Workload Insights */}
      {activeTab === 'insights' && (
        <div className="insights-view">
          {insights ? (
            <div className="insights-layout">
              <div className="insights-cards-grid">
                <div className="insight-stat-card">
                  <span className="insight-stat-label">Total Study Time</span>
                  <div className="insight-stat-value">
                    {Math.floor(insights.totalMinutes / 60)} hours {insights.totalMinutes % 60} mins
                  </div>
                </div>

                <div className="insight-stat-card">
                  <span className="insight-stat-label">Total Sessions</span>
                  <div className="insight-stat-value">{insights.totalSessions}</div>
                </div>

                <div className="insight-stat-card">
                  <span className="insight-stat-label">Most Demanding Subject</span>
                  <div className="insight-stat-value text-accent">{insights.hardestCourse}</div>
                </div>

                <div className="insight-stat-card">
                  <span className="insight-stat-label">Nearest Deadline</span>
                  <div className="insight-stat-value">{insights.nearestDeadline}</div>
                </div>
              </div>

              {/* Subject Distribution */}
              <div className="card card-section">
                <h3 className="card-section-title">Hours by Category</h3>
                <div className="category-bars-list">
                  {Object.entries(insights.categories || {}).map(([category, minutes]) => (
                    <div key={category} className="cat-bar-item">
                      <div className="cat-bar-labels">
                        <strong>{category}</strong>
                        <span>{(minutes / 60).toFixed(1)} hours</span>
                      </div>
                      <div className="progress-bar-track">
                        <div
                          className="progress-bar-fill fill-cyan"
                          style={{
                            width: `${Math.min(100, (minutes / (insights.totalMinutes || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="empty-state-card">
              <p>Generate a study plan to calculate workload distribution insights.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default StudyPlanner;