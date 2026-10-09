import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/useApp';
import { formatReadableDate, timeToMinutes } from '../services/scheduler';
import { t } from '../services/i18n';

export function Dashboard() {
  const {
    courses = [],
    assignments = [],
    exams = [],
    studyPlan = [],
    studentProfile = {},
    timetable = [],
    transitionBufferMinutes = 15,
    syllabusTopics = [],
    checkIns = [],
    adaptiveSignals = {},
    emergencyExamMode = false,
    toggleEmergencyExamMode,
    toggleSessionCompleted,
    openCheckInModal,
    openOnboardingModal,
    openHelpModal,
    loadScenario,
  } = useApp();

  const [showDetailedStats, setShowDetailedStats] = useState(false);

  const completedAssignmentsCount = assignments.filter((a) => a.completed).length;
  const pendingAssignments = assignments.filter((a) => !a.completed);

  // Upcoming exams in future or today
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

  // Combined urgent deliverables (assignments & exams) in the next 14 days
  const upcomingDeliverables = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const items = [];

    pendingAssignments.forEach((a) => {
      if (!a.dueDate) return;
      const due = new Date(`${a.dueDate}T23:59:59`);
      const diffDays = Math.ceil((due - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        items.push({
          id: `asg-${a.id}`,
          title: a.title,
          course: a.course,
          date: a.dueDate,
          diffDays,
          type: 'Assignment',
          priority: a.priority || 'Medium',
          weightPercent: a.weightPercent,
        });
      }
    });

    upcomingExams.forEach((e) => {
      const examDate = new Date(`${e.date}T23:59:59`);
      const diffDays = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) {
        items.push({
          id: `exam-${e.id}`,
          title: e.title,
          course: e.course,
          date: e.date,
          diffDays,
          type: 'Exam',
          priority: 'High',
          weightPercent: e.weightPercent,
        });
      }
    });

    return items.sort((a, b) => a.diffDays - b.diffDays);
  }, [pendingAssignments, upcomingExams]);

  const nextDeadline = upcomingDeliverables[0] || null;

  // Next scheduled class from Timetable
  const nextClass = (() => {
    if (!timetable || timetable.length === 0) return null;

    const daysOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const now = new Date();
    const currentDayName = daysOrder[now.getDay()];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // 1. Look for remaining classes today
    const todayClasses = timetable
      .filter((e) => e.dayOfWeek === currentDayName && timeToMinutes(e.startTime) > currentMinutes)
      .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    if (todayClasses.length > 0) {
      return { ...todayClasses[0], isToday: true };
    }

    // 2. Look for tomorrow or closest upcoming day's first class
    for (let offset = 1; offset <= 7; offset++) {
      const targetDayIndex = (now.getDay() + offset) % 7;
      const targetDayName = daysOrder[targetDayIndex];
      const dayClasses = timetable
        .filter((e) => e.dayOfWeek === targetDayName)
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

      if (dayClasses.length > 0) {
        return { ...dayClasses[0], isToday: false, dayLabel: targetDayName };
      }
    }

    return null;
  })();

  // Today's Study Sessions
  const todayDateStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, []);

  const taskSessions = useMemo(
    () => studyPlan.filter((s) => s.type !== 'Break'),
    [studyPlan]
  );

  const todaySessions = useMemo(() => {
    const forToday = taskSessions.filter((s) => s.date === todayDateStr);
    if (forToday.length > 0) return forToday;

    // Fallback: next scheduled day with unfinished work
    const sortedFuture = [...taskSessions]
      .filter((s) => !s.completed)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    if (sortedFuture.length === 0) return [];
    const firstDate = sortedFuture[0].date;
    return sortedFuture.filter((s) => s.date === firstDate);
  }, [taskSessions, todayDateStr]);

  const activeFocusSession = useMemo(() => {
    return todaySessions.find((s) => !s.completed) || null;
  }, [todaySessions]);

  // Check-in status
  const hasRecentCheckIn = useMemo(() => {
    if (!checkIns || checkIns.length === 0) return false;
    const last = checkIns[checkIns.length - 1];
    if (!last?.date) return false;
    const diffDays = (new Date() - new Date(last.date)) / (1000 * 60 * 60 * 24);
    return diffDays < 5;
  }, [checkIns]);

  // Topic mastery count
  const topicsMasteredCount = useMemo(() => {
    return syllabusTopics.filter((t) => t.status === 'completed' || t.status === 'mastered').length;
  }, [syllabusTopics]);

  return (
    <div className="page-container" style={{ maxWidth: '1180px', margin: '0 auto', paddingBottom: '90px' }}>
      {/* Header with Title and Persona Switcher */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <div className="planner-flagship-pill" style={{ marginBottom: '6px' }}>
            {t('nav_study_planner')}
          </div>
          <h1 className="page-title" style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.5px' }}>
            Academic Dashboard
          </h1>
          <p className="page-subtitle" style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '2px' }}>
            {t('dash_greeting')} {studentProfile?.name || 'Student'}! {t('dash_subtitle')}
          </p>
        </div>

        {/* Quick simulation controls */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="persona-switch-group" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Demo:</span>
            <button
              type="button"
              className={`btn btn-xs ${studentProfile?.name?.includes('Alex') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadScenario('consistent')}
              title="Simulate Alex Chen (Consistent, On-Track)"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              🟢 Alex (Consistent)
            </button>
            <button
              type="button"
              className={`btn btn-xs ${studentProfile?.name?.includes('Jordan') ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => loadScenario('delayed')}
              title="Simulate Jordan Taylor (Delayed, Catch-Up)"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              🟠 Jordan (Delayed)
            </button>
          </div>

          <button
            type="button"
            className={`btn btn-sm ${emergencyExamMode ? 'btn-danger' : 'btn-secondary'}`}
            onClick={toggleEmergencyExamMode}
            style={{ fontSize: '12px' }}
          >
            {emergencyExamMode ? '🚨 Emergency Exam Mode ON' : '⚡ Exam Mode'}
          </button>
        </div>
      </div>

      {/* First-Time Welcome Banner if no courses added */}
      {courses.length === 0 && (
        <div
          className="card"
          style={{
            padding: '20px 24px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(30, 41, 59, 0.9) 100%)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
          }}
          data-testid="welcome-onboarding-banner"
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{ fontSize: '20px' }}>👋</span>
              <strong style={{ fontSize: '16px', color: '#fff' }}>Welcome to My Academia Buddy!</strong>
            </div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '600px' }}>
              Your semester has not been configured yet. Launch our clean 5-step guided wizard to import course syllabi or set your timetable and study hours.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={openOnboardingModal}
              style={{ fontWeight: 700 }}
            >
              🚀 Launch Setup Guide
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={openHelpModal}
            >
              ❓ How It Works
            </button>
          </div>
        </div>
      )}

      {/* PRIORITY 1: What Should I Do Now? (Hero Card) */}
      <section
        className="card"
        data-tour="hero-recommendation"
        style={{
          padding: '24px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.12) 0%, rgba(30, 41, 59, 0.85) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.25)',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ flex: 1, minWidth: '280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--accent-cyan)' }}>
                {t('dash_hero_title')}
              </span>
            </div>

            {!hasRecentCheckIn ? (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                  {t('dash_hero_action_checkin')}
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '560px' }}>
                  Reflect on class attendance and topic mastery so your coach can adapt upcoming deadlines and study blocks.
                </p>
                <div style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={openCheckInModal}
                    style={{ fontSize: '14px', fontWeight: 600, padding: '10px 20px', boxShadow: '0 4px 14px rgba(56, 189, 248, 0.4)' }}
                  >
                    🚀 Start 2-Minute Check-In →
                  </button>
                </div>
              </div>
            ) : activeFocusSession ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      color: 'var(--accent-cyan)',
                    }}
                  >
                    {activeFocusSession.course}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    ⏱️ {activeFocusSession.startTime} – {activeFocusSession.endTime} ({activeFocusSession.sessionLength} min)
                  </span>
                </div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                  {activeFocusSession.title}
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '580px' }}>
                  {activeFocusSession.recommendation || activeFocusSession.explanation?.[0] || 'Focus on active retention and problem-solving.'}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => toggleSessionCompleted(activeFocusSession.id)}
                    style={{ fontSize: '13px', fontWeight: 600, padding: '8px 18px' }}
                  >
                    ✓ Mark as Completed
                  </button>
                  <Link to="/study-planner" className="btn btn-secondary" style={{ fontSize: '13px' }}>
                    View Full Plan
                  </Link>
                </div>
              </div>
            ) : nextClass && nextClass.isToday ? (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                  {t('dash_hero_action_class')}: {nextClass.courseCode} ({nextClass.startTime})
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  {nextClass.courseName} • Room {nextClass.location || 'Campus'}
                </p>
                <div style={{ marginTop: '16px' }}>
                  <Link to="/timetable" className="btn btn-primary" style={{ fontSize: '13px', fontWeight: 600 }}>
                    🗓️ Open Class Timetable →
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>
                  {t('dash_hero_action_idle')}
                </h2>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>
                  All immediate study sessions and check-ins are up to date. You can review upcoming materials or import new syllabi.
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <Link to="/study-planner" className="btn btn-primary" style={{ fontSize: '13px' }}>
                    Generate Forward Plan
                  </Link>
                  <Link to="/syllabus-import" className="btn btn-secondary" style={{ fontSize: '13px' }}>
                    Import Syllabus
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* PRIORITY 2 & 3: Urgent & Next Up Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        {/* Next Scheduled Class Card */}
        <div
          className="card"
          style={{
            padding: '20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                <span>🗓️</span>
                <span>{t('dash_next_class')}</span>
              </div>
              <Link to="/timetable" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>

            {nextClass ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '17px', color: nextClass.color || 'var(--text-primary)' }}>
                    {nextClass.courseCode}
                  </strong>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 700,
                    }}
                  >
                    {nextClass.activityType?.toUpperCase() || 'LEC'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {nextClass.courseName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', marginTop: '4px' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                    ⏰ {nextClass.isToday ? 'Today' : nextClass.dayLabel} at {nextClass.startTime} – {nextClass.endTime}
                  </span>
                  {nextClass.location && (
                    <span style={{ color: 'var(--text-muted)' }}>
                      📍 {nextClass.location}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                {t('dash_no_classes_today')}{' '}
                <Link to="/timetable" style={{ color: 'var(--accent-cyan)' }}>
                  Add your class schedule
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Next Urgent Deadline Card */}
        <div
          className="card"
          data-tour="upcoming-deadlines"
          style={{
            padding: '20px',
            borderRadius: '14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '14px',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: 'var(--warning)' }}>
                <span>⏰</span>
                <span>{t('dash_next_deadline')}</span>
              </div>
              <Link to="/assignments" style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none' }}>
                View All →
              </Link>
            </div>

            {nextDeadline ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '17px' }}>{nextDeadline.title}</strong>
                  <span
                    style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor: nextDeadline.diffDays <= 2 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                      color: nextDeadline.diffDays <= 2 ? 'var(--danger)' : 'var(--warning)',
                      fontWeight: 700,
                    }}
                  >
                    {nextDeadline.diffDays === 0
                      ? t('dash_today')
                      : nextDeadline.diffDays === 1
                      ? t('dash_tomorrow')
                      : `${nextDeadline.diffDays} ${t('dash_days')}`}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {nextDeadline.course} • {nextDeadline.type}
                  {nextDeadline.weightPercent ? ` (${nextDeadline.weightPercent}% of grade)` : ''}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  📅 Due Date: {formatReadableDate(nextDeadline.date)}
                </div>
              </div>
            ) : (
              <div style={{ padding: '12px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                {t('dash_no_deadlines_soon')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PRIORITY 4: Academic Health & Pacing */}
      <section
        className="card"
        data-tour="focus-sessions"
        style={{
          padding: '20px 24px',
          borderRadius: '14px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>📊</span>
            <strong style={{ fontSize: '15px' }}>{t('dash_pace_title')}</strong>
          </div>
          <div>
            {adaptiveSignals?.paceMultiplier > 1.15 ? (
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--warning)',
                  fontWeight: 700,
                }}
              >
                ⚠️ Pacing Buffer Active (+{Math.round((adaptiveSignals.paceMultiplier - 1) * 100)}%)
              </span>
            ) : (
              <span
                style={{
                  fontSize: '11px',
                  padding: '3px 10px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--success)',
                  fontWeight: 700,
                }}
              >
                ✓ On Track & Calibrated
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
          }}
        >
          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t('dash_topics_mastered')}</span>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {topicsMasteredCount} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>/ {syllabusTopics.length || '—'}</span>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Consistency Rate</span>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {adaptiveSignals?.completionRate ? `${Math.round(adaptiveSignals.completionRate)}%` : '100%'}
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Weekly Check-Ins</span>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {checkIns.length} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>completed</span>
            </div>
          </div>

          <div style={{ padding: '12px 14px', borderRadius: '10px', backgroundColor: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Class Sessions</span>
            <div style={{ fontSize: '20px', fontWeight: 800, marginTop: '2px' }}>
              {timetable.length} <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>weekly</span>
            </div>
          </div>
        </div>

        {adaptiveSignals?.coachInsight && (
          <p style={{ margin: '14px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            💡 Coach Note: {adaptiveSignals.coachInsight}
          </p>
        )}
      </section>

      {/* PRIORITY 5: Quick Useful Actions Bar */}
      <div data-tour="quick-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '24px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={openCheckInModal}
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>⏱️</span>
          <span>Take Weekly Check-In</span>
        </button>

        <Link
          to="/study-planner"
          className="btn btn-secondary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>✨</span>
          <span>Open Adaptive Planner</span>
        </Link>

        <Link
          to="/timetable"
          className="btn btn-secondary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>🗓️</span>
          <span>View Class Timetable</span>
        </Link>

        <Link
          to="/syllabus-import"
          className="btn btn-secondary"
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <span>📑</span>
          <span>Import Another Syllabus</span>
        </Link>
      </div>

      {/* Progressive Disclosure: Detailed Stats & Daily Queue */}
      <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: '20px' }}>
        <button
          type="button"
          onClick={() => setShowDetailedStats((prev) => !prev)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--accent-cyan)',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: 0,
            marginBottom: '16px',
          }}
        >
          <span>{showDetailedStats ? '▼ Hide Detailed Metrics' : '▶ View Detailed Metrics & Course Breakdown'}</span>
        </button>

        {/* Overview Stats (Always visible or toggleable with default visible for quick overview) */}
        <section className="stats-grid" aria-label="Detailed Academic Metrics">
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
            <div className="stat-icon-wrapper icon-cyan" aria-hidden="true">⏱️</div>
            <div className="stat-content">
              <span className="stat-label">Class Sessions</span>
              <div className="stat-value">{timetable.length}</div>
              <span className="stat-subtext">
                {transitionBufferMinutes}m travel buffer
              </span>
            </div>
          </div>
        </section>

        {/* Daily Session Queue / Spotlight */}
        {todaySessions.length === 0 && (
          <div className="card" style={{ marginTop: '16px', padding: '24px', textAlign: 'center' }}>
            <span style={{ fontSize: '32px' }}>🎉</span>
            <h3 style={{ margin: '8px 0 4px 0', fontSize: '15px', fontWeight: 600 }}>
              No study session currently queued
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              All planned study sessions for today are complete. Open the Adaptive Planner to generate your next study block.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;