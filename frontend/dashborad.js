window.onload = async function () {

    const token = localStorage.getItem("token");

    if (!token) {
        alert("Please login first");
        window.location.href = "teacher_login.html";
        return;
    }

    const response = await fetch("http://localhost:5000/teacher/profile", {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    if (response.status === 401 || response.status === 403) {
        alert("Session expired. Login again.");
        localStorage.removeItem("token");
        window.location.href = "teacher_login.html";
        return;
    }

    const data = await response.json();

    document.getElementById("teacherName").innerText = data.name;
    document.getElementById("teacherId").innerText =
        "Teacher ID: " + data.employeeId;
        loadTotalClasses();


};

let attendanceTimer;
let expiryTime;

function startAttendance(){

closeAttendance();

const qrWrapper = document.getElementById("qrWrapper");
const qrDiv = document.getElementById("qrcode");

qrDiv.innerHTML="";
qrWrapper.style.display="flex";

const sessionId = "SESSION_"+Date.now();
expiryTime = Date.now() + 120000;

// CHANGE IP IF NEEDED
const qrURL = `${window.location.origin}/frontend/scan.html?session=${sessionId}`;


new QRCode(qrDiv,{
text:qrURL,
width:220,
height:220
});

startTimer();
}

function startTimer(){
attendanceTimer = setInterval(()=>{

let timeLeft = expiryTime - Date.now();

if(timeLeft<=0){
closeAttendance();
return;
}

let sec = Math.floor(timeLeft/1000);
let m = Math.floor(sec/60);
let s = sec%60;

document.getElementById("timerText").innerText =
`Expires in ${m}:${s.toString().padStart(2,"0")}`;

},1000);
}

function closeAttendance(){
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
    const date = document.getElementById("dateInput").value;

    if(!date){
        alert("Select date");
        return;
    }

    const response = await fetch("http://localhost:5000/teacher/conduct-class", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token
        },
        body: JSON.stringify({ date })
    });

    const data = await response.json();

    if(!data.success){
        alert(data.message);
        return;
    }

    closeClassModal();
    loadTotalClasses();
}
async function loadTotalClasses(){

    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:5000/teacher/total-classes", {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    const data = await response.json();

    // Update total count
    document.querySelector(".stat-card h1").innerText = data.totalClasses;


    
}

async function loadClasses(){

    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:5000/teacher/classes", {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    const classes = await response.json();

    // Update Total Classes
    document.querySelector(".stat-card h1").innerText = classes.length;

    // Show in sidebar
    let existing = document.getElementById("classList");
    if(existing) existing.remove();

    const div = document.createElement("div");
    div.id = "classList";

    classes.forEach(cls => {
        const p = document.createElement("p");
        p.innerText = cls.subject + " - " + cls.date;
        div.appendChild(p);
    });

    document.querySelector(".sidebar-nav").appendChild(div);
}

async function showMyClasses(){

    setActiveLink("myClassesLink");

    document.querySelector(".qr-card").style.display = "none";
    document.querySelector(".stats-grid").style.display = "none";
    document.getElementById("myClassesSection").style.display = "block";

    const token = localStorage.getItem("token");

    const response = await fetch("http://localhost:5000/teacher/total-classes", {
        headers: { Authorization: "Bearer " + token }
    });

    const data = await response.json();

    const container = document.getElementById("classListContainer");
    container.innerHTML = "";

    data.dates.forEach(item => {
        const div = document.createElement("div");
        div.className = "card";
        div.style.margin = "10px 0";
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h4>Class Conducted</h4>
                    <p>Date: ${item.date}</p>
                </div>
                <button onclick="deleteClass('${item._id}')"
                        style="background:red; color:white; padding:6px 12px; border:none; border-radius:6px;">
                    Delete
                </button>
            </div>
        `;
        container.appendChild(div);
    });
}

async function deleteClass(date){

    const token = localStorage.getItem("token");

    const confirmDelete = confirm("Are you sure you want to delete this class?");
    if(!confirmDelete) return;

    await fetch(`http://localhost:5000/teacher/delete-class/${date}`, {
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

    setActiveLink("dashboardLink");

    document.querySelector(".qr-card").style.display = "block";
    document.querySelector(".stats-grid").style.display = "grid";
    document.getElementById("myClassesSection").style.display = "none";
}


function setActiveLink(linkId){

    document.getElementById("dashboardLink").classList.remove("active");
    document.getElementById("myClassesLink").classList.remove("active");

    document.getElementById(linkId).classList.add("active");
}
