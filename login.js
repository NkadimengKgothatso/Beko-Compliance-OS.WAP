document.addEventListener("DOMContentLoaded", () => {

const container = document.getElementById('container');

document.getElementById('registerSwitch').addEventListener('click', () => {
    container.classList.add('right-panel-active');
});

document.getElementById('loginSwitch').addEventListener('click', () => {
    container.classList.remove('right-panel-active');
});
    registerSwitch.addEventListener('click', () => {
        container.classList.add("active");
    });

    loginSwitch.addEventListener('click', () => {
        container.classList.remove("active");
    });

});

