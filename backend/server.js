const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");



const app = express();

app.use(cors());
app.use(express.json());

// Student DB Connection
const studentConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/studentDB"
);

const teacherConnection = mongoose.createConnection(
  "mongodb://127.0.0.1:27017/teacherDB"
);

// Student Schema
const studentSchema = new mongoose.Schema({
  name: String,
  email: String,
  studentId: String,
  password: String,
  attendance: {
    type: Number,
    default: 75   // Default attendance %
  }
});

const Student = studentConnection.model("Student", studentSchema);

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: String,
  email: String,
  employeeId: String,
  department: String,
  password: String,
});

const Teacher = teacherConnection.model("Teacher", teacherSchema);

const classSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher"
  },
  date: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Class = teacherConnection.model("Class", classSchema);

// Student Signup API
app.post("/student/signup", async (req, res) => {
  const newStudent = new Student(req.body);
  await newStudent.save();
  res.json({ message: "Student Registered Successfully" });
});
// Student Login API
app.post("/student/login", async (req, res) => {
  const { studentId, password } = req.body;

  const student = await Student.findOne({ studentId });

  if (!student) {
    return res.status(404).json({ message: "User does not exist" });
  }

  if (student.password !== password) {
    return res.status(401).json({ message: "Incorrect password" });
  }

  res.json({ message: "Login Successful", student });
});

// Get Student Details by Student ID
app.get("/student/:studentId", async (req, res) => {
  try {
    const student = await Student.findOne({ 
        studentId: req.params.studentId 
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);

  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});


// Teacher Signup API
app.post("/teacher/signup", async (req, res) => {
  const newTeacher = new Teacher(req.body);
  await newTeacher.save();
  res.json({ message: "Teacher Registered Successfully" });
});
// Teacher Login API
app.post("/teacher/login", async (req, res) => {
  const { employeeId, password } = req.body;

  const teacher = await Teacher.findOne({ employeeId });

  if (!teacher || teacher.password !== password) {
      return res.json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
      { id: teacher._id },
      "mySecretKey",
      { expiresIn: "1h" }
  );

  res.json({
      success: true,
      token: token
  });
});
function authenticateToken(req, res, next) {

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, "mySecretKey", (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
  });
}
app.get("/teacher/profile", authenticateToken, async (req, res) => {

  const teacher = await Teacher.findById(req.user.id);

  res.json({
      name: teacher.name,
      employeeId: teacher.employeeId
  });
});
app.post("/teacher/conduct-class", authenticateToken, async (req, res) => {

  const { date } = req.body;

  const existing = await Class.findOne({
      teacherId: req.user.id,
      date: date
  });

  if(existing){
      return res.json({ success: false, message: "Class already added for this date" });
  }

  const newRecord = new Class({
      teacherId: req.user.id,
      date
  });

  await newRecord.save();

  res.json({ success: true });
});
app.get("/teacher/total-classes", authenticateToken, async (req, res) => {

  const total = await Class.countDocuments({
      teacherId: req.user.id
  });

  const dates = await Class.find({ teacherId: req.user.id })
                         .select("_id date");


  res.json({
      totalClasses: total,
      dates
  });
});
app.delete("/teacher/delete-class/:id", authenticateToken, async (req, res) => {

  const { id } = req.params;

  await Class.deleteOne({
      _id: id,
      teacherId: req.user.id
  });

  res.json({ success: true });
});



app.get("/teacher/classes", authenticateToken, async (req, res) => {

  const classes = await Class.find({ teacherId: req.user.id });

  res.json(classes);
});





app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
