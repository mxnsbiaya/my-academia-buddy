import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";

import Sidebar from "./components/Sidebar";

import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Assignments from "./pages/Assignments";
import Exams from "./pages/Exams";
import StudyPlanner from "./pages/StudyPlanner";

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />

        <main className="main">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/exams" element={<Exams />} />
            <Route path="/study-planner" element={<StudyPlanner />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;