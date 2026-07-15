import { useEffect, useState } from "react";

function Courses() {
  const [courses, setCourses] = useState(() => {
    const savedCourses = localStorage.getItem("courses");
    return savedCourses ? JSON.parse(savedCourses) : [];
  });

  const [courseName, setCourseName] = useState("");
  const [instructor, setInstructor] = useState("");
  const [schedule, setSchedule] = useState("");
  const [credits, setCredits] = useState("");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    localStorage.setItem("courses", JSON.stringify(courses));
  }, [courses]);

  function addCourse(e) {
    e.preventDefault();

    if (courseName.trim() === "") return;

    const newCourse = {
      id: Date.now(),
      name: courseName,
      instructor,
      schedule,
      credits,
      progress,
    };

    setCourses([...courses, newCourse]);
    setCourseName("");
    setInstructor("");
    setSchedule("");
    setCredits("");
    setProgress(0);
  }

  function deleteCourse(id) {
    setCourses(courses.filter((course) => course.id !== id));
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Courses</h1>
          <p>Manage your university courses and track progress.</p>
        </div>
      </div>

      <form className="form vertical" onSubmit={addCourse}>
        <input
          type="text"
          placeholder="Course name, e.g. SEG2105"
          value={courseName}
          onChange={(e) => setCourseName(e.target.value)}
        />

        <input
          type="text"
          placeholder="Instructor name"
          value={instructor}
          onChange={(e) => setInstructor(e.target.value)}
        />

        <input
          type="text"
          placeholder="Schedule, e.g. Monday 10:00"
          value={schedule}
          onChange={(e) => setSchedule(e.target.value)}
        />

        <input
          type="number"
          placeholder="Credits"
          value={credits}
          onChange={(e) => setCredits(e.target.value)}
        />

        <input
          type="number"
          min="0"
          max="100"
          placeholder="Progress %"
          value={progress}
          onChange={(e) => setProgress(e.target.value)}
        />

        <button type="submit">Add Course</button>
      </form>

      <div className="list">
        {courses.length === 0 ? (
          <p className="empty">No courses added yet.</p>
        ) : (
          courses.map((course) => (
            <div className="list-item course-item" key={course.id}>
              <div>
                <strong>{course.name}</strong>
                <p>Instructor: {course.instructor || "Not specified"}</p>
                <p>Schedule: {course.schedule || "Not specified"}</p>
                <p>Credits: {course.credits || "N/A"}</p>

                <div className="mini-progress">
                  <div
                    className="mini-progress-fill"
                    style={{ width: `${course.progress || 0}%` }}
                  ></div>
                </div>

                <p>{course.progress || 0}% completed</p>
              </div>

              <button onClick={() => deleteCourse(course.id)}>Delete</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Courses;