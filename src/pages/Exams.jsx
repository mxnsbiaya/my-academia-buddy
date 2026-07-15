import { useEffect, useState } from "react";

function Exams() {
  const [courses] = useState(() => {
    const savedCourses = localStorage.getItem("courses");
    return savedCourses ? JSON.parse(savedCourses) : [];
  });

  const [exams, setExams] = useState(() => {
    const savedExams = localStorage.getItem("exams");
    return savedExams ? JSON.parse(savedExams) : [];
  });

  const [course, setCourse] = useState("");
  const [date, setDate] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    localStorage.setItem("exams", JSON.stringify(exams));
  }, [exams]);

  function addExam(e) {
    e.preventDefault();

    if (course === "" || date === "") return;

    const newExam = {
      id: Date.now(),
      course,
      date,
      location,
      notes,
    };

    setExams([...exams, newExam]);
    setCourse("");
    setDate("");
    setLocation("");
    setNotes("");
  }

  function deleteExam(id) {
    setExams(exams.filter((exam) => exam.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Exams</h1>
          <p>Keep track of your upcoming exams.</p>
        </div>
      </div>

      <form className="form vertical" onSubmit={addExam}>
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
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <input
          type="text"
          placeholder="Location, e.g. Room 203"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />

        <input
          type="text"
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit">Add Exam</button>
      </form>

      <div className="list">
        {exams.length === 0 ? (
          <p className="empty">No exams added yet.</p>
        ) : (
          exams.map((exam) => (
            <div className="list-item" key={exam.id}>
              <div>
                <strong>{exam.course}</strong>
                <p>Date: {exam.date}</p>
                <p>Location: {exam.location || "Not specified"}</p>
                <p>{exam.notes}</p>
              </div>

              <button onClick={() => deleteExam(exam.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Exams;