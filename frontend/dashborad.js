const BASE_URL = "https://qr-attendance-1-odo4.onrender.com";
let currentSection = "";
function hideAllSections(){
    document.querySelector(".qr-card").style.display = "none";
    document.querySelector(".stats-grid").style.display = "none";
    document.getElementById("myClassesSection").style.display = "none";
    document.getElementById("studentsSection").style.display = "none";
    document.getElementById("settingsSection").style.display = "none"; 
    document.getElementById("reportsSection").style.display = "none";
}

window.onload = async function(){

    const token = localStorage.getItem("token");

    if (!token){
        window.location.href = "teacher_login.html";
        return;
    }

    try{

        // ===== LOAD PROFILE =====
        const response = await fetch(`${BASE_URL}/teacher/profile`,{
            headers:{ Authorization:"Bearer "+token }
        });

        const data = await response.json();

        document.getElementById("teacherName").innerText = data.name;
        document.getElementById("teacherId").innerText =
            "Teacher ID: " + data.employeeId;

        document.getElementById("profileName").innerText = data.name;
        document.getElementById("profileEmployeeId").innerText =
            data.employeeId;

        // ===== LOAD TOTAL CLASSES =====
        await loadTotalClasses();

        // ===== LOAD THEME =====
        if(localStorage.getItem("theme")==="dark"){
            document.body.classList.add("dark-mode");
            document.getElementById("darkToggle").checked = true;
        }

        // ===== LOAD QR EXPIRY =====
        const saved =
            localStorage.getItem("qrExpiry_"+token) || 120000;

        document.getElementById("currentExpiryText").innerText =
            (saved/60000)+" Minutes";

        document.getElementById("expirySelect").value = saved;

    }catch(err){
        console.error("Dashboard Load Error:",err);
    }
};


let attendanceTimer;
let expiryTime;
async function startAttendance(){

  closeAttendance();

  const token = localStorage.getItem("token");

  const section = document.getElementById("sectionSelect").value;

if(!section){
  alert("Please select section");
  return;
}

const res = await fetch(`${BASE_URL}/teacher/start-session`, {
  method: "POST",
  headers: {
    Authorization: "Bearer " + token,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ section })
});

  const data = await res.json();
  const sessionId = data.sessionId; // ✅ real session from backend

  const qrWrapper = document.getElementById("qrWrapper");
  const qrDiv = document.getElementById("qrcode");

  qrDiv.innerHTML="";
  qrWrapper.style.display="flex";

  const qrURL = `${window.location.origin}/scan.html?session=${sessionId}`;

  new QRCode(qrDiv,{
    text: qrURL,
    width:220,
    height:220
  });

  startTimer();
  window.currentSessionId = sessionId;

// 🔥 start live count
    startLiveCount();
}
let liveInterval;

function startLiveCount(){

    clearInterval(liveInterval); // prevent multiple loops

    liveInterval = setInterval(async ()=>{

        if(!window.currentSessionId) return;

        try{
            const res = await fetch(
                `${BASE_URL}/teacher/live-count/${window.currentSessionId}`
            );

            const data = await res.json();


        }catch(err){
            console.error("Live count error",err);
        }

    },2000);
    loadAttendanceList();
}

function startTimer(){

    const token = localStorage.getItem("token");

    let saved = localStorage.getItem("qrExpiry_" + token);

    // ✅ Fix invalid value
    if(!saved || isNaN(saved)){
        saved = 120000; // default 2 minutes
    }

    saved = parseInt(saved);

    expiryTime = Date.now() + saved;

    attendanceTimer = setInterval(()=>{

        let timeLeft = expiryTime - Date.now();

        if(timeLeft <= 0){
            closeAttendance();
            return;
        }

        let sec = Math.floor(timeLeft / 1000);
        let m = Math.floor(sec / 60);
        let s = sec % 60;

        document.getElementById("timerText").innerText =
        `Expires in ${m}:${s.toString().padStart(2,"0")}`;

    },1000);
}

