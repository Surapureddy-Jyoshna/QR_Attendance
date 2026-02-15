
window.onload = function(){

    const form = document.getElementById("teacherLoginForm");

    form.addEventListener("submit", function(e){

        e.preventDefault();

        const employeeId = document.getElementById("employeeId").value;
        const password = document.getElementById("password").value;

        fetch("http://localhost:5000/teacher/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ employeeId, password })
        })
        .then(res => res.json())
        .then(data => {

            if(data.success){

                // 🔐 Store JWT Token
                localStorage.setItem("token", data.token);

                // Redirect to dashboard
                window.location.href = "teacher_dashboard.html";

            } else {
                document.getElementById("message").innerText = data.message;
            }

        })
        .catch(err => {
            console.error(err);
            document.getElementById("message").innerText = "Server Error";
        });
    });

};
