document.getElementById("studentSignupForm")
.addEventListener("submit", function(e){

    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const studentId = document.getElementById("studentId").value;
    const password = document.getElementById("password").value;

    const studentData = {
        name,
        email,
        studentId,
        password
    };

    console.log("Student Signup Data:", studentData);

    document.getElementById("message").innerText =
        "Signup Successful ✅ (Backend not connected yet)";
});
