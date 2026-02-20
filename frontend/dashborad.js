let currentSection = "";
function hideAllSections(){
    document.querySelector(".qr-card").style.display = "none";
    document.querySelector(".stats-grid").style.display = "none";
    document.getElementById("myClassesSection").style.display = "none";
    document.getElementById("studentsSection").style.display = "none";
    document.getElementById("settingsSection").style.display = "none"; // ADD THIS
}

window.onload = async function(){

    const token = localStorage.getItem("token");

    if (!token){
        window.location.href = "teacher_login.html";
        return;
    }

    try{

        // ===== LOAD PROFILE =====
        const response = await fetch("http://localhost:5000/teacher/profile",{
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

function startAttendance(){

closeAttendance();

const qrWrapper = document.getElementById("qrWrapper");
const qrDiv = document.getElementById("qrcode");

qrDiv.innerHTML="";
qrWrapper.style.display="flex";

const sessionId = "SESSION_"+Date.now();
const token = localStorage.getItem("token");

const savedExpiry =
    localStorage.getItem("qrExpiry_" + token) || 120000;

expiryTime = Date.now() + parseInt(savedExpiry);



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
    const section = document.getElementById("classSection").value;
    const date = document.getElementById("dateInput").value;

    if(!section || !date){
        alert("Select section and date");
        return;
    }

    const response = await fetch("http://localhost:5000/teacher/conduct-class", {
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

    const response = await fetch("http://localhost:5000/teacher/total-classes", {
        headers: {
            Authorization: "Bearer " + token
        }
    });

    const data = await response.json();

    // Update total count
    document.getElementById("totalClasses").innerText =
    data.totalClasses;




    
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
        `http://localhost:5000/teacher/my-classes/${section}`,
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

    await fetch(`http://localhost:5000/teacher/delete-class/${id}`, {
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







function setActiveLink(linkId){

    document.getElementById("dashboardLink").classList.remove("active");
    document.getElementById("myClassesLink").classList.remove("active");
    document.getElementById("studentsLink").classList.remove("active");
    document.getElementById("settingsLink").classList.remove("active");


    document.getElementById(linkId).classList.add("active");
}
async function loadSectionData(){

    const section = document.getElementById("sectionSelect").value;
    currentSection = section;

    if(!section){
        document.getElementById("totalClasses").innerText = "0";
        document.getElementById("totalStudents").innerText = "0";
        document.getElementById("todaysAttendance").innerText = "0%";
        return;
    }
    

    const token = localStorage.getItem("token");

    const response = await fetch(
        `http://localhost:5000/teacher/section-data/${section}`,
        {
            headers: {
                Authorization: "Bearer " + token
            }
        }
    );

    const data = await response.json();

    document.getElementById("totalClasses").innerText =
        data.totalClasses;

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
        `http://localhost:5000/teacher/students/${section}`,
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

