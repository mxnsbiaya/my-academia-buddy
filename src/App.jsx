import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { useApp } from './context/useApp';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ToastContainer } from './components/ToastContainer';
import { DataModal } from './components/DataModal';
import { CheckInModal } from './components/CheckInModal';
import { ProfileModal } from './components/ProfileModal';
import { OnboardingModal } from './components/OnboardingModal';

import Dashboard from './pages/Dashboard';
import Courses from './pages/Courses';
import Assignments from './pages/Assignments';
import Exams from './pages/Exams';
import StudyPlanner from './pages/StudyPlanner';

import './App.css';

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dataModalOpen, setDataModalOpen] = useState(false);
  const {
    isCheckInModalOpen,
    closeCheckInModal,
    isProfileModalOpen,
    closeProfileModal,
    isOnboardingModalOpen,
    closeOnboardingModal,
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
      </div>
    </BrowserRouter>
  );
}

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;