async function closeAttendance(){

  // 🔥 call backend to close session
  if(window.currentSessionId){
    await fetch(`${BASE_URL}/teacher/close-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        sessionId: window.currentSessionId
      })
    });
  }

  clearInterval(attendanceTimer);
  document.getElementById("qrWrapper").style.display="none";
  document.getElementById("qrcode").innerHTML="";
  document.getElementById("timerText").innerText="";
}

function openClassModal(){
    document.getElementById("classModal").style.display = "flex";
}

function closeClassModal(){
    document.getElementById("classModal").style.display = "none";
}
async function conductClass(){

    const token = localStorage.getItem("token");
    const section = document.getElementById("classSection").value;
    const date = document.getElementById("dateInput").value;

    if(!section || !date){
        alert("Select section and date");
        return;
    }

    const response = await fetch(`${BASE_URL}/teacher/conduct-class`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({ section, date })
    });

    const data = await response.json();

    if(!data.success){
        alert(data.message);
        return;
    }

    closeClassModal();

    // Refresh section data
    
    loadSectionData();
}


async function loadTotalClasses(){

    const token = localStorage.getItem("token");

    const section = document.getElementById("sectionSelect").value;

    let url = `${BASE_URL}/teacher/total-classes`;

    // ✅ add section filter
    if(section){
        url += `?section=${section}`;
    }

    const response = await fetch(url, {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    const data = await response.json();

    document.getElementById("totalClasses").innerText =
    data.totalClasses;
}

async function loadClasses(){

    const token = localStorage.getItem("token");

    const response = await fetch(`${BASE_URL}/teacher/classes`, {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    const classes = await response.json();

    // Update Total Classes
    document.getElementById("totalClasses").innerText = classes.length;


    // Show in sidebar
    let existing = document.getElementById("classList");
    if(existing) existing.remove();

    const div = document.createElement("div");
    div.id = "classList";

    classes.forEach(cls => {
        const p = document.createElement("p");
        p.innerText = "Section " + cls.section + " - " + cls.date;

        div.appendChild(p);
    });

    document.getElementById("myClassesContainer").appendChild(div);

}

async function showMyClasses(){

    hideAllSections();
    setActiveLink("myClassesLink");

    document.getElementById("myClassesSection").style.display = "block";

    const section = document.getElementById("myClassSectionSelect").value;

    if(!section){
        document.getElementById("classListContainer").innerHTML =
            "<p>Please select a section.</p>";
        return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(
        `${BASE_URL}/teacher/my-classes/${section}`,
        {
            headers: {
                Authorization: "Bearer " + token
            }
        }
    );

    const classes = await response.json();

    const container = document.getElementById("classListContainer");
    container.innerHTML = "";

    if(classes.length === 0){
        container.innerHTML = "<p>No classes found for this section.</p>";
        return;
    }

    classes.forEach(cls => {

        const div = document.createElement("div");
        div.className = "class-card";

        div.innerHTML = `
            <div>
                <strong>Section:</strong> ${cls.section}<br>
                <strong>Date:</strong> ${cls.date}
            </div>
            <button onclick="deleteClass('${cls._id}')"
                style="background:red;color:white;border:none;padding:6px 10px;border-radius:6px;">
                Delete
            </button>
        `;

        container.appendChild(div);
    });
}






async function deleteClass(id){

    const token = localStorage.getItem("token");

    const confirmDelete = confirm("Are you sure you want to delete this class?");
    if(!confirmDelete) return;

    await fetch(`${BASE_URL}/teacher/delete-class/${id}`, {
        method: "DELETE",
        headers: {
            Authorization: "Bearer " + token
        }
    });

    // Reload updated data
    loadTotalClasses();
    showMyClasses();
}

function showDashboard(){
    hideAllSections();
    setActiveLink("dashboardLink");

    document.querySelector(".qr-card").style.display = "block";
    document.querySelector(".stats-grid").style.display = "grid";
}

function showReports(){
    hideAllSections();
    setActiveLink("reportsLink");

    document.getElementById("reportsSection").style.display="block";
}
let chart;

async function loadReports(){

    const section = document.getElementById("reportSection").value;
    const date = document.getElementById("reportDate").value;

    if(!section) return;

    const token = localStorage.getItem("token");

    const res = await fetch(
        `${BASE_URL}/teacher/reports/${section}?date=${date}`,
        {
            headers:{
                Authorization:"Bearer "+token
            }
        }
    );

    const data = await res.json();

    renderChart(data.trend);
    renderTable(data.students);
    renderLowAttendance(data.students);
}
function renderChart(trend){

    const ctx = document.getElementById("attendanceChart");

    if(chart) chart.destroy();

    chart = new Chart(ctx,{
        type:"line",
        data:{
            labels: trend.map(t=>t.date),
            datasets:[{
                label:"Attendance %",
                data: trend.map(t=>t.attendance),
                borderColor:"#7c3aed",
                fill:false
            }]
        }
    });
}
function renderTable(students){

    const tbody = document.getElementById("reportTable");
    tbody.innerHTML="";

    students.forEach(s=>{

        let status="Good";
        let color="green";

        if(s.attendance < 75){
            status="Low";
            color="red";
        }
        else if(s.attendance < 85){
            status="Average";
            color="orange";
        }

        const tr=document.createElement("tr");

        tr.innerHTML=`
        <td>${s.name}</td>
        <td>${s.roll}</td>
        <td>${s.attendance}%</td>
        <td style="color:${color}; font-weight:bold;">${status}</td>
        `;

        tbody.appendChild(tr);
    });
}
function renderLowAttendance(students){

    const container = document.getElementById("lowAttendanceList");
    container.innerHTML="";

    const low = students.filter(s=>s.attendance < 75);

    if(low.length===0){
        container.innerHTML="<p>All students are good 👍</p>";
        return;
    }

    low.forEach(s=>{
        const div=document.createElement("p");
        div.style.color="red";
        div.innerText=`${s.name} (${s.attendance}%)`;
        container.appendChild(div);
    });
}
function downloadCSV(){

    let rows = [["Name","Roll","Attendance"]];

    document.querySelectorAll("#reportTable tr").forEach(tr=>{
        const cols = tr.querySelectorAll("td");
        rows.push([
            cols[0].innerText,
            cols[1].innerText,
            cols[2].innerText
        ]);
    });

    let csv = rows.map(r=>r.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "report.csv";
    a.click();
}
function setActiveLink(linkId){

    // remove active from ALL nav items
    document.querySelectorAll(".nav-item").forEach(link=>{
        link.classList.remove("active");
    });

    // add active to clicked one
    document.getElementById(linkId).classList.add("active");
}
async function loadSectionData(){

    const section = document.getElementById("sectionSelect").value;
    currentSection = section;

    if(!section){
        document.getElementById("totalClasses").innerText = "0";
        document.getElementById("totalStudents").innerText = "0";
        document.getElementById("todaysAttendance").innerText =
    data.todaysAttendance;
        return;
    }

    // ✅ THIS will handle total classes correctly
    loadTotalClasses();

    const token = localStorage.getItem("token");

    const response = await fetch(
        `${BASE_URL}/teacher/section-data/${section}`,
        {
            headers: {
                Authorization: "Bearer " + token
            }
        }
    );

    const data = await response.json();

    // ❌ REMOVE THIS LINE (important)
    // document.getElementById("totalClasses").innerText = data.totalClasses;

    document.getElementById("totalStudents").innerText =
        data.totalStudents;

    document.getElementById("todaysAttendance").innerText =
        data.todaysAttendance + "%";
}


document.getElementById("myClassSectionSelect")
.addEventListener("change", function(){
    showMyClasses();
});


function showStudents(){
    hideAllSections();
    setActiveLink("studentsLink");

    document.getElementById("studentsSection").style.display = "block";
}


document.getElementById("studentSectionSelect")
.addEventListener("change", async function(){

    const section = this.value;

    if(!section){
        document.getElementById("studentsListContainer").innerHTML = "";
        return;
    }

    const token = localStorage.getItem("token");

    const response = await fetch(
       `${BASE_URL}/teacher/students/${section}`,
        {
            headers: {
                Authorization: "Bearer " + token
            }
        }
    );

    const students = await response.json();

    const container = document.getElementById("studentsListContainer");
    container.innerHTML = "";

    if(students.length === 0){
        container.innerHTML = "<p>No students found.</p>";
        return;
    }

    students.forEach(student => {

        const div = document.createElement("div");
        div.className = "student-name-card";

        div.innerHTML = `
            <span class="student-click"
            onclick='openStudentModal(${JSON.stringify(student)})'>
            ${student.Name}
            </span>
        `;



        container.appendChild(div);
    });

});
document.getElementById("studentSearch")
.addEventListener("input", function(){

    const value = this.value.toLowerCase();
    const cards = document.querySelectorAll(".student-name-card");

    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(value) ? "flex" : "none";
    });
});
function openStudentModal(student){

    const studentId = student.Student_ID || student["Student_ID"] || student["Student_ID "];

    document.getElementById("modalId").innerText = studentId;
    document.getElementById("modalName").innerText = student.Name;
    document.getElementById("modalRoll").innerText = student.RollNo;
    document.getElementById("modalSection").innerText = student.Section;

    document.getElementById("studentModal").style.display = "flex";
}



function closeStudentModal(){
    document.getElementById("studentModal").style.display = "none";
}
window.onclick = function(event){
    const modal = document.getElementById("studentModal");
    if(event.target === modal){
        modal.style.display = "none";
    }
}
function showSettings(){
    hideAllSections();
    setActiveLink("settingsLink");

    document.getElementById("settingsSection").style.display = "block";

    const token = localStorage.getItem("token");
    const saved =
        localStorage.getItem("qrExpiry_" + token) || 120000;

    document.getElementById("currentExpiryText").innerText =
        (saved / 60000) + " Minutes";

    document.getElementById("expirySelect").value = saved;
}


function toggleDarkMode(){

    document.body.classList.toggle("dark-mode");

    if(document.body.classList.contains("dark-mode")){
        localStorage.setItem("theme", "dark");
    } else {
        localStorage.setItem("theme", "light");
    }
}


function updateExpiry(value){
    const token = localStorage.getItem("token");

    localStorage.setItem("qrExpiry_" + token, value);

    document.getElementById("currentExpiryText").innerText =
        (value / 60000) + " Minutes";
}

async function loadAttendanceList(){

    if(!window.currentSessionId) return;

    const res = await fetch(
        `${BASE_URL}/teacher/session-attendance/${window.currentSessionId}`
    );

    const data = await res.json();

    const container = document.getElementById("attendanceList");

    container.innerHTML = "<h3>Present Students</h3>";

    data.forEach(s=>{
        const p = document.createElement("p");
        p.innerText = `${s.name} (${s.studentId}) - ${s.time}`;
        container.appendChild(p);
    });
}