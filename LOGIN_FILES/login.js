// LOGIN FORM
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

// SWITCH LINKS
const showSignup = document.getElementById("showSignup");
const showLogin = document.getElementById("showLogin");

// Show Sign Up form
showSignup.addEventListener("click", (e) => {
    e.preventDefault();
    loginForm.style.display = "none";
    signupForm.style.display = "flex";
});

// Show Login form
showLogin.addEventListener("click", (e) => {
    e.preventDefault();
    signupForm.style.display = "none";
    loginForm.style.display = "flex";
});

// GOOGLE BUTTONS — go to dashboard
document.getElementById("googleLogin").addEventListener("click", () => {
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
});

document.getElementById("googleSignup").addEventListener("click", () => {
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
});

// HANDLE SIGN IN
loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
        alert("Please fill in all fields!");
        return;
    }

    // TODO: replace with real authentication later
    window.location.href = "../DASHBOARD_FILES/dashboard.html";
});

// HANDLE SIGN UP
signupForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const inputs = signupForm.querySelectorAll("input, select");
    let valid = true;

    inputs.forEach((input) => {
        if (!input.value) valid = false;
    });

    if (!valid) {
        alert("Please fill in all fields!");
        return;
    }

    alert("Account created successfully!");

    // Switch back to login form after signup
    signupForm.style.display = "none";
    loginForm.style.display = "flex";
});