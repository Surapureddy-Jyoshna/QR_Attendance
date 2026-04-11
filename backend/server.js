require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const csv = require("csv-parser");



const app = express();
app.use(cors({
  origin: "*"
}));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected ✅"))
  .catch(err => console.log("Mongo Error ❌", err));

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

const Student = mongoose.model("Student", studentSchema, "Students");

// Teacher Schema
const teacherSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  employeeId: { type: String, required: true, unique: true },
  department: { type: String, required: true },
  password: { type: String, required: true }
});

const Teacher = mongoose.model("Teacher", teacherSchema, "Teachers");

const classSchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Teacher"
  },
  section: {
    type: String,
    required: true
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

const Class = mongoose.model("Class", classSchema, "Classes");

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
  try {
    console.log("📥 Incoming Data:", req.body);

    const { name, email, employeeId, password, department } = req.body;

    // ✅ Validate fields
    if (!name || !email || !employeeId || !password || !department) {
      return res.status(400).json({ message: "All fields required" });
    }

    // ✅ Check duplicate user
    const existing = await Teacher.findOne({ employeeId });

    if (existing) {
      return res.status(400).json({ message: "Teacher already exists" });
    }

    const newTeacher = new Teacher({
      name,
      email,
      employeeId,
      password,
      department
    });

    await newTeacher.save();

    console.log("✅ Saved successfully");

    res.json({ message: "Teacher Registered Successfully" });

  } catch (error) {
    console.error("❌ FULL ERROR:", error);   // 👈 VERY IMPORTANT
    res.status(500).json({ message: "Signup Failed" });
  }
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

  const { section, date } = req.body;

  if(!section || !date){
      return res.json({ success:false, message:"Section and date required" });
  }

  const existing = await Class.findOne({
      teacherId: req.user.id,
      section,
      date
  });

  if(existing){
      return res.json({ success:false, message:"Class already added for this section on this date" });
  }

  const newRecord = new Class({
      teacherId: req.user.id,
      section,
      date
  });

  await newRecord.save();

  res.json({ success:true });
});

app.get("/teacher/total-classes", authenticateToken, async (req, res) => {

  const { section } = req.query;

  let filter = { teacherId: req.user.id };

  if(section){
      filter.section = section;
  }

  const total = await Class.countDocuments(filter);

  res.json({ totalClasses: total });
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
app.get("/teacher/my-classes/:section", authenticateToken, async (req, res) => {

  const section = req.params.section;

  const classes = await Class.find({
      teacherId: req.user.id,
      section: section
  });

  res.json(classes);
});


app.get("/teacher/section-data/:section", authenticateToken, async (req, res) => {

  const section = req.params.section;
  const results = [];

  fs.createReadStream(__dirname + "/CSE.csv")

    .pipe(csv())
    .on("data", (data) => {
        if(data.Section === section){
            results.push(data);
        }
    })
    .on("end", async () => {

        const totalStudents = results.length;

       


            const totalClasses = await Class.countDocuments({
              teacherId: req.user.id,
              section: section
          });
           const todaysAttendance = 0; 

        res.json({
            totalStudents,
            totalClasses,
            todaysAttendance
        });
    });
});

// Get Students by Section
app.get("/teacher/students/:section", authenticateToken, async (req, res) => {

  const section = req.params.section;
  const students = [];

  fs.createReadStream(__dirname + "/CSE.csv")
    .pipe(csv())
    .on("data", (data) => {
        if(data.Section === section){
          students.push({
            Student_ID: data["Student_ID"]?.trim(),
            Name: data["Name"]?.trim(),
            Section: data["Section"]?.trim(),
            RollNo: data["RollNo"]?.trim()
        });
        
        }
    })
    .on("end", () => {
        res.json(students);
    });

});

app.post("/teacher/start-session", (req, res) => {

  const sessionId = "SESSION_" + Date.now();

  // store session (temporary memory)
  global.sessions = global.sessions || [];

  global.sessions.push({
    sessionId,
    createdAt: Date.now()
  });

  res.json({ sessionId });
});
app.post("/student/mark-attendance", (req, res) => {

  const { sessionId } = req.body;

  const session = global.sessions.find(s => s.sessionId === sessionId);

  if (!session) {
    return res.json({ success: false, message: "Invalid session" });
  }

  // ✅ valid session → allow attendance
  res.json({ success: true });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});