import { useEffect, useState } from "react";

function Assignments() {
  const [courses] = useState(() => {
    const savedCourses = localStorage.getItem("courses");
    return savedCourses ? JSON.parse(savedCourses) : [];
  });

  const [assignments, setAssignments] = useState(() => {
    const savedAssignments = localStorage.getItem("assignments");
    return savedAssignments ? JSON.parse(savedAssignments) : [];
  });

  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("Medium");

  useEffect(() => {
    localStorage.setItem("assignments", JSON.stringify(assignments));
  }, [assignments]);

  function addAssignment(e) {
    e.preventDefault();

    if (title.trim() === "" || dueDate === "") return;

    const newAssignment = {
      id: Date.now(),
      title,
      course,
      dueDate,
      priority,
      completed: false,
    };

    setAssignments([...assignments, newAssignment]);
    setTitle("");
    setCourse("");
    setDueDate("");
    setPriority("Medium");
  }

  function deleteAssignment(id) {
    setAssignments(assignments.filter((assignment) => assignment.id !== id));
  }

  function toggleCompleted(id) {
    setAssignments(
      assignments.map((assignment) =>
        assignment.id === id
          ? { ...assignment, completed: !assignment.completed }
          : assignment
      )
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Assignments</h1>
          <p>Track your assignments, deadlines, and priorities.</p>
        </div>
      </div>

      <form className="form vertical" onSubmit={addAssignment}>
        <input
          type="text"
          placeholder="Assignment title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <select value={course} onChange={(e) => setCourse(e.target.value)}>
          <option value="">Select course</option>
          {courses.map((c) => (
            <option key={c.id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        <button type="submit">Add Assignment</button>
      </form>

      <div className="list">
        {assignments.length === 0 ? (
          <p className="empty">No assignments added yet.</p>
        ) : (
          assignments.map((assignment) => (
            <div className="list-item" key={assignment.id}>
              <div>
                <strong>{assignment.title}</strong>
                <p>
                  {assignment.course || "No course"} • Due: {assignment.dueDate} •{" "}
                  Priority: {assignment.priority}
                </p>
                <p>Status: {assignment.completed ? "Completed" : "Pending"}</p>
              </div>

              <div className="actions">
                <button onClick={() => toggleCompleted(assignment.id)}>
                  {assignment.completed ? "Undo" : "Complete"}
                </button>
                <button onClick={() => deleteAssignment(assignment.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Assignments;