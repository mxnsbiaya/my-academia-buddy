import { useState, useMemo, useEffect, useCallback } from 'react';
import { useApp } from '../context/useApp';
import { Modal } from './Modal';
import {
  generateStructuredCheckInFlow,
  explainCheckInAdaptations,
  CHECK_IN_ANSWERS,
} from '../services/coach';

const STEP_DEFINITIONS = [
  { step: 1, id: 'attendance', label: 'Attendance', icon: '🏫' },
  { step: 2, id: 'topics', label: 'Topics & Mastery', icon: '🧠' },
  { step: 3, id: 'sessions', label: 'Study Sessions', icon: '⏱️' },
  { step: 4, id: 'deadlines', label: 'Deadlines', icon: '📅' },
  { step: 5, id: 'pacing', label: 'Pacing & Health', icon: '🎯' },
];

export function CheckInModal({ isOpen, onClose }) {
  const {
    courses = [],
    syllabusTopics = [],
    assignments = [],
    exams = [],
    studyPlan = [],
    submitCheckIn,
    addAssignment,
    addExam,
    userId,
    addToast,
  } = useApp();

  const flow = useMemo(() => {
    return generateStructuredCheckInFlow({
      courses,
      syllabusTopics,
      assignments,
      exams,
      studyPlan,
    });
  }, [courses, syllabusTopics, assignments, exams, studyPlan]);

  // Stepper state: 1 to 5, or 6 (submission summary)
  const [currentStep, setCurrentStep] = useState(1);
  const [hasDraftPrompt, setHasDraftPrompt] = useState(false);

  // Step 1: Attendance state { [courseId]: 'attended_all' | 'attended_most' | 'missed_some' | 'missed_all' }
  const [attendance, setAttendance] = useState({});

  // Step 2: Topics state
  const [studiedTopics, setStudiedTopics] = useState({});
  const [topicConfidence, setTopicConfidence] = useState({});
  const [difficultTopics, setDifficultTopics] = useState({});

  // Step 3: Planned Sessions state
  const [sessionCompletion, setSessionCompletion] = useState('all_completed');
  const [sessionDelayReason, setSessionDelayReason] = useState('');

  // Step 4: Deliverables state { [asgId]: 'not_started' | 'in_progress' | 'almost_done' | 'completed' }
  const [deliverableStatus, setDeliverableStatus] = useState({});

  // Step 4: Periodic New Assignment Check (Phase 4.1)
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [newDeliverableKind, setNewDeliverableKind] = useState('assignment');
  const [newDeliverableTitle, setNewDeliverableTitle] = useState('');
  const [newDeliverableCourse, setNewDeliverableCourse] = useState('');
  const [newDeliverableDate, setNewDeliverableDate] = useState('');
  const [newDeliverableWeight, setNewDeliverableWeight] = useState('');
  const [newDeliverablesAdded, setNewDeliverablesAdded] = useState([]);

  const handleAddNewAnnouncement = () => {
    if (!newDeliverableTitle.trim()) {
      addToast('Please enter a deliverable title.', 'warning');
      return;
    }
    if (!newDeliverableDate) {
      addToast('Please select a due date.', 'warning');
      return;
    }

    const assignedCourse = newDeliverableCourse || (courses[0]?.name || 'General');

    if (newDeliverableKind === 'exam') {
      const created = addExam({
        title: newDeliverableTitle.trim(),
        course: assignedCourse,
        date: newDeliverableDate,
        weightPercent: Number(newDeliverableWeight) || 15,
        priority: 'High',
      });
      setNewDeliverablesAdded((prev) => [...prev, { ...created, type: 'Exam' }]);
    } else {
      const created = addAssignment({
        title: newDeliverableTitle.trim(),
        course: assignedCourse,
        dueDate: newDeliverableDate,
        weightPercent: Number(newDeliverableWeight) || 10,
        priority: 'Medium',
      });
      setNewDeliverablesAdded((prev) => [...prev, { ...created, type: 'Assignment' }]);
    }

    setNewDeliverableTitle('');
    setNewDeliverableDate('');
    setNewDeliverableWeight('');
    addToast('New deliverable added to your schedule!', 'success');
  };

  // Step 5: Pacing state { [courseId]: 'on_track' | 'slightly_behind' | 'severely_behind' }
  const [pacingStatus, setPacingStatus] = useState({});
  const [newCommitments, setNewCommitments] = useState('');

  // Post-submission adaptation explanations
  const [adaptationSummary, setAdaptationSummary] = useState(null);

  const draftStorageKey = `mab_checkin_draft_${userId || 'guest'}`;

  // Check for saved draft when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(draftStorageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') {
            setHasDraftPrompt(true);
          }
        }
      } catch (err) {
        console.warn('Failed to inspect check-in draft:', err);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [isOpen, draftStorageKey]);

  // Restore draft handler
  const handleRestoreDraft = () => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.attendance) setAttendance(d.attendance);
        if (d.studiedTopics) setStudiedTopics(d.studiedTopics);
        if (d.topicConfidence) setTopicConfidence(d.topicConfidence);
        if (d.difficultTopics) setDifficultTopics(d.difficultTopics);
        if (d.sessionCompletion) setSessionCompletion(d.sessionCompletion);
        if (d.sessionDelayReason) setSessionDelayReason(d.sessionDelayReason);
        if (d.deliverableStatus) setDeliverableStatus(d.deliverableStatus);
        if (d.pacingStatus) setPacingStatus(d.pacingStatus);
        if (d.newCommitments) setNewCommitments(d.newCommitments);
        if (d.currentStep) setCurrentStep(d.currentStep);
        addToast('Resumed your saved check-in draft.', 'info');
      }
    } catch (err) {
      console.warn('Draft restoration error:', err);
    }
    setHasDraftPrompt(false);
  };

  // Discard draft handler
  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore removal error
    }
    setHasDraftPrompt(false);
  };

  // Auto-save draft on interaction
  const saveDraftToStorage = useCallback(() => {
    try {
      const payload = {
        currentStep,
        attendance,
        studiedTopics,
        topicConfidence,
        difficultTopics,
        sessionCompletion,
        sessionDelayReason,
        deliverableStatus,
        pacingStatus,
        newCommitments,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    } catch {
      // ignore storage quota error
    }
  }, [
    currentStep,
    attendance,
    studiedTopics,
    topicConfidence,
    difficultTopics,
    sessionCompletion,
    sessionDelayReason,
    deliverableStatus,
    pacingStatus,
    newCommitments,
    draftStorageKey,
  ]);

  useEffect(() => {
    if (isOpen && currentStep <= 5 && !adaptationSummary) {
      saveDraftToStorage();
    }
  }, [
    isOpen,
    currentStep,
    attendance,
    studiedTopics,
    topicConfidence,
    difficultTopics,
    sessionCompletion,
    sessionDelayReason,
    deliverableStatus,
    pacingStatus,
    newCommitments,
    adaptationSummary,
    saveDraftToStorage,
  ]);

  // Stepper navigation
  const handleNextStep = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSaveDraftAndExit = () => {
    saveDraftToStorage();
    addToast('Check-in draft saved! You can resume anytime.', 'info');
    onClose();
  };

  // Quick fill: All on track
  const handleQuickFillOnTrack = () => {
    const att = {};
    flow.step1_attendance.forEach((c) => {
      att[c.courseId] = 'attended_all';
    });
    setAttendance(att);

    const std = {};
    const conf = {};
    flow.step2_topics.forEach((g) => {
      g.topics.forEach((t) => {
        std[t.id] = true;
        conf[t.id] = 4;
      });
    });
    setStudiedTopics(std);
    setTopicConfidence(conf);
    setDifficultTopics({});

    setSessionCompletion('all_completed');
    setSessionDelayReason('');

    const deliv = {};
    flow.step4_deliverables.forEach((d) => {
      deliv[d.id] = 'in_progress';
    });
    setDeliverableStatus(deliv);

    const pac = {};
    flow.step5_pacing.forEach((c) => {
      pac[c.courseId] = 'on_track';
    });
    setPacingStatus(pac);

    addToast('⚡ Quick filled: all courses marked on track!', 'info');
  };

  // Final Submission
  const handleSubmitCheckIn = () => {
    // 1. Format topic responses
    const responses = [];

    // Step 2 topic evaluations
    Object.keys(studiedTopics).forEach((topicId) => {
      if (studiedTopics[topicId]) {
        const topic = syllabusTopics.find((t) => t.id === topicId);
        const score = topicConfidence[topicId] || 3;
        const isDifficult = difficultTopics[topicId] || false;

        responses.push({
          topicId,
          courseName: topic?.courseName || 'Course',
          topicTitle: topic?.title || 'Topic',
          field: 'lecture',
          type: 'topic_lecture',
          answer: isDifficult ? CHECK_IN_ANSWERS.PARTIALLY_COMPLETED : CHECK_IN_ANSWERS.COMPLETED,
          confidenceScore: score,
        });
      }
    });

    // 2. Identify difficult topic IDs for rescheduling
    const difficultIds = Object.keys(difficultTopics).filter((id) => difficultTopics[id]);

    // 3. Submit through AppContext
    const result = submitCheckIn({
      responses,
      newCommitments,
      attendance,
      pacingStatus,
      difficultTopicIds: difficultIds,
      sessionCompletion,
      sessionDelayReason,
    });

    // 4. Generate coaching explanation
    const points = explainCheckInAdaptations({
      recalibratedSignals: result?.recalibratedSignals || {},
      difficultTopicCount: difficultIds.length,
      missedSessionCount: sessionCompletion === 'missed_sessions' ? 2 : 0,
      planUpdated: true,
    });

    setAdaptationSummary({
      points,
      difficultCount: difficultIds.length,
      sessionStatus: sessionCompletion,
    });

    // Clean up draft
    try {
      localStorage.removeItem(draftStorageKey);
    } catch {
      // ignore
    }

    // Move to summary view (step 6)
    setCurrentStep(6);
  };

  const progressPercentage = Math.round((Math.min(currentStep, 5) / 5) * 100);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Weekly Academic Check-In (2 Minutes)"
    >
      <div className="checkin-container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Draft Resume Prompt */}
        {hasDraftPrompt && currentStep <= 5 && !adaptationSummary && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              borderRadius: '10px',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📝</span>
              <span style={{ fontSize: '13px' }}>
                You have an unfinished check-in draft saved from earlier.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDiscardDraft}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Start Fresh
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleRestoreDraft}
                style={{ fontSize: '12px', padding: '4px 10px' }}
              >
                Resume Draft
              </button>
            </div>
          </div>
        )}

        {/* Stepper Header (Only shown during steps 1-5) */}
        {currentStep <= 5 && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>
                  {STEP_DEFINITIONS[currentStep - 1]?.icon}
                </span>
                <span style={{ fontWeight: 700, fontSize: '15px' }}>
                  Step {currentStep} of 5: {STEP_DEFINITIONS[currentStep - 1]?.label}
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleQuickFillOnTrack}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px',
                  color: 'var(--accent-cyan)',
                  borderColor: 'rgba(56, 189, 248, 0.4)',
                }}
                title="Quickly mark all courses as attended and on track"
              >
                ⚡ Quick Fill: All On Track
              </button>
            </div>

            {/* Stepper Progress Bar */}
            <div
              style={{
                width: '100%',
                height: '6px',
                backgroundColor: 'var(--border-subtle)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '14px',
              }}
            >
              <div
                style={{
                  width: `${progressPercentage}%`,
                  height: '100%',
                  backgroundColor: 'var(--accent-cyan)',
                  transition: 'width 0.3s ease',
                  borderRadius: '3px',
                }}
              />
            </div>

            {/* Step Pills */}
            <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
              {STEP_DEFINITIONS.map((def) => {
                const isActive = def.step === currentStep;
                const isPassed = def.step < currentStep;
                return (
                  <button
                    key={def.step}
                    type="button"
                    onClick={() => setCurrentStep(def.step)}
                    style={{
                      flex: 1,
                      padding: '6px 8px',
                      borderRadius: '8px',
                      border: isActive
                        ? '1px solid var(--accent-cyan)'
                        : '1px solid var(--border-subtle)',
                      backgroundColor: isActive
                        ? 'rgba(56, 189, 248, 0.15)'
                        : isPassed
                        ? 'rgba(16, 185, 129, 0.08)'
                        : 'var(--bg-card)',
                      color: isActive
                        ? 'var(--accent-cyan)'
                        : isPassed
                        ? 'var(--success)'
                        : 'var(--text-muted)',
                      fontSize: '11px',
                      fontWeight: isActive ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span>{isPassed ? '✓' : def.icon}</span>
                    <span>{def.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 1: CLASS & LECTURE ATTENDANCE */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Did you attend your scheduled university lectures and lab sessions this week?
            </div>

            {flow.step1_attendance.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                No registered courses found. You can import syllabi or add courses in the Courses tab.
              </p>
            ) : (
              flow.step1_attendance.map((c) => {
                const currentVal = attendance[c.courseId] || 'attended_all';
                return (
                  <div
                    key={c.courseId}
                    style={{
                      padding: '14px 16px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '12px',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '14px' }}>{c.courseName}</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.schedule}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                      {[
                        { id: 'attended_all', label: 'Attended All', symbol: '🟢' },
                        { id: 'attended_most', label: 'Most (~75%)', symbol: '🟡' },
                        { id: 'missed_some', label: 'Missed 1-2', symbol: '🟠' },
                        { id: 'missed_all', label: 'Missed All', symbol: '🔴' },
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAttendance((prev) => ({ ...prev, [c.courseId]: opt.id }))}
                          style={{
                            padding: '8px 6px',
                            borderRadius: '8px',
                            border:
                              currentVal === opt.id
                                ? '1.5px solid var(--accent-cyan)'
                                : '1px solid var(--border-subtle)',
                            backgroundColor:
                              currentVal === opt.id
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'var(--bg-surface)',
                            color: currentVal === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                            fontWeight: currentVal === opt.id ? 700 : 500,
                            fontSize: '11px',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <span style={{ fontSize: '14px' }}>{opt.symbol}</span>
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* STEP 2: TOPICS STUDIED & DIFFICULTIES */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Check off topics you studied this week and rate your confidence (1 = Unsure, 5 = Mastered). Flag concepts that still feel difficult so your coach can schedule extra practice.
            </div>

            {flow.step2_topics.map((group) => (
              <div
                key={group.courseId}
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  border: '1px solid var(--border-default)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--accent-cyan)' }}>
                  {group.courseName}
                </div>

                {group.topics.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      No syllabus topics recorded yet.
                    </span>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setStudiedTopics((p) => ({ ...p, [group.courseId]: true }));
                        setTopicConfidence((p) => ({ ...p, [group.courseId]: 4 }));
                      }}
                      style={{ fontSize: '11px' }}
                    >
                      ✓ Mark Material Reviewed
                    </button>
                  </div>
                ) : (
                  group.topics.map((t) => {
                    const isStudied = studiedTopics[t.id] || false;
                    const score = topicConfidence[t.id] || 3;
                    const isDifficult = difficultTopics[t.id] || false;

                    return (
                      <div
                        key={t.id}
                        style={{
                          padding: '10px 12px',
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: '8px',
                          border: isStudied
                            ? '1px solid var(--accent-cyan)'
                            : '1px solid var(--border-subtle)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              cursor: 'pointer',
                              fontWeight: 600,
                              fontSize: '13px',
                            }}
                          >
                            <input
                              type="checkbox"
                              checked={isStudied}
                              onChange={(e) =>
                                setStudiedTopics((prev) => ({ ...prev, [t.id]: e.target.checked }))
                              }
                            />
                            <span>
                              Wk {t.weekNumber || 1}: {t.title}
                            </span>
                          </label>

                          <button
                            type="button"
                            onClick={() =>
                              setDifficultTopics((prev) => ({ ...prev, [t.id]: !prev[t.id] }))
                            }
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              border: isDifficult
                                ? '1px solid var(--danger)'
                                : '1px solid var(--border-subtle)',
                              backgroundColor: isDifficult
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'transparent',
                              color: isDifficult ? 'var(--danger)' : 'var(--text-muted)',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            {isDifficult ? '⚠️ Flagged Difficult' : '+ Flag Difficult'}
                          </button>
                        </div>

                        {/* Confidence selector */}
                        {isStudied && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '22px' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              Comprehension:
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[1, 2, 3, 4, 5].map((num) => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() =>
                                    setTopicConfidence((prev) => ({ ...prev, [t.id]: num }))
                                  }
                                  style={{
                                    width: '26px',
                                    height: '24px',
                                    borderRadius: '6px',
                                    border:
                                      score === num
                                        ? '1px solid var(--accent-cyan)'
                                        : '1px solid var(--border-subtle)',
                                    backgroundColor:
                                      score === num ? 'var(--accent-cyan)' : 'var(--bg-elevated)',
                                    color: score === num ? '#000' : 'var(--text-secondary)',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {num}
                                </button>
                              ))}
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {score <= 2 ? 'Struggling' : score >= 4 ? 'Solid' : 'Moderate'}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        )}

        {/* STEP 3: PLANNED STUDY SESSIONS */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Did you complete your planned study sessions from your adaptive schedule this week?
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {[
                {
                  id: 'all_completed',
                  title: 'All On Track',
                  desc: 'Completed all or almost all planned sessions',
                  icon: '🏆',
                },
                {
                  id: 'partially_completed',
                  title: 'Partially Done',
                  desc: 'Completed ~50% of planned study blocks',
                  icon: '⚖️',
                },
                {
                  id: 'missed_sessions',
                  title: 'Fell Behind',
                  desc: 'Missed multiple sessions and need catch-up time',
                  icon: '⚠️',
                },
              ].map((opt) => (
                <div
                  key={opt.id}
                  onClick={() => setSessionCompletion(opt.id)}
                  style={{
                    padding: '16px',
                    borderRadius: '12px',
                    border:
                      sessionCompletion === opt.id
                        ? '2px solid var(--accent-cyan)'
                        : '1px solid var(--border-default)',
                    backgroundColor:
                      sessionCompletion === opt.id
                        ? 'rgba(56, 189, 248, 0.12)'
                        : 'var(--bg-card)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{opt.icon}</span>
                  <strong style={{ fontSize: '14px' }}>{opt.title}</strong>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                    {opt.desc}
                  </p>
                </div>
              ))}
            </div>

            {sessionCompletion !== 'all_completed' && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  What caused the delay? (Helps coach avoid impossible schedules)
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  {[
                    'Heavy homework workload',
                    'Work shifts / employment',
                    'Illness or personal emergency',
                    'Topics took longer than estimated',
                    'Fatigue or burnout',
                  ].map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSessionDelayReason(reason)}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        backgroundColor:
                          sessionDelayReason === reason
                            ? 'rgba(56, 189, 248, 0.15)'
                            : 'transparent',
                        borderColor:
                          sessionDelayReason === reason
                            ? 'var(--accent-cyan)'
                            : 'var(--border-subtle)',
                      }}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Or type custom reason..."
                  value={sessionDelayReason}
                  onChange={(e) => setSessionDelayReason(e.target.value)}
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 4: UPCOMING DELIVERABLES */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Have you started your upcoming assignments and exams due in the next 14 days?
            </div>

            {flow.step4_deliverables.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '13px' }}>
                No deliverables due in the next 14 days. You are in a clear preparation window!
              </p>
            ) : (
              flow.step4_deliverables.map((d) => {
                const currentStatus = deliverableStatus[d.id] || 'not_started';
                return (
                  <div
                    key={d.id}
                    style={{
                      padding: '12px 16px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-default)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <strong>{d.title}</strong>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '8px' }}>
                          ({d.course}) • Due: {d.dueDate}
                        </span>
                      </div>
                      {d.weightPercent && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            color: 'var(--accent-cyan)',
                            borderRadius: '6px',
                          }}
                        >
                          {d.weightPercent}% of grade
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {[
                        { id: 'not_started', label: 'Not Started' },
                        { id: 'in_progress', label: 'In Progress' },
                        { id: 'almost_done', label: 'Almost Done' },
                        { id: 'completed', label: 'Completed ✓' },
                      ].map((statusOpt) => (
                        <button
                          key={statusOpt.id}
                          type="button"
                          onClick={() =>
                            setDeliverableStatus((prev) => ({ ...prev, [d.id]: statusOpt.id }))
                          }
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border:
                              currentStatus === statusOpt.id
                                ? '1.5px solid var(--accent-cyan)'
                                : '1px solid var(--border-subtle)',
                            backgroundColor:
                              currentStatus === statusOpt.id
                                ? 'rgba(56, 189, 248, 0.15)'
                                : 'var(--bg-surface)',
                            color:
                              currentStatus === statusOpt.id
                                ? 'var(--text-primary)'
                                : 'var(--text-secondary)',
                            fontWeight: currentStatus === statusOpt.id ? 700 : 500,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          {statusOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })
            )}

            {/* Periodic New Deliverable Check (Phase 4.1) */}
            <div
              style={{
                marginTop: '10px',
                padding: '14px',
                backgroundColor: 'rgba(56, 189, 248, 0.05)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px' }}>📢</span>
                  <div>
                    <strong style={{ fontSize: '13px' }}>
                      Did professors announce any new assignments or exams this week?
                    </strong>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Optional: keep your schedule up-to-date as professors release deliverables throughout the term.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className={`btn btn-sm ${hasNewAnnouncements ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHasNewAnnouncements(true)}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${!hasNewAnnouncements ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setHasNewAnnouncements(false)}
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                  >
                    No
                  </button>
                </div>
              </div>

              {hasNewAnnouncements && (
                <div
                  style={{
                    padding: '12px',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1.5fr 1.5fr 1fr', gap: '8px', alignItems: 'center' }}>
                    <div>
                      <select
                        className="form-input"
                        value={newDeliverableKind}
                        onChange={(e) => setNewDeliverableKind(e.target.value)}
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        <option value="assignment">Assignment</option>
                        <option value="exam">Exam</option>
                      </select>
                    </div>

                    <div>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Deliverable Title..."
                        value={newDeliverableTitle}
                        onChange={(e) => setNewDeliverableTitle(e.target.value)}
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <select
                        className="form-input"
                        value={newDeliverableCourse}
                        onChange={(e) => setNewDeliverableCourse(e.target.value)}
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        <option value="">Course (Optional)</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <input
                        type="date"
                        className="form-input"
                        value={newDeliverableDate}
                        onChange={(e) => setNewDeliverableDate(e.target.value)}
                        style={{ width: '100%', fontSize: '12px' }}
                      />
                    </div>

                    <div>
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={handleAddNewAnnouncement}
                        style={{ width: '100%', fontSize: '12px' }}
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {newDeliverablesAdded.length > 0 && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {newDeliverablesAdded.map((item, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '11px',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success)',
                            fontWeight: 600,
                          }}
                        >
                          ✓ Added: {item.title} ({item.course || 'Course'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: PACING HEALTH & LIFE COMMITMENTS */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Are you behind in any course? Note any upcoming shifts or travel so your study schedule stays realistic.
            </div>

            {/* Course Pacing Health */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {flow.step5_pacing.map((c) => {
                const cur = pacingStatus[c.courseId] || 'on_track';
                return (
                  <div
                    key={c.courseId}
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                    }}
                  >
                    <strong style={{ fontSize: '13px' }}>{c.courseName}</strong>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      {[
                        { id: 'on_track', label: 'On Track', color: 'var(--success)' },
                        { id: 'slightly_behind', label: 'Slightly Behind', color: 'var(--warning)' },
                        { id: 'severely_behind', label: 'Needs Help', color: 'var(--danger)' },
                      ].map((pOpt) => (
                        <button
                          key={pOpt.id}
                          type="button"
                          onClick={() =>
                            setPacingStatus((prev) => ({ ...prev, [c.courseId]: pOpt.id }))
                          }
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border:
                              cur === pOpt.id
                                ? `1.5px solid ${pOpt.color}`
                                : '1px solid var(--border-subtle)',
                            backgroundColor:
                              cur === pOpt.id ? `${pOpt.color}22` : 'var(--bg-surface)',
                            color: cur === pOpt.id ? pOpt.color : 'var(--text-muted)',
                            fontWeight: cur === pOpt.id ? 700 : 500,
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          {pOpt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Upcoming Life Commitments */}
            <div
              style={{
                padding: '14px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Upcoming work shifts, exams, or personal commitments next week:
              </label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="e.g. 8-hour shift on Saturday, or family dinner Friday evening..."
                value={newCommitments}
                onChange={(e) => setNewCommitments(e.target.value)}
                style={{ width: '100%', fontSize: '12px' }}
              />
            </div>
          </div>
        )}

        {/* STEP 6: POST-SUBMISSION ADAPTATION SUMMARY */}
        {currentStep === 6 && adaptationSummary && (
          <div
            style={{
              padding: '20px',
              backgroundColor: 'rgba(16, 185, 129, 0.08)',
              borderRadius: '14px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '32px' }}>🎯</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--success)' }}>
                  Check-In Complete & Plan Recalibrated!
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Here is what your academic coach adapted in your schedule:
                </p>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                backgroundColor: 'var(--bg-card)',
                padding: '14px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {adaptationSummary.points.map((pt, idx) => (
                <div
                  key={idx}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '13px' }}
                >
                  <span style={{ color: 'var(--accent-cyan)' }}>✓</span>
                  <span>{pt}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{ padding: '8px 20px', fontWeight: 600 }}
              >
                View Updated Study Plan 🚀
              </button>
            </div>
          </div>
        )}

        {/* ACTION BUTTONS (STEPS 1-5) */}
        {currentStep <= 5 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border-subtle)',
              paddingTop: '16px',
              marginTop: '4px',
            }}
          >
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handlePrevStep}
                  style={{ fontSize: '13px' }}
                >
                  ← Back
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleSaveDraftAndExit}
                style={{ fontSize: '13px' }}
              >
                Save Draft & Exit
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleNextStep}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                >
                  Next Step →
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubmitCheckIn}
                  style={{
                    fontSize: '13px',
                    fontWeight: 700,
                    backgroundColor: 'var(--accent-cyan)',
                    color: '#000',
                  }}
                >
                  Submit Check-In & Calibrate Plan 🚀
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default CheckInModal;
