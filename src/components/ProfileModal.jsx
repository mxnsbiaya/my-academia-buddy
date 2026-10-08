import { useState } from 'react';
import { useApp } from '../context/useApp';
import { Modal } from './Modal';

function ProfileForm({ studentProfile, onSave, onCancel }) {
  const [program, setProgram] = useState(studentProfile?.program || '');
  const [semester, setSemester] = useState(studentProfile?.semester || '');
  const [organizationLevel, setOrganizationLevel] = useState(
    studentProfile?.organizationLevel || 'Building Habits'
  );
  const [preferredStudyPeriods, setPreferredStudyPeriods] = useState(
    studentProfile?.preferredStudyPeriods || ['afternoon', 'evening']
  );
  const [weeklyWorkHours, setWeeklyWorkHours] = useState(
    String(studentProfile?.weeklyWorkHours ?? 10)
  );
  const [workScheduleSummary, setWorkScheduleSummary] = useState(
    studentProfile?.workScheduleSummary || ''
  );
  const [weeklyStudyGoalHours, setWeeklyStudyGoalHours] = useState(
    String(studentProfile?.weeklyStudyGoalHours ?? 18)
  );
  const [academicGoal, setAcademicGoal] = useState(studentProfile?.academicGoal || '');

  const togglePeriod = (period) => {
    setPreferredStudyPeriods((prev) =>
      prev.includes(period) ? prev.filter((p) => p !== period) : [...prev, period]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      program: program.trim(),
      semester: semester.trim(),
      organizationLevel,
      preferredStudyPeriods,
      weeklyWorkHours: Number(weeklyWorkHours) || 0,
      workScheduleSummary: workScheduleSummary.trim(),
      weeklyStudyGoalHours: Number(weeklyStudyGoalHours) || 15,
      academicGoal: academicGoal.trim(),
      onboardingCompleted: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="accessible-form">
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="prof-program" className="form-label">
            Academic Program
          </label>
          <input
            id="prof-program"
            type="text"
            className="form-input"
            placeholder="e.g. Computer Science (B.Sc.)"
            value={program}
            onChange={(e) => setProgram(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-semester" className="form-label">
            Current Semester / Term
          </label>
          <input
            id="prof-semester"
            type="text"
            className="form-input"
            placeholder="e.g. Year 2, Fall Term"
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="prof-org-level" className="form-label">
          Current Organization Approach
        </label>
        <select
          id="prof-org-level"
          className="form-select"
          value={organizationLevel}
          onChange={(e) => setOrganizationLevel(e.target.value)}
        >
          <option value="Building Habits">Building Habits (Needs guidance & consistent pacing)</option>
          <option value="Moderately Organized">Moderately Organized (Comfortable with weekly milestones)</option>
          <option value="Highly Structured">Highly Structured (Prefers tight, detailed time blocks)</option>
        </select>
        <span className="field-hint">
          This is used as an initial planning baseline and will adapt automatically to your real study habits.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Preferred Study Periods</label>
        <div className="checkbox-options-row">
          <label className="checkbox-chip">
            <input
              type="checkbox"
              checked={preferredStudyPeriods.includes('morning')}
              onChange={() => togglePeriod('morning')}
            />
            <span>🌅 Morning (08:00 - 12:00)</span>
          </label>

          <label className="checkbox-chip">
            <input
              type="checkbox"
              checked={preferredStudyPeriods.includes('afternoon')}
              onChange={() => togglePeriod('afternoon')}
            />
            <span>☀️ Afternoon (13:00 - 17:00)</span>
          </label>

          <label className="checkbox-chip">
            <input
              type="checkbox"
              checked={preferredStudyPeriods.includes('evening')}
              onChange={() => togglePeriod('evening')}
            />
            <span>🌙 Evening (18:00 - 22:00)</span>
          </label>
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="prof-work-hours" className="form-label">
            Weekly Employment (Hours)
          </label>
          <input
            id="prof-work-hours"
            type="number"
            min="0"
            max="60"
            className="form-input"
            placeholder="10"
            value={weeklyWorkHours}
            onChange={(e) => setWeeklyWorkHours(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label htmlFor="prof-study-goal" className="form-label">
            Weekly Study Target (Hours)
          </label>
          <input
            id="prof-study-goal"
            type="number"
            min="5"
            max="60"
            className="form-input"
            placeholder="18"
            value={weeklyStudyGoalHours}
            onChange={(e) => setWeeklyStudyGoalHours(e.target.value)}
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="prof-work-summary" className="form-label">
          Employment Schedule & Commitments
        </label>
        <input
          id="prof-work-summary"
          type="text"
          className="form-input"
          placeholder="e.g. Part-time shifts Tue/Thu evening, plus campus commute"
          value={workScheduleSummary}
          onChange={(e) => setWorkScheduleSummary(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="prof-goal" className="form-label">
          Primary Academic Goal for the Term
        </label>
        <textarea
          id="prof-goal"
          rows="2"
          className="form-textarea"
          placeholder="e.g. Stay ahead of CSI2110 assignments and prepare for midterms without last-minute stress"
          value={academicGoal}
          onChange={(e) => setAcademicGoal(e.target.value)}
        />
      </div>

      <div className="modal-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">
          Save Academic Preferences
        </button>
      </div>
    </form>
  );
}

export function ProfileModal({ isOpen, onClose }) {
  const { studentProfile, updateStudentProfile, adaptiveSignals } = useApp();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Student Profile & Coach Preferences">
      <div className="profile-modal-container">
        {/* Observed Adaptive Signals Section */}
        <div className="profile-section" style={{ marginBottom: '18px' }}>
          <h3 className="profile-section-title">Observed Adaptive Signals</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '4px 0 10px' }}>
            These heuristics reflect your observable pace and adapt dynamically without rigid labels.
          </p>
          <div className="signals-grid">
            <div className="signal-card">
              <span className="signal-label">Completion Consistency</span>
              <strong className="signal-val">{adaptiveSignals?.taskCompletionConsistency ?? 85}%</strong>
              <span className="signal-desc">Based on task and check-in follow-through</span>
            </div>
            <div className="signal-card">
              <span className="signal-label">Pace Buffer Multiplier</span>
              <strong className="signal-val">{adaptiveSignals?.paceMultiplier ?? 1.0}x</strong>
              <span className="signal-desc">Extra breathing room added to sessions</span>
            </div>
          </div>
        </div>

        <p className="profile-intro-text">
          Your profile informs how your study planner balances coursework, employment, and personal commitments. You can modify these anytime as your semester evolves.
        </p>

        {isOpen && (
          <ProfileForm
            studentProfile={studentProfile}
            onSave={(updated) => {
              updateStudentProfile(updated);
              onClose();
            }}
            onCancel={onClose}
          />
        )}
      </div>
    </Modal>
  );
}

export default ProfileModal;
