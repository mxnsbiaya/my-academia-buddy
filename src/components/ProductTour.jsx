import { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/useApp';
import { useAuth } from '../context/useAuth';
import { t } from '../services/i18n';

export function ProductTour() {
  const { user } = useAuth();
  const { isProductTourOpen, closeProductTour } = useApp();
  const userId = user?.id || 'guest';
  const tourKey = `mab_tour_completed_${userId}`;

  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const steps = useMemo(
    () => [
      {
        id: 'hero-recommendation',
        selector: '[data-tour="hero-recommendation"]',
        title: t('tour_step1_title'),
        desc: t('tour_step1_desc'),
        badge: '🎯 Priority 1',
      },
      {
        id: 'upcoming-deadlines',
        selector: '[data-tour="upcoming-deadlines"]',
        title: t('tour_step2_title'),
        desc: t('tour_step2_desc'),
        badge: '⏳ Deadlines',
      },
      {
        id: 'quick-actions',
        selector: '[data-tour="quick-actions"]',
        title: t('tour_step3_title'),
        desc: t('tour_step3_desc'),
        badge: '➕ Syllabi & Tasks',
      },
      {
        id: 'task-lifecycle',
        selector: '[data-tour="focus-sessions"]',
        title: t('tour_step4_title'),
        desc: t('tour_step4_desc'),
        badge: '✅ Task Lifecycle',
      },
      {
        id: 'checkin-trigger',
        selector: '[data-tour="checkin-trigger"]',
        title: t('tour_step5_title'),
        desc: t('tour_step5_desc'),
        badge: '🧭 Weekly Calibration',
      },
      {
        id: 'profile-trigger',
        selector: '[data-tour="profile-trigger"]',
        title: t('tour_step6_title'),
        desc: t('tour_step6_desc'),
        badge: '⚙️ Timetable & Buffers',
      },
    ],
    []
  );

  // Update target rect for spotlight
  useEffect(() => {
    if (!isProductTourOpen) return;

    const timer = setTimeout(() => {
      const currentSelector = steps[currentStep]?.selector;
      if (currentSelector) {
        const el = document.querySelector(currentSelector);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          const rect = el.getBoundingClientRect();
          setTargetRect({
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
          });
          return;
        }
      }
      setTargetRect(null);
    }, 40);

    return () => clearTimeout(timer);
  }, [isProductTourOpen, currentStep, steps]);

  if (!isProductTourOpen) return null;

  const stepData = steps[currentStep];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    try {
      window.localStorage.setItem(tourKey, 'true');
    } catch {
      // Ignore
    }
    closeProductTour();
    setCurrentStep(0);
  };

  return (
    <div className="product-tour-overlay" data-testid="product-tour-modal">
      {/* Target spotlight glow if element is located */}
      {targetRect && (
        <div
          className="tour-spotlight-box"
          style={{
            top: `${Math.max(10, targetRect.top - 6)}px`,
            left: `${Math.max(10, targetRect.left - 6)}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* Floating Tour Tooltip Card */}
      <div className="tour-card" role="dialog" aria-modal="true" aria-label="Product Tour">
        <div className="tour-card-header">
          <span className="tour-step-badge">{stepData.badge}</span>
          <span className="tour-step-counter">
            {currentStep + 1} / {steps.length}
          </span>
          <button
            type="button"
            className="tour-close-btn"
            onClick={handleComplete}
            aria-label="Close tour"
          >
            ✕
          </button>
        </div>

        <div className="tour-card-body">
          <h3 className="tour-step-title">{stepData.title}</h3>
          <p className="tour-step-desc">{stepData.desc}</p>
        </div>

        <div className="tour-card-footer">
          <button
            type="button"
            className="btn btn-sm btn-ghost"
            onClick={handleComplete}
          >
            {t('tour_skip')}
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={handlePrev}
              >
                {t('tour_prev')}
              </button>
            )}
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={handleNext}
            >
              {currentStep === steps.length - 1 ? t('tour_finish') : t('tour_next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductTour;
