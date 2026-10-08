import { useState } from 'react';
import { useApp } from '../context/useApp';
import { Modal } from './Modal';

export function OnboardingModal({ isOpen, onClose }) {
  const { studentProfile, updateStudentProfile, loadDemoData } = useApp();

  const [step, setStep] = useState(1);
  const [program, setProgram] = useState(studentProfile?.program || 'Computer Science');
  const [semester, setSemester] = useState(studentProfile?.semester || 'Year 2, Fall Term');
  const [organizationLevel, setOrganizationLevel] = useState('Building Habits');
  const [weeklyWorkHours, setWeeklyWorkHours] = useState('10');
  const [weeklyStudyGoalHours, setWeeklyStudyGoalHours] = useState('18');
  const [academicGoal, setAcademicGoal] = useState('Build steady study habits and balance my courses without cramming');

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = (useDemo = false) => {
    if (useDemo) {
      loadDemoData();
    } else {
      updateStudentProfile({
        program,
        semester,
        organizationLevel,
        weeklyWorkHours: Number(weeklyWorkHours) || 0,
        weeklyStudyGoalHours: Number(weeklyStudyGoalHours) || 18,
        academicGoal,
        onboardingCompleted: true,
      });
    }
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Welcome to My Academia Buddy 2.0">
      <div className="onboarding-modal-content">
        <div className="onboarding-step-indicator">
          <div className={`step-dot ${step >= 1 ? 'dot-active' : ''}`}>1. Program</div>
          <div className="step-connector" />
          <div className={`step-dot ${step >= 2 ? 'dot-active' : ''}`}>2. Commitments</div>
          <div className="step-connector" />
          <div className={`step-dot ${step >= 3 ? 'dot-active' : ''}`}>3. Goals</div>
        </div>

        {step === 1 && (
          <div className="onboarding-step-body">
            <h3 className="step-heading">Tell your coach about your academic semester</h3>
            <p className="step-subtitle">
              Your coach adapts recommendations based on your degree and current academic workload.
            </p>

            <div className="accessible-form">
              <div className="form-group">
                <label htmlFor="onboard-program" className="form-label">
                  Program of Study
                </label>
                <input
                  id="onboard-program"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Software Engineering (B.A.Sc.)"
                  value={program}
                  onChange={(e) => setProgram(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="onboard-sem" className="form-label">
                  Academic Term / Semester
                </label>
                <input
                  id="onboard-sem"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Year 2, Fall Term"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step-body">
            <h3 className="step-heading">Your commitments & employment</h3>
            <p className="step-subtitle">
              A realistic study schedule respects work hours, commute, and personal commitments so you avoid burnout.
            </p>

            <div className="accessible-form">
              <div className="form-group">
                <label htmlFor="onboard-work" className="form-label">
                  Weekly Employment / Job Hours
                </label>
                <input
                  id="onboard-work"
                  type="number"
                  min="0"
                  max="60"
                  className="form-input"
                  placeholder="10"
                  value={weeklyWorkHours}
                  onChange={(e) => setWeeklyWorkHours(e.target.value)}
                />
                <span className="field-hint">
                  The planner will reserve your employment hours before scheduling study blocks.
                </span>
              </div>

              <div className="form-group">
                <label htmlFor="onboard-org" className="form-label">
                  How do you currently organize your studies?
                </label>
                <select
                  id="onboard-org"
                  className="form-select"
                  value={organizationLevel}
                  onChange={(e) => setOrganizationLevel(e.target.value)}
                >
                  <option value="Building Habits">Building Habits (Looking for structured guidance)</option>
                  <option value="Moderately Organized">Moderately Organized (Comfortable with weekly deadlines)</option>
                  <option value="Highly Structured">Highly Structured (Prefers tight scheduling)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-step-body">
            <h3 className="step-heading">Your study goal & priorities</h3>
            <p className="step-subtitle">
              Set an achievable weekly target and your primary academic ambition.
            </p>

            <div className="accessible-form">
              <div className="form-group">
                <label htmlFor="onboard-goal-hours" className="form-label">
                  Target Study Hours per Week
                </label>
                <input
                  id="onboard-goal-hours"
                  type="number"
                  min="5"
                  max="50"
                  className="form-input"
                  value={weeklyStudyGoalHours}
                  onChange={(e) => setWeeklyStudyGoalHours(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="onboard-goal" className="form-label">
                  Primary Goal for this Term
                </label>
                <textarea
                  id="onboard-goal"
                  rows="2"
                  className="form-textarea"
                  value={academicGoal}
                  onChange={(e) => setAcademicGoal(e.target.value)}
                />
              </div>
            </div>

            <div className="demo-option-box">
              <p>
                <strong>Want to see the coach in action immediately?</strong> You can load our realistic pre-configured computer science semester dataset (SEG2105, CSI2110, MAT1348 with weekly syllabus topics and check-in history).
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => handleFinish(true)}
              >
                ✨ Load Sample University Dataset
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions">
          {step > 1 && (
            <button type="button" className="btn btn-secondary" onClick={handleBack}>
              Back
            </button>
          )}

          {step < 3 ? (
            <button type="button" className="btn btn-primary" onClick={handleNext}>
              Next Step →
            </button>
          ) : (
            <button type="button" className="btn btn-primary" onClick={() => handleFinish(false)}>
              Complete Setup & Open Coach
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

export default OnboardingModal;
