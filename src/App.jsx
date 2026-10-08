import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { DataModal } from './components/DataModal';
import { CheckInModal } from './components/CheckInModal';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';
import { AuthModal } from './components/AuthModal';
import { MigrationModal } from './components/MigrationModal';

import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import StudyPlanner from './pages/StudyPlanner';
import SyllabusImport from './pages/SyllabusImport';

import './App.css';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const { user } = useAuth();
  const {
    isCheckInModalOpen,
    closeCheckInModal,
    isProfileModalOpen,
    closeProfileModal,
    isOnboardingModalOpen,
    closeOnboardingModal,
    isAuthModalOpen,
    closeAuthModal,
    isMigrationModalOpen,
    closeMigrationModal,
    handleMigrationComplete,
  } = useApp();

  return (
    <BrowserRouter>
      <div className="app-layout">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onOpenDataModal={() => setDataModalOpen(true)}
        />

        <div className="main-content-wrapper">
          <Header
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            onOpenDataModal={() => setDataModalOpen(true)}
          />

          <main className="main-viewport" id="main-content">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/assignments" element={<Assignments />} />
              <Route path="/exams" element={<Exams />} />
              <Route path="/study-planner" element={<StudyPlanner />} />
              <Route path="/syllabus-import" element={<SyllabusImport />} />
            </Routes>
          </main>
        </div>

        <ToastContainer />
        <DataModal
          isOpen={dataModalOpen}
          onClose={() => setDataModalOpen(false)}
        />
        <CheckInModal
          isOpen={isCheckInModalOpen}
          onClose={closeCheckInModal}
        />
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={closeProfileModal}
        />
        <OnboardingModal
          isOpen={isOnboardingModalOpen}
          onClose={closeOnboardingModal}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={closeAuthModal}
        />
        <MigrationModal
          isOpen={isMigrationModalOpen}
          onClose={closeMigrationModal}
          userId={user?.id}
          onMigrationComplete={handleMigrationComplete}
        />
      </div>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;