import { useEffect, useMemo, useState } from "react";

const DAY_START_MINUTES = 6 * 60;
const NIGHT_START_MINUTES = 22 * 60;
const MIN_SESSION_MINUTES = 30;
const BREAK_MINUTES = 15;
const MAX_PLANNING_DAYS = 35;

const DAY_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const PRIORITY_VALUE = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const LEVEL_VALUE = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function safeParse(key, fallback = []) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function estimateCourseDifficulty(courseName = "") {
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

function estimateTaskWeight(taskTitle = "") {
  const title = taskTitle.toLowerCase();

  if (
    title.includes("project") ||
    title.includes("lab") ||
    title.includes("final") ||
    title.includes("midterm") ||
    title.includes("research") ||
    title.includes("presentation") ||
    title.includes("essay")
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
    if (difficulty === "High") return 300;
    if (difficulty === "Medium") return 210;
    return 150;
  }

  if (type === "Course Review") {
    if (difficulty === "High") return 120;
    if (difficulty === "Medium") return 90;
    return 60;
  }

  if (taskWeight === "High" && difficulty === "High") return 360;
  if (taskWeight === "High") return 270;
  if (taskWeight === "Medium" && difficulty === "High") return 210;
  if (taskWeight === "Medium") return 150;
  return 75;
}

function getSessionLength(difficulty, taskWeight) {
  if (difficulty === "High" || taskWeight === "High") return 75;
  if (difficulty === "Medium" || taskWeight === "Medium") return 60;
  return 45;
}

function getCourseCategory(courseName = "") {
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

  if (name.includes("eng") || name.includes("fra") || name.includes("writing")) {
    return "Language / Writing";
  }

  if (name.includes("bio") || name.includes("chem")) {
    return "Science";
  }

  return "General";
}

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

function toLocalDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(dateString) {
  if (!dateString) return null;
  const date = new Date(`${dateString}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysBetween(fromDate, toDate) {
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil((toDate - fromDate) / day);
}

function formatReadableDate(dateString) {
  const date = parseDate(dateString);
  if (!date) return dateString;

  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getTaskScore(task, sessionDate) {
  const dueDate = parseDate(task.date);
  const daysLeft = dueDate ? daysBetween(sessionDate, dueDate) : 30;

  let urgencyScore;
  if (daysLeft <= 0) urgencyScore = 12;
  else if (daysLeft === 1) urgencyScore = 10;
  else if (daysLeft <= 3) urgencyScore = 8;
  else if (daysLeft <= 7) urgencyScore = 6;
  else if (daysLeft <= 14) urgencyScore = 3;
  else urgencyScore = 1;

  const priorityScore = (PRIORITY_VALUE[task.priority] || 2) * 3;
  const difficultyScore = (LEVEL_VALUE[task.difficulty] || 2) * 1.5;
  const workloadScore = (LEVEL_VALUE[task.taskWeight] || 2) * 1.5;
  const examBonus = task.type === "Exam Review" ? 2.5 : 0;

  /*
    Fairness penalty prevents one task from taking every session.
    A high-priority task still remains important, but other urgent work
    can start before it is fully completed.
  */
  const repetitionPenalty = task.sessionsScheduled * 1.8;
  const progressPenalty =
    task.totalMinutes > 0
      ? ((task.totalMinutes - task.remainingMinutes) / task.totalMinutes) * 2
      : 0;

  return (
    urgencyScore +
    priorityScore +
    difficultyScore +
    workloadScore +
    examBonus -
    repetitionPenalty -
    progressPenalty
  );
}

function buildPlanningSlots(availability, lastDeadline) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const requestedEnd = lastDeadline ? parseDate(lastDeadline) : null;
  const maximumEnd = new Date(today);
  maximumEnd.setDate(maximumEnd.getDate() + MAX_PLANNING_DAYS);

  const planningEnd =
    requestedEnd && requestedEnd < maximumEnd ? requestedEnd : maximumEnd;

  const slots = [];

  for (
    let cursor = new Date(today);
    cursor <= planningEnd;
    cursor.setDate(cursor.getDate() + 1)
  ) {
    availability.forEach((slot) => {
      if (DAY_INDEX[slot.day] !== cursor.getDay()) return;

      const enteredStart = timeToMinutes(slot.startTime);
      const enteredEnd = timeToMinutes(slot.endTime);
      const startMinutes = Math.max(enteredStart, DAY_START_MINUTES);
      const endMinutes = Math.min(enteredEnd, NIGHT_START_MINUTES);

      if (endMinutes - startMinutes < MIN_SESSION_MINUTES) return;

      slots.push({
        id: `${toLocalDateString(cursor)}-${slot.id}`,
        day: slot.day,
        date: toLocalDateString(cursor),
        startMinutes,
        endMinutes,
      });
    });
  }

  return slots.sort((a, b) => {
    const dateDifference = parseDate(a.date) - parseDate(b.date);
    if (dateDifference !== 0) return dateDifference;
    return a.startMinutes - b.startMinutes;
  });
}

function StudyPlanner() {
  const [availability, setAvailability] = useState(() =>
    safeParse("availability")
  );

  const [studyPlan, setStudyPlan] = useState(() => safeParse("studyPlan"));

  const [insights, setInsights] = useState(() =>
    safeParse("studyInsights", null)
  );

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
        "This availability includes night hours. The planner will only use the period between 06:00 and 22:00. Do you still want to save it?"
      );

      if (!accepted) return;
    }

    setAvailability((current) => [
      ...current,
      {
        id: Date.now(),
        day,
        startTime,
        endTime,
        warning: containsNightHours
          ? "Night hours detected. Only 06:00–22:00 will be used."
          : "",
      },
    ]);

    setStartTime("");
    setEndTime("");
  }

  function deleteAvailability(id) {
    setAvailability((current) => current.filter((slot) => slot.id !== id));
  }

  function buildTasks() {
    const courses = safeParse("courses");
    const assignments = safeParse("assignments");
    const exams = safeParse("exams");

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
          sessionsScheduled: 0,
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
        sessionsScheduled: 0,
      });
    });

    /*
      If the user has courses but no pending assignment or exam,
      the planner can still create useful general review sessions.
    */
    if (tasks.length === 0 && courses.length > 0) {
      const fallbackDate = new Date();
      fallbackDate.setDate(fallbackDate.getDate() + 7);

      courses.forEach((courseData) => {
        const course = courseData.name || "General course";
        const difficulty = estimateCourseDifficulty(course);
        const category = getCourseCategory(course);
        const totalMinutes = estimateTotalWorkMinutes(
          "Course Review",
          difficulty,
          "Medium"
        );

        tasks.push({
          id: `course-${courseData.id}`,
          type: "Course Review",
          title: `${course} weekly review`,
          course,
          date: toLocalDateString(fallbackDate),
          priority: difficulty === "High" ? "High" : "Medium",
          difficulty,
          taskWeight: "Medium",
          category,
          sessionLength: getSessionLength(difficulty, "Medium"),
          totalMinutes,
          remainingMinutes: totalMinutes,
          sessionsScheduled: 0,
        });
      });
    }

    return tasks;
  }

  function generatePlan() {
    const tasks = buildTasks();

    if (availability.length === 0) {
      alert("Please add at least one availability slot.");
      return;
    }

    if (tasks.length === 0) {
      alert(
        "Add at least one course, pending assignment, or exam before generating a plan."
      );
      return;
    }

    const validDates = tasks
      .map((task) => task.date)
      .filter(Boolean)
      .sort();

    const slots = buildPlanningSlots(
      availability,
      validDates[validDates.length - 1]
    );

    if (slots.length === 0) {
      alert(
        "No usable study period was found between 06:00 and 22:00. Please add another availability."
      );
      return;
    }

    const generatedPlan = [];

    slots.forEach((slot) => {
      let currentTime = slot.startMinutes;
      const sessionDate = parseDate(slot.date);

      while (currentTime + MIN_SESSION_MINUTES <= slot.endMinutes) {
        const eligibleTasks = tasks.filter((task) => {
          if (task.remainingMinutes <= 0) return false;

          const dueDate = parseDate(task.date);
          if (!dueDate) return true;

          /*
            A task can be scheduled on its deadline, but never after it.
          */
          return sessionDate <= dueDate;
        });

        if (eligibleTasks.length === 0) break;

        eligibleTasks.sort(
          (a, b) => getTaskScore(b, sessionDate) - getTaskScore(a, sessionDate)
        );

        const task = eligibleTasks[0];
        const remainingSlotTime = slot.endMinutes - currentTime;
        const sessionLength = Math.min(
          task.sessionLength,
          task.remainingMinutes,
          remainingSlotTime
        );

        if (sessionLength < MIN_SESSION_MINUTES) break;

        const sessionStart = currentTime;
        const sessionEnd = currentTime + sessionLength;
        const daysUntilDue = parseDate(task.date)
          ? daysBetween(sessionDate, parseDate(task.date))
          : null;

        generatedPlan.push({
          id: `${task.id}-${slot.date}-${sessionStart}-${Math.random()}`,
          taskId: task.id,
          date: slot.date,
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
            task.type === "Exam Review"
              ? "Review key concepts, practise questions, and focus on weak areas."
              : task.category === "Programming / Software"
              ? "Use this session for implementation, debugging, testing, or code review."
              : task.category === "Mathematics"
              ? "Use this session for practice problems and worked examples."
              : task.type === "Course Review"
              ? "Review recent notes and prepare for the next class."
              : "Make measurable progress and leave time for a final review.",
          explanation: [
            `${task.title} was selected using a combined urgency, priority, difficulty, and workload score.`,
            `Its priority is ${task.priority}, its estimated difficulty is ${task.difficulty}, and its workload is ${task.taskWeight}.`,
            daysUntilDue === null
              ? "No valid deadline was available, so the planner used its general priority."
              : `The deadline is ${Math.max(
                  daysUntilDue,
                  0
                )} day(s) from this study session.`,
            `The planner does not wait for a low-priority task to be completely finished before starting a more urgent or demanding task.`,
            `This ${sessionLength}-minute session fits your availability on ${formatReadableDate(
              slot.date
            )}.`,
          ],
        });

        task.remainingMinutes -= sessionLength;
        task.sessionsScheduled += 1;
        currentTime = sessionEnd;

        const moreEligibleWork = tasks.some((candidate) => {
          if (candidate.remainingMinutes <= 0) return false;
          const dueDate = parseDate(candidate.date);
          return !dueDate || sessionDate <= dueDate;
        });

        if (
          moreEligibleWork &&
          currentTime + BREAK_MINUTES + MIN_SESSION_MINUTES <= slot.endMinutes
        ) {
          generatedPlan.push({
            id: `break-${slot.date}-${currentTime}-${Math.random()}`,
            date: slot.date,
            day: slot.day,
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(currentTime + BREAK_MINUTES),
            type: "Break",
            title: "Short break",
            course: "Rest",
            completed: false,
            recommendation:
              "Take a short break before continuing or switching subjects.",
          });

          currentTime += BREAK_MINUTES;
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
        date: task.date,
        remainingMinutes: task.remainingMinutes,
      }));

    const hardestCourse =
      [...tasks]
        .sort(
          (a, b) =>
            (LEVEL_VALUE[b.difficulty] || 0) -
            (LEVEL_VALUE[a.difficulty] || 0)
        )[0]?.course || "No course detected";

    const nearestDeadline =
      [...tasks]
        .filter((task) => task.date)
        .sort((a, b) => parseDate(a.date) - parseDate(b.date))[0] || null;

    setStudyPlan(generatedPlan);
    setInsights({
      totalMinutes,
      totalSessions: studySessions.length,
      hardestCourse,
      nearestDeadline: nearestDeadline
        ? `${nearestDeadline.title} (${nearestDeadline.date})`
        : "No deadline detected",
      categories,
      unscheduledTasks,
      recommendation:
        unscheduledTasks.length === 0
          ? "All estimated work was distributed across your available periods before its deadlines."
          : "Some work could not be scheduled before its deadline. Add more availability or reduce your workload.",
    });
  }

  function toggleSessionCompleted(sessionId) {
    setStudyPlan((current) =>
      current.map((session) =>
        session.id === sessionId
          ? { ...session, completed: !session.completed }
          : session
      )
    );
  }

  function clearPlan() {
    setStudyPlan([]);
    setInsights(null);
  }

  const taskSessions = useMemo(
    () => studyPlan.filter((session) => session.type !== "Break"),
    [studyPlan]
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
            Build a realistic plan from your courses, pending assignments,
            exams, deadlines, priorities, and availability.
          </p>
        </div>
      </div>

      <section className="planner-section">
        <h2>My Weekly Availability</h2>

        <p className="planner-rule">
          Availability repeats weekly. Sessions are only scheduled between
          06:00 and 22:00.
        </p>

        <form className="form availability-form" onSubmit={addAvailability}>
          <select value={day} onChange={(event) => setDay(event.target.value)}>
            {Object.keys(DAY_INDEX)
              .filter((name) => name !== "Sunday")
              .concat("Sunday")
              .map((name) => (
                <option key={name}>{name}</option>
              ))}
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
                  {slot.warning && <p className="warning">{slot.warning}</p>}
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
                    {task.course} — {task.title} ({task.date || "no date"}):{" "}
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
                      {formatReadableDate(session.date)}, {session.startTime} -{" "}
                      {session.endTime} • {session.course}
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
                    {formatReadableDate(item.date)}, {item.startTime} -{" "}
                    {item.endTime}
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