import { useEffect, useState } from "react";

const DAY_START_MINUTES = 6 * 60;
const NIGHT_START_MINUTES = 22 * 60;

function estimateCourseDifficulty(courseName) {
  const name = courseName.toLowerCase();

  if (
    name.includes("mat") ||
    name.includes("math") ||
    name.includes("calculus") ||
    name.includes("algebra") ||
    name.includes("physics") ||
    name.includes("csi") ||
    name.includes("seg") ||
    name.includes("engineering") ||
    name.includes("programming") ||
    name.includes("software")
  ) {
    return "High";
  }

  if (
    name.includes("business") ||
    name.includes("psychology") ||
    name.includes("biology") ||
    name.includes("chemistry") ||
    name.includes("economics")
  ) {
    return "Medium";
  }

  return "Low";
}

function estimateTaskWeight(taskTitle) {
  const title = taskTitle.toLowerCase();

  if (
    title.includes("project") ||
    title.includes("lab") ||
    title.includes("final") ||
    title.includes("midterm") ||
    title.includes("research") ||
    title.includes("presentation")
  ) {
    return "High";
  }

  if (
    title.includes("quiz") ||
    title.includes("reading") ||
    title.includes("summary") ||
    title.includes("reflection")
  ) {
    return "Low";
  }

  return "Medium";
}

function estimateTotalWorkMinutes(type, difficulty, taskWeight) {
  if (type === "Exam Review") {
    if (difficulty === "High") return 240;
    if (difficulty === "Medium") return 180;
    return 120;
  }

  if (taskWeight === "High" && difficulty === "High") return 300;
  if (taskWeight === "High") return 240;
  if (taskWeight === "Medium" && difficulty === "High") return 180;
  if (taskWeight === "Medium") return 120;

  return 60;
}

function getSessionLength(difficulty, taskWeight) {
  if (difficulty === "High" || taskWeight === "High") return 75;
  if (difficulty === "Medium" || taskWeight === "Medium") return 60;

  return 45;
}

function getCourseCategory(courseName) {
  const name = courseName.toLowerCase();

  if (
    name.includes("seg") ||
    name.includes("csi") ||
    name.includes("programming") ||
    name.includes("software")
  ) {
    return "Programming / Software";
  }

  if (
    name.includes("mat") ||
    name.includes("math") ||
    name.includes("calculus") ||
    name.includes("algebra")
  ) {
    return "Mathematics";
  }

  if (
    name.includes("eng") ||
    name.includes("fra") ||
    name.includes("writing")
  ) {
    return "Language / Writing";
  }

  if (name.includes("bio") || name.includes("chem")) {
    return "Science";
  }

  return "General";
}

