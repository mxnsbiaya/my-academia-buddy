import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppProvider } from '../context/AppContext';
import Courses from '../pages/Courses';
import Assignments from '../pages/Assignments';
import Exams from '../pages/Exams';
import Dashboard from '../pages/Dashboard';

function renderWithProviders(ui) {
  return render(
    <AppProvider>
      <MemoryRouter>{ui}</MemoryRouter>
    </AppProvider>
  );
}

describe('Component Integration Tests', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('Courses Page', () => {
    it('renders empty state initially and adds a new course with difficulty', () => {
      renderWithProviders(<Courses />);

      expect(screen.getByText(/No courses added yet/i)).toBeInTheDocument();

      const nameInput = screen.getByLabelText(/Course Code & Name/i);
      const difficultySelect = screen.getByLabelText(/Difficulty Tier/i);
      const submitBtn = screen.getByRole('button', { name: /Add Course to Workspace/i });

      fireEvent.change(nameInput, { target: { value: 'SEG2105' } });
      fireEvent.change(difficultySelect, { target: { value: 'High' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('SEG2105')).toBeInTheDocument();
      expect(screen.getByText(/High Difficulty/i)).toBeInTheDocument();
    });

    it('shows inline validation error when submitting empty course name', () => {
      renderWithProviders(<Courses />);

      const submitBtn = screen.getByRole('button', { name: /Add Course to Workspace/i });
      fireEvent.submit(submitBtn.closest('form'));

      expect(screen.getByText(/Please provide a course code or name/i)).toBeInTheDocument();
    });
  });

  describe('Assignments Page', () => {
    it('creates an assignment and toggles its completion', () => {
      renderWithProviders(<Assignments />);

      expect(screen.getByText(/No assignments found/i)).toBeInTheDocument();

      const titleInput = screen.getByLabelText(/Assignment Title/i);
      const dueDateInput = screen.getByLabelText(/Due Date/i);
      const submitBtn = screen.getByRole('button', { name: /Save Assignment/i });

      fireEvent.change(titleInput, { target: { value: 'Sprint 2 Milestone' } });
      fireEvent.change(dueDateInput, { target: { value: '2026-10-20' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Sprint 2 Milestone')).toBeInTheDocument();

      // Toggle completed
      const checkBtn = screen.getByRole('button', { name: /Mark "Sprint 2 Milestone" as completed/i });
      fireEvent.click(checkBtn);

      expect(screen.getByRole('button', { name: /Mark "Sprint 2 Milestone" as incomplete/i })).toBeInTheDocument();
    });
  });

  describe('Exams Page', () => {
    it('schedules an exam with workload and priority', () => {
      renderWithProviders(<Exams />);

      const titleInput = screen.getByLabelText(/Exam Title/i);
      const dateInput = screen.getByLabelText(/Exam Date/i);
      const submitBtn = screen.getByRole('button', { name: /Schedule Exam/i });

      fireEvent.change(titleInput, { target: { value: 'Midterm Exam 1' } });
      fireEvent.change(dateInput, { target: { value: '2026-10-25' } });
      fireEvent.click(submitBtn);

      expect(screen.getByText('Midterm Exam 1')).toBeInTheDocument();
      expect(screen.getByText(/6h prep workload/i)).toBeInTheDocument();
    });
  });

  describe('Dashboard Page', () => {
    it('renders dashboard statistics cards and spotlight empty state', () => {
      renderWithProviders(<Dashboard />);

      expect(screen.getByText('Academic Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Active Courses')).toBeInTheDocument();
      expect(screen.getByText('Pending Assignments')).toBeInTheDocument();
      expect(screen.getByText(/No study session currently queued/i)).toBeInTheDocument();
    });
  });
});
