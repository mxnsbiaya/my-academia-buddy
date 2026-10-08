import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/supabase', () => ({
  isConfigured: false,
  isSupabaseConfigured: () => false,
  getSupabase: () => null,
}));
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthModal } from '../components/AuthModal';
import { MigrationModal } from '../components/MigrationModal';
import { Header } from '../components/Header';
import { AppProvider } from '../context/AppContext';
import { AuthProvider } from '../context/AuthContext';
import { safeSetScopedItem, STORAGE_KEYS } from '../services/storage';

describe('AuthModal Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders sign in tab by default when unauthenticated', () => {
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText('Sign In to Academia Buddy')).toBeInTheDocument();
    expect(screen.getByLabelText(/Student Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password$/i)).toBeInTheDocument();
  });

  it('switches between Sign In and Register tabs smoothly', () => {
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    const registerTab = screen.getByRole('button', { name: 'Register' });
    fireEvent.click(registerTab);

    expect(screen.getByText('Create Student Account')).toBeInTheDocument();
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();

    const signInTab = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(signInTab);

    expect(screen.getByText('Sign In to Academia Buddy')).toBeInTheDocument();
  });

  it('displays Supabase setup guidance when unconfigured', () => {
    render(
      <AuthProvider>
        <AuthModal isOpen={true} onClose={vi.fn()} />
      </AuthProvider>
    );

    expect(screen.getByText(/Supabase Setup Required/i)).toBeInTheDocument();
    expect(screen.getByText(/VITE_SUPABASE_URL/i)).toBeInTheDocument();
  });
});

describe('MigrationModal Component', () => {
  beforeEach(() => {
    window.localStorage.clear();
    safeSetScopedItem(STORAGE_KEYS.COURSES, [{ id: 101, name: 'CSI2110' }], null);
    safeSetScopedItem(STORAGE_KEYS.ASSIGNMENTS, [{ id: 201, title: 'Problem Set 1' }], null);
  });

  it('renders guest inventory counts and action buttons', () => {
    render(
      <MigrationModal
        isOpen={true}
        onClose={vi.fn()}
        userId="user-test-migration"
        onMigrationComplete={vi.fn()}
      />
    );

    expect(screen.getByText('Sync Local Academic Data')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Assignments')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Sync to Cloud Account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start Fresh/i })).toBeInTheDocument();
  });

  it('allows user to skip migration without error', () => {
    const handleClose = vi.fn();
    render(
      <MigrationModal
        isOpen={true}
        onClose={handleClose}
        userId="user-test-skip"
        onMigrationComplete={vi.fn()}
      />
    );

    const skipBtn = screen.getByRole('button', { name: /Start Fresh/i });
    fireEvent.click(skipBtn);

    expect(handleClose).toHaveBeenCalled();
  });
});

describe('Header Cloud Sync Indicators', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('renders real-time cloud sync status pill and account trigger button', () => {
    render(
      <AuthProvider>
        <AppProvider>
          <Header onToggleSidebar={vi.fn()} onOpenDataModal={vi.fn()} />
        </AppProvider>
      </AuthProvider>
    );

    // Sync status pill is present in header
    expect(screen.getByText(/Local Only|Synced|Offline/i)).toBeInTheDocument();

    // Account trigger button is present
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Profile/i })).toBeInTheDocument();
  });
});