function StudyPlanner() {
  const [availability, setAvailability] = useState(() => {
    const savedAvailability = localStorage.getItem("availability");
    return savedAvailability ? JSON.parse(savedAvailability) : [];
  });

  const [studyPlan, setStudyPlan] = useState(() => {
    const savedPlan = localStorage.getItem("studyPlan");
    return savedPlan ? JSON.parse(savedPlan) : [];
  });

  const [insights, setInsights] = useState(() => {
    const savedInsights = localStorage.getItem("studyInsights");
    return savedInsights ? JSON.parse(savedInsights) : null;
  });

  const [day, setDay] = useState("Monday");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    localStorage.setItem("availability", JSON.stringify(availability));
  }, [availability]);

  useEffect(() => {
    localStorage.setItem("studyPlan", JSON.stringify(studyPlan));
  }, [studyPlan]);

  useEffect(() => {
    localStorage.setItem("studyInsights", JSON.stringify(insights));
  }, [insights]);

  function timeToMinutes(time) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function minutesToTime(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  }

  function addAvailability(event) {
    event.preventDefault();

    if (!startTime || !endTime) {
      alert("Please select a start time and an end time.");
      return;
    }

    const start = timeToMinutes(startTime);
    const end = timeToMinutes(endTime);

    if (end <= start) {
      alert("End time must be after start time.");
      return;
    }

    const containsNightHours =
      start < DAY_START_MINUTES || end > NIGHT_START_MINUTES;

    if (containsNightHours) {
      const accepted = window.confirm(
        "This availability includes night hours. My Academia Buddy will only schedule study sessions between 06:00 and 22:00. Do you still want to save this availability?"
      );

      if (!accepted) return;
    }

    const newAvailability = {
      id: Date.now(),
      day,
      startTime,
      endTime,
      warning: containsNightHours
        ? "Night hours detected. Only the period between 06:00 and 22:00 will be used."
        : "",
    };

    setAvailability([...availability, newAvailability]);
    setStartTime("");
    setEndTime("");
  }

  function deleteAvailability(id) {
    setAvailability(availability.filter((slot) => slot.id !== id));
  }

  function buildTasks() {
    const assignments =
      JSON.parse(localStorage.getItem("assignments")) || [];

    const exams = JSON.parse(localStorage.getItem("exams")) || [];

    const tasks = [];

    assignments
      .filter((assignment) => !assignment.completed)
      .forEach((assignment) => {
        const course = assignment.course || "General";
        const difficulty = estimateCourseDifficulty(course);
        const taskWeight = estimateTaskWeight(assignment.title);
        const category = getCourseCategory(course);

        const totalMinutes = estimateTotalWorkMinutes(
          "Assignment",
          difficulty,
          taskWeight
        );

        tasks.push({
          id: `assignment-${assignment.id}`,
          type: "Assignment",
          title: assignment.title,
          course,
          date: assignment.dueDate,
          priority: assignment.priority || "Medium",
          difficulty,
          taskWeight,
          category,
          sessionLength: getSessionLength(difficulty, taskWeight),
          totalMinutes,
          remainingMinutes: totalMinutes,
        });
      });

    exams.forEach((exam) => {
      const course = exam.course || "General";
      const difficulty = estimateCourseDifficulty(course);
      const category = getCourseCategory(course);

      const totalMinutes = estimateTotalWorkMinutes(
        "Exam Review",
        difficulty,
        "High"
      );

      tasks.push({
        id: `exam-${exam.id}`,
        type: "Exam Review",
        title: `${course} exam review`,
        course,
        date: exam.date,
        priority: "High",
        difficulty,
        taskWeight: "High",
        category,
        sessionLength: getSessionLength(difficulty, "High"),
        totalMinutes,
        remainingMinutes: totalMinutes,
      });
    });

    return tasks;
  }

  function generatePlan() {
    const tasks = buildTasks();

    if (availability.length === 0) {
      alert("Please add at least one availability slot.");
      return;
    }

    if (tasks.length === 0) {
      alert("Please add at least one pending assignment or exam.");
      return;
    }

    const priorityOrder = {
      High: 1,
      Medium: 2,
      Low: 3,
    };

    tasks.sort((firstTask, secondTask) => {
      const dateDifference =
        new Date(firstTask.date) - new Date(secondTask.date);

      if (dateDifference !== 0) return dateDifference;

      return (
        priorityOrder[firstTask.priority] -
        priorityOrder[secondTask.priority]
      );
    });

    const generatedPlan = [];
    const breakLength = 15;

    availability.forEach((slot) => {
      const enteredStart = timeToMinutes(slot.startTime);
      const enteredEnd = timeToMinutes(slot.endTime);

      /*
        Even if the user enters night availability,
        the planner only schedules between 06:00 and 22:00.
      */
      let currentTime = Math.max(enteredStart, DAY_START_MINUTES);
      const slotEnd = Math.min(enteredEnd, NIGHT_START_MINUTES);

      if (slotEnd - currentTime < 15) {
        return;
      }

      while (currentTime < slotEnd) {
        const unfinishedTasks = tasks.filter(
          (task) => task.remainingMinutes > 0
        );

        if (unfinishedTasks.length === 0) break;

        unfinishedTasks.sort((firstTask, secondTask) => {
          const dateDifference =
            new Date(firstTask.date) - new Date(secondTask.date);

          if (dateDifference !== 0) return dateDifference;

          return (
            priorityOrder[firstTask.priority] -
            priorityOrder[secondTask.priority]
          );
        });

        const task = unfinishedTasks[0];
        const remainingSlotTime = slotEnd - currentTime;

        const sessionLength = Math.min(
          task.sessionLength,
          task.remainingMinutes,
          remainingSlotTime
        );

        if (sessionLength < 15) break;

        const sessionStart = currentTime;
        const sessionEnd = currentTime + sessionLength;

        generatedPlan.push({
          id: `${task.id}-${slot.day}-${sessionStart}-${Math.random()}`,
          taskId: task.id,
          day: slot.day,
          startTime: minutesToTime(sessionStart),
          endTime: minutesToTime(sessionEnd),
          type: task.type,
          title: task.title,
          course: task.course,
          targetDate: task.date,
          priority: task.priority,
          difficulty: task.difficulty,
          taskWeight: task.taskWeight,
          category: task.category,
          sessionLength,
          completed: false,
          recommendation:
            task.category === "Programming / Software"
              ? "Use this session for implementation, debugging, testing, or code review."
              : task.category === "Mathematics"
              ? "Use this session for practice problems and worked examples."
              : task.type === "Exam Review"
              ? "Review notes, practise questions, and identify weak areas."
              : "Make steady progress and leave time for final review.",
          explanation: [
            `${task.course} was selected because it is connected to an upcoming ${task.type.toLowerCase()}.`,
            `The system estimated the course difficulty as ${task.difficulty}.`,
            `The task workload was estimated as ${task.taskWeight}.`,
            `The complete work was estimated at about ${Math.floor(
              task.totalMinutes / 60
            )}h ${task.totalMinutes % 60}min.`,
            `This ${sessionLength}-minute session fits inside your ${slot.day} availability.`,
            "The planner avoids scheduling sessions between 22:00 and 06:00.",
          ],
        });

        task.remainingMinutes -= sessionLength;
        currentTime = sessionEnd;

        const moreWorkExists = tasks.some(
          (currentTask) => currentTask.remainingMinutes > 0
        );

        const enoughTimeForBreakAndSession =
          currentTime + breakLength + 15 <= slotEnd;

        if (moreWorkExists && enoughTimeForBreakAndSession) {
          generatedPlan.push({
            id: `break-${slot.day}-${currentTime}-${Math.random()}`,
            day: slot.day,
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(currentTime + breakLength),
            type: "Break",
            title: "Short break",
            course: "Rest",
            completed: false,
            recommendation:
              "Take a short break before continuing your work.",
          });

          currentTime += breakLength;
        }
      }
    });

    const studySessions = generatedPlan.filter(
      (item) => item.type !== "Break"
    );

    const totalMinutes = studySessions.reduce(
      (sum, item) => sum + item.sessionLength,
      0
    );

    const categories = {};

    studySessions.forEach((item) => {
      categories[item.category] =
        (categories[item.category] || 0) + item.sessionLength;
    });

    const unscheduledTasks = tasks
      .filter((task) => task.remainingMinutes > 0)
      .map((task) => ({
        title: task.title,
        course: task.course,
        remainingMinutes: task.remainingMinutes,
      }));

    const hardestCourse =
      studySessions.find((item) => item.difficulty === "High")?.course ||
      "No demanding course detected";

    const nearestDeadline =
      tasks.length > 0
        ? `${tasks[0].title} (${tasks[0].date})`
        : "No deadline detected";

    setStudyPlan(generatedPlan);

    setInsights({
      totalMinutes,
      totalSessions: studySessions.length,
      hardestCourse,
      nearestDeadline,
      categories,
      unscheduledTasks,
      recommendation:
        unscheduledTasks.length === 0
          ? "All estimated work was successfully distributed across your available study periods."
          : "Some work could not be scheduled. Add more availability before the nearest deadlines.",
    });
  }

  function toggleSessionCompleted(sessionId) {
    setStudyPlan(
      studyPlan.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              completed: !session.completed,
            }
          : session
      )
    );
  }

  function clearPlan() {
    setStudyPlan([]);
    setInsights(null);
  }

  const taskSessions = studyPlan.filter(
    (session) => session.type !== "Break"
  );

  const completedSessions = taskSessions.filter(
    (session) => session.completed
  ).length;

  const completionPercentage =
    taskSessions.length === 0
      ? 0
      : Math.round((completedSessions / taskSessions.length) * 100);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Smart Study Planner</h1>

          <p>
            Generate realistic study sessions while protecting your sleep and
            tracking your progress.
          </p>
        </div>
      </div>

      <section className="planner-section">
        <h2>My Availability</h2>

        <p className="planner-rule">
          Study sessions are only scheduled between 06:00 and 22:00.
        </p>

        <form
          className="form availability-form"
          onSubmit={addAvailability}
        >
          <select value={day} onChange={(event) => setDay(event.target.value)}>
            <option>Monday</option>
            <option>Tuesday</option>
            <option>Wednesday</option>
            <option>Thursday</option>
            <option>Friday</option>
            <option>Saturday</option>
            <option>Sunday</option>
          </select>

          <input
            type="time"
            value={startTime}
            onChange={(event) => setStartTime(event.target.value)}
          />

          <input
            type="time"
            value={endTime}
            onChange={(event) => setEndTime(event.target.value)}
          />

          <button type="submit">Add Availability</button>
        </form>

        <div className="list">
          {availability.length === 0 ? (
            <p className="empty">No availability added yet.</p>
          ) : (
            availability.map((slot) => (
              <div className="list-item" key={slot.id}>
                <div>
                  <strong>
                    {slot.day}: {slot.startTime} - {slot.endTime}
                  </strong>

                  {slot.warning && (
                    <p className="warning">{slot.warning}</p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => deleteAvailability(slot.id)}
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="planner-section">
        <h2>Generated Study Plan</h2>

        <div className="planner-actions">
          <button type="button" onClick={generatePlan}>
            Generate Smart Plan
          </button>

          <button type="button" onClick={clearPlan}>
            Clear Plan
          </button>
        </div>

        {taskSessions.length > 0 && (
          <div className="completion-panel">
            <div>
              <strong>Study progress</strong>
              <p>
                {completedSessions} of {taskSessions.length} sessions completed
              </p>
            </div>

            <strong>{completionPercentage}%</strong>

            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        )}

        {insights && (
          <>
            <div className="insights-grid">
              <div className="insight-card">
                <h3>Total Study Time</h3>
                <p>
                  {Math.floor(insights.totalMinutes / 60)}h{" "}
                  {insights.totalMinutes % 60}min
                </p>
              </div>

              <div className="insight-card">
                <h3>Study Sessions</h3>
                <p>{insights.totalSessions}</p>
              </div>

              <div className="insight-card">
                <h3>Hardest Course</h3>
                <p>{insights.hardestCourse}</p>
              </div>

              <div className="insight-card">
                <h3>Nearest Deadline</h3>
                <p>{insights.nearestDeadline}</p>
              </div>
            </div>

            <div className="insight-summary">
              <strong>Study Insight:</strong> {insights.recommendation}
            </div>

            {insights.unscheduledTasks.length > 0 && (
              <div className="unscheduled-box">
                <h3>Unscheduled Work</h3>

                {insights.unscheduledTasks.map((task, index) => (
                  <p key={`${task.title}-${index}`}>
                    {task.course} — {task.title}:{" "}
                    {Math.floor(task.remainingMinutes / 60)}h{" "}
                    {task.remainingMinutes % 60}min remaining
                  </p>
                ))}
              </div>
            )}
          </>
        )}

        {taskSessions.length > 0 && (
          <section className="task-list-section">
            <h2>Study Task List</h2>

            <div className="study-task-list">
              {taskSessions.map((session) => (
                <div
                  className={`study-task ${
                    session.completed ? "task-completed" : ""
                  }`}
                  key={`task-${session.id}`}
                >
                  <div>
                    <strong>{session.title}</strong>

                    <p>
                      {session.day}, {session.startTime} - {session.endTime} •{" "}
                      {session.course}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSessionCompleted(session.id)}
                  >
                    {session.completed ? "Undo" : "Complete"}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="list">
          {studyPlan.length === 0 ? (
            <p className="empty">No study plan generated yet.</p>
          ) : (
            studyPlan.map((item) => (
              <div
                className={`list-item ${
                  item.completed ? "completed-session" : ""
                }`}
                key={item.id}
              >
                <div>
                  <strong>
                    {item.day}, {item.startTime} - {item.endTime}
                  </strong>

                  <p>
                    {item.type}: {item.title} — {item.course}
                  </p>

                  {item.type !== "Break" && (
                    <>
                      <p>
                        Target date: {item.targetDate} • Priority:{" "}
                        {item.priority}
                      </p>

                      <p>
                        Category: {item.category} • Difficulty:{" "}
                        {item.difficulty} • Task weight: {item.taskWeight}
                      </p>

                      <button
                        type="button"
                        className="session-complete-button"
                        onClick={() => toggleSessionCompleted(item.id)}
                      >
                        {item.completed
                          ? "Mark as not completed"
                          : "Mark session completed"}
                      </button>
                    </>
                  )}

                  <p>{item.recommendation}</p>

                  {item.explanation && (
                    <details className="explanation-box">
                      <summary>Why was this scheduled?</summary>

                      <ul>
                        {item.explanation.map((reason, index) => (
                          <li key={index}>{reason}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

export default StudyPlanner;