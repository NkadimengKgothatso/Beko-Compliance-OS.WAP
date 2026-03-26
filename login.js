// Correct overlay toggle
const container = document.getElementById('container');

document.getElementById('registerSwitch').addEventListener('click', () => {
    container.classList.add('active');   // <-- use 'active'
});

document.getElementById('loginSwitch').addEventListener('click', () => {
    container.classList.remove('active');  // <-- use 'active'
});

// Handle Sign In
function handleLogin() {
    const email = document.querySelector('#loginForm input[type="email"]').value;
    const password = document.querySelector('#loginForm input[type="password"]').value;
    const role = document.querySelector('#role').value;

    if (!email || !password || !role) {
        alert("Please fill in all fields!");
        return;
    }

    // Redirect example
    if(role === "client") {
        window.location.href = "cHome.html";
    } else if(role === "admin") {
        window.location.href = "adminHome.html";
    }
}

// Handle Sign Up
function handleSignup() {
    const inputs = document.querySelectorAll('#signupForm input');
    let valid = true;
    inputs.forEach(input => {
        if(!input.value) valid = false;
    });

    if(!valid) {
        alert("Please fill in all fields!");
        return;
    }

    alert("Account created successfully!");
    container.classList.remove('right-panel-active');
}

