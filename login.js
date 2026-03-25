// form-toggle.js

// Wait until DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('container');
    const registerSwitch = document.getElementById('registerSwitch');
    const loginSwitch = document.getElementById('loginSwitch');

    // When "Sign Up" button in overlay is clicked
    registerSwitch.addEventListener('click', () => {
        container.classList.add('active');
    });

    // When "Sign In" button in overlay is clicked
    loginSwitch.addEventListener('click', () => {
        container.classList.remove('active');
    });
});