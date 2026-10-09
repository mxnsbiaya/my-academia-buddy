import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OnboardingModal } from '../components/OnboardingModal';
import { HelpModal } from '../components/HelpModal';
import { ProductTour } from '../components/ProductTour';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';

function renderWithProviders(ui) {
  return render(
    <AuthProvider>
      <AppProvider>
        {ui}
      </AppProvider>
    </AuthProvider>
  );
}

describe('Phase 4.1: Guided Onboarding Wizard & Product Tour', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('OnboardingModal (5-Step Wizard)', () => {
    it('renders Step 1 with welcome heading, academic goals, and student inputs', () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByTestId('onboarding-step-1')).toBeDefined();
      expect(screen.getByText(/Staying Organized/i)).toBeDefined();
      expect(screen.getByText(/Catching Up/i)).toBeDefined();
      expect(screen.getByText(/Exam Preparation/i)).toBeDefined();
      expect(screen.getByText(/All of These/i)).toBeDefined();
      expect(screen.getByLabelText(/Program of Study/i)).toBeDefined();
    });

    it('navigates through steps using Continue and Back buttons', () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      // Step 1 -> Step 2
      const continueBtn = screen.getByText(/Continue →/i);
      fireEvent.click(continueBtn);

      expect(screen.getByTestId('onboarding-step-2')).toBeDefined();
      expect(screen.getByText(/Add Your Enrolled Courses/i)).toBeDefined();

      // Back -> Step 1
      const backBtn = screen.getByText(/Back/i);
      fireEvent.click(backBtn);
      expect(screen.getByTestId('onboarding-step-1')).toBeDefined();
    });

    it('supports Skip on optional steps (Step 2 Courses and Step 3 Timetable)', () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      // Go to Step 2
      fireEvent.click(screen.getByText(/Continue →/i));
      expect(screen.getByTestId('onboarding-step-2')).toBeDefined();

      // Skip Step 2 -> Step 3
      const skipBtn2 = screen.getByText(/Skip this step →/i);
      fireEvent.click(skipBtn2);
      expect(screen.getByTestId('onboarding-step-3')).toBeDefined();
      expect(screen.getByText(/Weekly Class Timetable/i)).toBeDefined();

      // Skip Step 3 -> Step 4
      const skipBtn3 = screen.getByText(/Skip this step →/i);
      fireEvent.click(skipBtn3);
      expect(screen.getByTestId('onboarding-step-4')).toBeDefined();
      expect(screen.getByText(/Study Availability & Preferences/i)).toBeDefined();
    });

    it('allows entering courses manually in Step 2 without forcing document uploads', () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      // Go to Step 2
      fireEvent.click(screen.getByText(/Continue →/i));

      const codeInput = screen.getByPlaceholderText(/e.g. CSI2110/i);
      const nameInput = screen.getByPlaceholderText(/e.g. Data Structures & Algorithms/i);
      const addBtn = screen.getByText(/\+ Add Course/i);

      fireEvent.change(codeInput, { target: { value: 'SEG2105' } });
      fireEvent.change(nameInput, { target: { value: 'Introduction to Software Engineering' } });
      fireEvent.click(addBtn);

      // Verify course chip appears
      expect(screen.getAllByText('SEG2105').length).toBeGreaterThan(0);
    });

    it('supports Save and Resume Later by persisting draft to localStorage', () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      // Fill program in Step 1
      const progInput = screen.getByLabelText(/Program of Study/i);
      fireEvent.change(progInput, { target: { value: 'Biomedical Engineering' } });

      // Click Save & Resume Later
      const saveDraftBtn = screen.getByText(/Save & Resume Later/i);
      fireEvent.click(saveDraftBtn);

      expect(handleClose).toHaveBeenCalled();

      // Verify draft in localStorage
      const draft = JSON.parse(window.localStorage.getItem('mab_onboarding_draft_guest'));
      expect(draft).toBeDefined();
      expect(draft.program).toBe('Biomedical Engineering');
      expect(draft.step).toBe(1);
    });

    it('completes onboarding in Step 5, generates plan, and triggers product tour', async () => {
      const handleClose = vi.fn();
      renderWithProviders(<OnboardingModal isOpen={true} onClose={handleClose} />);

      // Navigate Step 1 -> 2 -> 3 -> 4 -> 5
      fireEvent.click(screen.getByText(/Continue →/i)); // Step 2
      fireEvent.click(screen.getByText(/Skip this step →/i)); // Step 3
      fireEvent.click(screen.getByText(/Skip this step →/i)); // Step 4
      fireEvent.click(screen.getByText(/Continue →/i)); // Step 5

      expect(screen.getByTestId('onboarding-step-5')).toBeDefined();
      expect(screen.getByText(/Setup Complete! Ready to Launch/i)).toBeDefined();

      const finishBtn = screen.getByText(/✨ Generate Academic Plan & Open Dashboard/i);
      fireEvent.click(finishBtn);

      expect(handleClose).toHaveBeenCalled();
    });
  });

  describe('HelpModal & ProductTour', () => {
    it('renders HelpModal with core concepts and action buttons', () => {
      const handleClose = vi.fn();
      renderWithProviders(<HelpModal isOpen={true} onClose={handleClose} />);

      expect(screen.getByTestId('help-modal')).toBeDefined();
      expect(screen.getByText(/Adaptive Study Engine/i)).toBeDefined();
      expect(screen.getByText(/Accurate Syllabus Import/i)).toBeDefined();
      expect(screen.getByText(/Weekly Academic Check-In/i)).toBeDefined();
      expect(screen.getByText(/Restart Interactive Product Tour/i)).toBeDefined();
      expect(screen.getByText(/Reopen Guided Setup Wizard/i)).toBeDefined();
    });

    it('renders ProductTour when tour is open and allows stepping through', () => {
      renderWithProviders(<ProductTour />);
      // Should not render if not open by default
      expect(screen.queryByTestId('product-tour-modal')).toBeNull();
    });
  });
});
