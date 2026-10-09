import { Modal } from './Modal';
import { useApp } from '../context/useApp';
import { t } from '../services/i18n';

export function HelpModal({ isOpen, onClose }) {
  const { startProductTour, openOnboardingModal } = useApp();

  const handleRestartTour = () => {
    onClose();
    setTimeout(() => {
      startProductTour();
    }, 200);
  };

  const handleReopenOnboarding = () => {
    onClose();
    setTimeout(() => {
      openOnboardingModal();
    }, 200);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('help_modal_title')}
      data-testid="help-modal"
    >
      <div className="help-modal-content">
        <div className="help-intro">
          <p>
            <strong>My Academia Buddy</strong> is an intelligent academic coach that turns your course syllabi, class schedules, and deadlines into an adaptive, realistic study plan.
          </p>
        </div>

        <div className="help-features-grid">
          <div className="help-feature-card">
            <span className="feature-icon">🎯</span>
            <h4>Adaptive Study Engine</h4>
            <p>
              Your coach schedules realistic study sessions around your lecture hours and employment. It automatically injects transition buffers (+15-20%) so you never burn out.
            </p>
          </div>

          <div className="help-feature-card">
            <span className="feature-icon">📄</span>
            <h4>Accurate Syllabus Import</h4>
            <p>
              Extract assignments, exams, and weekly reading topics from PDF syllabi. A mandatory verification screen ensures grading policies (e.g. 40% weights) never create fake assignments.
            </p>
          </div>

          <div className="help-feature-card">
            <span className="feature-icon">🧭</span>
            <h4>Weekly Academic Check-In</h4>
            <p>
              Spend 2 minutes each week recording class attendance, tricky topics, and newly announced assignments. The coach automatically recalibrates your pace.
            </p>
          </div>

          <div className="help-feature-card">
            <span className="feature-icon">✅</span>
            <h4>Task Lifecycle & History</h4>
            <p>
              Confirm task completion directly with &quot;Work completed&quot; vs &quot;Submitted&quot; tags. Completed tasks move to the History tab and can be reopened anytime.
            </p>
          </div>
        </div>

        <div className="help-modal-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleRestartTour}
          >
            {t('help_restart_tour')}
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleReopenOnboarding}
          >
            {t('help_reopen_onboarding')}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default HelpModal;
