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
const qrURL = `http://10.87.15.137:5500/scan.html?session=${sessionId}`;

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
