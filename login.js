// form-toggle.js

document.addEventListener("DOMContentLoaded", () => {

    const container = document.getElementById('container');
    const registerSwitch = document.getElementById('registerSwitch');
    const loginSwitch = document.getElementById('loginSwitch');

    // Toggle forms
    registerSwitch.addEventListener('click', () => {
        container.classList.add('active');
    });

    loginSwitch.addEventListener('click', () => {
        container.classList.remove('active');
    });


});

function handleLogin() {
    const role = document.getElementById("role").value;

    if (role === "client") {
        window.location.href = "cHome.html";
    } else if (role === "admin") {
        window.location.href = "admin.html";
    } else {
        alert("Please select a role");
    }
}