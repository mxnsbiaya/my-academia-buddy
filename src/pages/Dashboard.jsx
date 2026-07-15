function Dashboard() {
  const courses = JSON.parse(localStorage.getItem("courses")) || [];
  const assignments = JSON.parse(localStorage.getItem("assignments")) || [];
  const exams = JSON.parse(localStorage.getItem("exams")) || [];
  const studyPlan = JSON.parse(localStorage.getItem("studyPlan")) || [];

  const completedAssignments = assignments.filter((a) => a.completed).length;
  const pendingAssignments = assignments.length - completedAssignments;

  const progress =
    assignments.length === 0
      ? 0
      : Math.round((completedAssignments / assignments.length) * 100);

  const upcomingExams = exams
    .slice()
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Your academic overview for today.</p>

      <section className="cards">
        <div className="card">
          <h3>Courses</h3>
          <p>{courses.length} active courses</p>
        </div>

        <div className="card">
          <h3>Assignments</h3>
          <p>{pendingAssignments} pending assignments</p>
        </div>

        <div className="card">
          <h3>Exams</h3>
          <p>{exams.length} upcoming exams</p>
        </div>

        <div className="card">
          <h3>Study Plan</h3>
          <p>{studyPlan.length} planned sessions</p>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Academic Progress</h2>
        <p>{progress}% of assignments completed</p>

        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Upcoming Exams</h2>

        {upcomingExams.length === 0 ? (
          <p className="empty">No upcoming exams.</p>
        ) : (
          upcomingExams.map((exam) => (
            <div className="list-item" key={exam.id}>
              <div>
                <strong>{exam.course}</strong>
                <p>
                  {exam.date} • {exam.location || "No location"}
                </p>
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

export default Dashboard;