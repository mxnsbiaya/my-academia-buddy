import { useState } from 'react';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';
import { Modal } from './Modal';
import { t } from '../services/i18n';
import { SAMPLE_SYLLABI_PACK } from '../data/sampleSyllabi';
import { SAMPLE_TIMETABLE_PACK, ACTIVITY_TYPES, DAY_NAMES } from '../services/timetableService';
import { parseSyllabus } from '../services/syllabusParser';
import { generateStudyPlan } from '../services/scheduler';

export function OnboardingModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const {
    courses = [],
    addCourse,
    deleteCourse,
    timetable = [],
    addTimetableEntry,
    deleteTimetableEntry,
    importTimetableEntries,
    availability = [],
    transitionBufferMinutes = 15,
    setStudyPlan,
    studentProfile = {},
    updateStudentProfile,
    importSemesterFromSyllabi,
    startProductTour,
    addToast,
    language,
    changeLanguage,
  } = useApp();

  const userId = user?.id || 'guest';
  const draftKey = `mab_onboarding_draft_${userId}`;

  const getSavedDraft = () => {
    try {
      const saved = window.localStorage.getItem(draftKey);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const initialDraft = getSavedDraft();

  const [step, setStep] = useState(() => initialDraft?.step || 1);
  const [academicFocus, setAcademicFocus] = useState(() => initialDraft?.academicFocus || 'all'); // 'org' | 'catchup' | 'exam' | 'all'
  const [studentName, setStudentName] = useState(() => initialDraft?.studentName || studentProfile?.name || '');
  const [program, setProgram] = useState(() => initialDraft?.program || studentProfile?.program || 'Computer Science (B.Sc.)');
  const [semester, setSemester] = useState(() => initialDraft?.semester || studentProfile?.semester || 'Fall 2026');
  const [organizationLevel, setOrganizationLevel] = useState(() => initialDraft?.organizationLevel || studentProfile?.organizationLevel || 'Building Habits');
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(() => String(initialDraft?.weeklyWorkHours ?? studentProfile?.weeklyWorkHours ?? 10));
  const [weeklyStudyGoalHours, setWeeklyStudyGoalHours] = useState(() => String(initialDraft?.weeklyStudyGoalHours ?? studentProfile?.weeklyStudyGoalHours ?? 18));
  const [preferredPeriods, setPreferredPeriods] = useState(() => initialDraft?.preferredPeriods || studentProfile?.preferredStudyPeriods || ['morning', 'afternoon']);

  // Manual course entry state (Step 2)
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualProf, setManualProf] = useState('');
  const [isUploadingSyllabus, setIsUploadingSyllabus] = useState(false);

  // Manual timetable entry state (Step 3)
  const [ttCourseCode, setTtCourseCode] = useState('');
  const [ttDay, setTtDay] = useState('Monday');
  const [ttStartTime, setTtStartTime] = useState('10:00');
  const [ttEndTime, setTtEndTime] = useState('11:20');
  const [ttActivityType, setTtActivityType] = useState('lecture');

  const saveDraft = () => {
    try {
      const draftData = {
        step,
        academicFocus,
        studentName,
        program,
        semester,
        organizationLevel,
        weeklyWorkHours,
        weeklyStudyGoalHours,
        preferredPeriods,
      };
      window.localStorage.setItem(draftKey, JSON.stringify(draftData));
      addToast(t('onboard_saved_draft_toast'), 'info', 5000);
      onClose();
    } catch {
      onClose();
    }
  };

  const handleNext = () => {
    if (step < 5) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSkip = () => {
    if (step < 5) setStep(step + 1);
  };

  const togglePeriod = (period) => {
    setPreferredPeriods((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period]
    );
  };

  // Add course manually
  const handleAddManualCourse = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const newCourse = {
      id: `course-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: manualCode.trim().toUpperCase(),
      title: manualName.trim() || manualCode.trim().toUpperCase(),
      instructor: manualProf.trim(),
      difficulty: 'Medium',
      color: '#3b82f6',
    };
    addCourse(newCourse);
    setManualCode('');
    setManualName('');
    setManualProf('');
    addToast(`Added course ${newCourse.name}`, 'success', 3000);
  };

  // Load 5 sample syllabi
  const handleLoadSampleSyllabi = () => {
    setIsUploadingSyllabus(true);
    try {
      const parsedList = SAMPLE_SYLLABI_PACK.map((sample) =>
        parseSyllabus(sample.text, { fileName: sample.fileName, language: sample.language })
      );
      importSemesterFromSyllabi(parsedList);
      setIsUploadingSyllabus(false);
      addToast('Loaded 5 sample course syllabi with deliverables!', 'success', 5000);
    } catch {
      setIsUploadingSyllabus(false);
      addToast('Failed to load sample syllabi', 'error');
    }
  };

  // Upload syllabus file directly in Onboarding
  const handleSyllabusFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingSyllabus(true);
    try {
      const text = await file.text();
      const parsed = parseSyllabus(text, { fileName: file.name });
      if (parsed?.course?.name) {
        importSemesterFromSyllabi([parsed]);
        addToast(`Parsed and imported syllabus for ${parsed.course.name}!`, 'success', 5000);
      } else {
        addToast('Could not extract course code from syllabus. You can enter it manually.', 'warning', 5000);
      }
    } catch {
      addToast('Could not read syllabus file. Please try manual entry.', 'error', 4000);
    } finally {
      setIsUploadingSyllabus(false);
    }
  };

  // Add class to timetable
  const handleAddTimetableEntry = (e) => {
    e.preventDefault();
    const courseCodeToUse = ttCourseCode || (courses[0]?.name) || 'COURSE';
    const newEntry = {
      id: `tt-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      courseCode: courseCodeToUse,
      dayOfWeek: ttDay,
      startTime: ttStartTime,
      endTime: ttEndTime,
      activityType: ttActivityType,
      location: 'Campus',
    };
    addTimetableEntry(newEntry);
    addToast(`Added ${newEntry.courseCode} (${newEntry.dayOfWeek} ${newEntry.startTime}) to timetable`, 'success', 3000);
  };

  // Load sample timetable
  const handleLoadSampleTimetable = () => {
    importTimetableEntries(SAMPLE_TIMETABLE_PACK);
    addToast('Sample lecture and lab schedule imported!', 'success', 4000);
  };

  // Finalize onboarding and generate initial plan
  const handleCompleteOnboarding = () => {
    // 1. Update student profile
    const goalSummaryMap = {
      org: 'Stay organized, balance deadlines, and maintain consistent pace',
      catchup: 'Recover from backlog and reschedule missed milestones comfortably',
      exam: 'Target high-yield exam preparation and study blocks',
      all: 'Comprehensive academic coaching, timetable planning, and pacing',
    };

    updateStudentProfile({
      name: studentName.trim() || studentProfile?.name || 'Student',
      program: program.trim(),
      semester: semester.trim(),
      academicFocus,
      academicGoal: goalSummaryMap[academicFocus] || goalSummaryMap.all,
      organizationLevel,
      preferredStudyPeriods: preferredPeriods,
      weeklyWorkHours: Number(weeklyWorkHours) || 0,
      weeklyStudyGoalHours: Number(weeklyStudyGoalHours) || 18,
      onboardingCompleted: true,
    });

    // 2. Generate initial plan if courses or items exist
    try {
      const initialPlan = generateStudyPlan({
        courses,
        assignments: [],
        exams: [],
        availability,
        timetable,
        transitionBufferMinutes,
      });
      if (initialPlan?.sessions?.length > 0) {
        setStudyPlan(initialPlan.sessions);
      }
    } catch {
      // Planner graceful fallback
    }

    // 3. Clear draft
    try {
      window.localStorage.removeItem(draftKey);
    } catch {
      // Ignore
    }

    onClose();
    addToast('🎉 Welcome to your academic cockpit! Starting product tour...', 'success', 5000);

    // 4. Trigger Product Tour
    setTimeout(() => {
      startProductTour();
    }, 400);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('onboard_title')}
      data-testid="onboarding-modal"
    >
      <div className="onboarding-wizard-container">
        {/* Wizard Step Indicator */}
        <nav aria-label="Onboarding Progress" className="onboarding-stepper-header">
          <button
            type="button"
            className={`onboarding-step-pill ${step === 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}
            onClick={() => setStep(1)}
          >
            {t('onboard_step1_name')}
          </button>
          <span className="onboarding-connector" aria-hidden="true">→</span>
          <button
            type="button"
            className={`onboarding-step-pill ${step === 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}
            onClick={() => setStep(2)}
          >
            {t('onboard_step2_name')}
          </button>
          <span className="onboarding-connector" aria-hidden="true">→</span>
          <button
            type="button"
            className={`onboarding-step-pill ${step === 3 ? 'active' : ''} ${step > 3 ? 'completed' : ''}`}
            onClick={() => setStep(3)}
          >
            {t('onboard_step3_name')}
          </button>
          <span className="onboarding-connector" aria-hidden="true">→</span>
          <button
            type="button"
            className={`onboarding-step-pill ${step === 4 ? 'active' : ''} ${step > 4 ? 'completed' : ''}`}
            onClick={() => setStep(4)}
          >
            {t('onboard_step4_name')}
          </button>
          <span className="onboarding-connector" aria-hidden="true">→</span>
          <button
            type="button"
            className={`onboarding-step-pill ${step === 5 ? 'active' : ''}`}
            onClick={() => setStep(5)}
          >
            {t('onboard_step5_name')}
          </button>
        </nav>

        {/* STEP 1: Academic Focus & Semester Goals */}
        {step === 1 && (
          <div className="onboarding-step-view" data-testid="onboarding-step-1">
            <div className="onboarding-banner">
              <span className="onboarding-hero-icon" aria-hidden="true">🎓</span>
              <div>
                <h3 className="onboarding-heading">{t('onboard_step1_heading')}</h3>
                <p className="onboarding-sub">{t('onboard_step1_subtitle')}</p>
              </div>
            </div>

            <div className="onboarding-cards-grid" role="radiogroup" aria-label="Academic Focus Choice">
              <div
                className={`onboarding-select-card ${academicFocus === 'org' ? 'card-selected' : ''}`}
                onClick={() => setAcademicFocus('org')}
                role="radio"
                aria-checked={academicFocus === 'org'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setAcademicFocus('org'); }}
              >
                <div className="card-top-icon">🗂️</div>
                <div className="card-text-block">
                  <strong>{t('onboard_help_org')}</strong>
                  <p>{t('onboard_help_org_desc')}</p>
                </div>
              </div>

              <div
                className={`onboarding-select-card ${academicFocus === 'catchup' ? 'card-selected' : ''}`}
                onClick={() => setAcademicFocus('catchup')}
                role="radio"
                aria-checked={academicFocus === 'catchup'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setAcademicFocus('catchup'); }}
              >
                <div className="card-top-icon">🏃</div>
                <div className="card-text-block">
                  <strong>{t('onboard_help_catchup')}</strong>
                  <p>{t('onboard_help_catchup_desc')}</p>
                </div>
              </div>

              <div
                className={`onboarding-select-card ${academicFocus === 'exam' ? 'card-selected' : ''}`}
                onClick={() => setAcademicFocus('exam')}
                role="radio"
                aria-checked={academicFocus === 'exam'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setAcademicFocus('exam'); }}
              >
                <div className="card-top-icon">🎯</div>
                <div className="card-text-block">
                  <strong>{t('onboard_help_exam')}</strong>
                  <p>{t('onboard_help_exam_desc')}</p>
                </div>
              </div>

              <div
                className={`onboarding-select-card ${academicFocus === 'all' ? 'card-selected' : ''}`}
                onClick={() => setAcademicFocus('all')}
                role="radio"
                aria-checked={academicFocus === 'all'}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setAcademicFocus('all'); }}
              >
                <div className="card-top-icon">🌟</div>
                <div className="card-text-block">
                  <strong>{t('onboard_help_all')}</strong>
                  <p>{t('onboard_help_all_desc')}</p>
                </div>
              </div>
            </div>

            <div className="accessible-form" style={{ marginTop: '20px' }}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="onboard-name" className="form-label">{t('onboard_student_name_label')}</label>
                  <input
                    id="onboard-name"
                    type="text"
                    className="form-input"
                    placeholder={t('onboard_student_name_placeholder')}
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="onboard-prog" className="form-label">{t('onboard_program_label')}</label>
                  <input
                    id="onboard-prog"
                    type="text"
                    className="form-input"
                    placeholder={t('onboard_program_placeholder')}
                    value={program}
                    onChange={(e) => setProgram(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="onboard-term" className="form-label">{t('onboard_semester_label')}</label>
                <input
                  id="onboard-term"
                  type="text"
                  className="form-input"
                  placeholder={t('onboard_semester_placeholder')}
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Add Courses (Manual, Syllabus, or Sample) */}
        {step === 2 && (
          <div className="onboarding-step-view" data-testid="onboarding-step-2">
            <div className="onboarding-banner">
              <span className="onboarding-hero-icon" aria-hidden="true">📚</span>
              <div>
                <h3 className="onboarding-heading">{t('onboard_step2_heading')}</h3>
                <p className="onboarding-sub">{t('onboard_step2_subtitle')}</p>
              </div>
            </div>

            {/* Current enrolled courses list */}
            <div className="onboarding-active-items-box">
              <div className="items-box-header">
                <strong>Enrolled Courses ({courses.length})</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {courses.length === 0 ? t('onboard_no_courses_yet') : 'Ready for coaching'}
                </span>
              </div>
              {courses.length > 0 && (
                <div className="onboarding-course-chips">
                  {courses.map((c) => (
                    <div key={c.id || c.name} className="onboarding-course-chip">
                      <span className="chip-code">{c.name}</span>
                      <span className="chip-name">{c.title || c.name}</span>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => deleteCourse(c.id)}
                        title="Remove course"
                        aria-label={`Remove course ${c.name}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action buttons to add courses */}
            <div className="onboarding-course-actions-grid">
              {/* Option A: Quick manual entry */}
              <div className="onboarding-action-card">
                <h4>{t('onboard_btn_manual_course')}</h4>
                <form onSubmit={handleAddManualCourse} className="accessible-form" style={{ marginTop: '10px' }}>
                  <div className="form-group">
                    <label htmlFor="onboard-code" className="form-label">{t('onboard_manual_code')}</label>
                    <input
                      id="onboard-code"
                      type="text"
                      className="form-input"
                      placeholder="e.g. CSI2110"
                      value={manualCode}
                      onChange={(e) => setManualCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="onboard-cname" className="form-label">{t('onboard_manual_name')}</label>
                    <input
                      id="onboard-cname"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Data Structures & Algorithms"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary" disabled={!manualCode.trim()}>
                    + {t('onboard_add_course_btn')}
                  </button>
                </form>
              </div>

              {/* Option B: Upload Syllabus or Load Samples */}
              <div className="onboarding-action-card">
                <h4>{t('onboard_btn_upload_syllabus')}</h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '8px 0 14px' }}>
                  Upload a PDF or text file to extract assessments, topics, and deadlines with our verified review screen.
                </p>
                <label className="btn btn-sm btn-secondary" style={{ display: 'inline-block', cursor: 'pointer', marginBottom: '12px' }}>
                  📁 Choose Syllabus File
                  <input
                    type="file"
                    accept=".pdf,.txt,.docx"
                    style={{ display: 'none' }}
                    onChange={handleSyllabusFileUpload}
                    disabled={isUploadingSyllabus}
                  />
                </label>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Want to explore immediately with pre-configured courses?
                  </p>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={handleLoadSampleSyllabi}
                    disabled={isUploadingSyllabus}
                  >
                    {t('onboard_btn_load_samples')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Weekly Class Timetable */}
        {step === 3 && (
          <div className="onboarding-step-view" data-testid="onboarding-step-3">
            <div className="onboarding-banner">
              <span className="onboarding-hero-icon" aria-hidden="true">📅</span>
              <div>
                <h3 className="onboarding-heading">{t('onboard_step3_heading')}</h3>
                <p className="onboarding-sub">{t('onboard_step3_subtitle')}</p>
              </div>
            </div>

            {/* Current timetable entries */}
            <div className="onboarding-active-items-box">
              <div className="items-box-header">
                <strong>Scheduled Classes ({timetable.length})</strong>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {timetable.length === 0 ? t('onboard_tt_no_classes') : 'Lectures and Labs registered'}
                </span>
              </div>
              {timetable.length > 0 && (
                <div className="onboarding-tt-list">
                  {timetable.map((item) => (
                    <div key={item.id} className="onboarding-tt-item">
                      <span className="tt-badge">{item.courseCode}</span>
                      <span className="tt-day-time">{item.dayOfWeek} {item.startTime} - {item.endTime}</span>
                      <span className="tt-type">{item.activityType}</span>
                      <button
                        type="button"
                        className="chip-remove"
                        onClick={() => deleteTimetableEntry(item.id)}
                        aria-label={`Remove timetable entry for ${item.courseCode}`}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick manual entry form */}
            <form onSubmit={handleAddTimetableEntry} className="accessible-form onboarding-tt-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tt-course-select" className="form-label">{t('onboard_tt_course')}</label>
                  {courses.length > 0 ? (
                    <select
                      id="tt-course-select"
                      className="form-select"
                      value={ttCourseCode}
                      onChange={(e) => setTtCourseCode(e.target.value)}
                    >
                      {courses.map((c) => (
                        <option key={c.id || c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="tt-course-select"
                      type="text"
                      className="form-input"
                      placeholder="e.g. CSI2110"
                      value={ttCourseCode}
                      onChange={(e) => setTtCourseCode(e.target.value)}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="tt-day-select" className="form-label">{t('onboard_tt_day')}</label>
                  <select
                    id="tt-day-select"
                    className="form-select"
                    value={ttDay}
                    onChange={(e) => setTtDay(e.target.value)}
                  >
                    {DAY_NAMES.slice(0, 5).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="tt-start-time" className="form-label">{t('onboard_tt_start')}</label>
                  <input
                    id="tt-start-time"
                    type="time"
                    className="form-input"
                    value={ttStartTime}
                    onChange={(e) => setTtStartTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tt-end-time" className="form-label">{t('onboard_tt_end')}</label>
                  <input
                    id="tt-end-time"
                    type="time"
                    className="form-input"
                    value={ttEndTime}
                    onChange={(e) => setTtEndTime(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="tt-act-type" className="form-label">{t('onboard_tt_type')}</label>
                  <select
                    id="tt-act-type"
                    className="form-select"
                    value={ttActivityType}
                    onChange={(e) => setTtActivityType(e.target.value)}
                  >
                    <option value={ACTIVITY_TYPES.LECTURE}>Lecture</option>
                    <option value={ACTIVITY_TYPES.LAB}>Laboratory</option>
                    <option value={ACTIVITY_TYPES.TUTORIAL}>Tutorial / DGD</option>
                    <option value={ACTIVITY_TYPES.SEMINAR}>Seminar</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '10px' }}>
                <button type="submit" className="btn btn-sm btn-primary">
                  + {t('onboard_tt_add_btn')}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={handleLoadSampleTimetable}
                >
                  ⚡ {t('onboard_tt_load_sample')}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STEP 4: Availability & Preferences */}
        {step === 4 && (
          <div className="onboarding-step-view" data-testid="onboarding-step-4">
            <div className="onboarding-banner">
              <span className="onboarding-hero-icon" aria-hidden="true">⏱️</span>
              <div>
                <h3 className="onboarding-heading">{t('onboard_step4_heading')}</h3>
                <p className="onboarding-sub">{t('onboard_step4_subtitle')}</p>
              </div>
            </div>

            <div className="accessible-form">
              <div className="form-group">
                <label className="form-label">{t('onboard_study_periods')}</label>
                <div className="checkbox-options-row">
                  <label className="checkbox-chip">
                    <input
                      type="checkbox"
                      checked={preferredPeriods.includes('morning')}
                      onChange={() => togglePeriod('morning')}
                    />
                    <span>{t('onboard_period_morning')}</span>
                  </label>
                  <label className="checkbox-chip">
                    <input
                      type="checkbox"
                      checked={preferredPeriods.includes('afternoon')}
                      onChange={() => togglePeriod('afternoon')}
                    />
                    <span>{t('onboard_period_afternoon')}</span>
                  </label>
                  <label className="checkbox-chip">
                    <input
                      type="checkbox"
                      checked={preferredPeriods.includes('evening')}
                      onChange={() => togglePeriod('evening')}
                    />
                    <span>{t('onboard_period_evening')}</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="onboard-work-hrs" className="form-label">{t('onboard_work_hours')}</label>
                  <input
                    id="onboard-work-hrs"
                    type="number"
                    min="0"
                    max="60"
                    className="form-input"
                    value={weeklyWorkHours}
                    onChange={(e) => setWeeklyWorkHours(e.target.value)}
                  />
                  <span className="field-hint">Hours reserved before placing study sessions.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="onboard-study-goal" className="form-label">{t('onboard_study_goal_hours')}</label>
                  <input
                    id="onboard-study-goal"
                    type="number"
                    min="5"
                    max="60"
                    className="form-input"
                    value={weeklyStudyGoalHours}
                    onChange={(e) => setWeeklyStudyGoalHours(e.target.value)}
                  />
                  <span className="field-hint">Realistic target distributed across the week.</span>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="onboard-org-style" className="form-label">{t('onboard_org_level')}</label>
                  <select
                    id="onboard-org-style"
                    className="form-select"
                    value={organizationLevel}
                    onChange={(e) => setOrganizationLevel(e.target.value)}
                  >
                    <option value="Building Habits">{t('onboard_org_habits')}</option>
                    <option value="Moderately Organized">{t('onboard_org_moderate')}</option>
                    <option value="Highly Structured">{t('onboard_org_structured')}</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="onboard-lang-select" className="form-label">{t('prof_language')}</label>
                  <select
                    id="onboard-lang-select"
                    className="form-select"
                    value={language}
                    onChange={(e) => changeLanguage(e.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="fr">Français (French)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Summary & Adaptive Plan Generation */}
        {step === 5 && (
          <div className="onboarding-step-view" data-testid="onboarding-step-5">
            <div className="onboarding-banner">
              <span className="onboarding-hero-icon" aria-hidden="true">🚀</span>
              <div>
                <h3 className="onboarding-heading">{t('onboard_step5_heading')}</h3>
                <p className="onboarding-sub">{t('onboard_step5_subtitle')}</p>
              </div>
            </div>

            <div className="onboarding-summary-card">
              <div className="summary-row">
                <span className="summary-lbl">{t('onboard_summary_goal')}</span>
                <strong className="summary-val">
                  {academicFocus === 'org' && t('onboard_help_org')}
                  {academicFocus === 'catchup' && t('onboard_help_catchup')}
                  {academicFocus === 'exam' && t('onboard_help_exam')}
                  {academicFocus === 'all' && t('onboard_help_all')}
                </strong>
              </div>
              <div className="summary-row">
                <span className="summary-lbl">{t('onboard_summary_courses')}</span>
                <strong className="summary-val">
                  {courses.length > 0 ? `${courses.length} courses (${courses.map((c) => c.name).join(', ')})` : '0 (can add anytime)'}
                </strong>
              </div>
              <div className="summary-row">
                <span className="summary-lbl">{t('onboard_summary_timetable')}</span>
                <strong className="summary-val">{timetable.length} scheduled class block(s)</strong>
              </div>
              <div className="summary-row">
                <span className="summary-lbl">{t('onboard_summary_study_target')}</span>
                <strong className="summary-val">{weeklyStudyGoalHours} hours/week ({preferredPeriods.join(', ')})</strong>
              </div>
              <div className="summary-row">
                <span className="summary-lbl">Buffer & Employment:</span>
                <strong className="summary-val">{weeklyWorkHours} hrs work / 15-min class transit buffer</strong>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleCompleteOnboarding}
                style={{ padding: '14px 28px', fontSize: '16px', fontWeight: 700 }}
              >
                {t('onboard_generate_plan')}
              </button>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Actions */}
        <div className="onboarding-footer-actions">
          <div className="actions-left">
            {step > 1 && (
              <button type="button" className="btn btn-secondary" onClick={handleBack}>
                ← {t('onboard_back')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-outline"
              onClick={saveDraft}
              title="Save current progress and resume anytime"
            >
              💾 {t('onboard_save_resume')}
            </button>
          </div>

          <div className="actions-right">
            {(step === 2 || step === 3) && (
              <button type="button" className="btn btn-secondary btn-ghost" onClick={handleSkip}>
                {t('onboard_skip_step')}
              </button>
            )}

            {step < 5 ? (
              <button type="button" className="btn btn-primary" onClick={handleNext}>
                {t('onboard_continue')} →
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default OnboardingModal;
