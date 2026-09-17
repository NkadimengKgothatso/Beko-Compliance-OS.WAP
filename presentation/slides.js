
const slides = document.querySelectorAll('.slide');
const TOTAL = slides.length;
let current = 0;

function show(idx) {
  if (idx < 0 || idx >= TOTAL) return;
  slides[current].classList.remove('active');
  current = idx;
  slides[current].classList.add('active');
  document.getElementById('counter').textContent = `${current + 1} / ${TOTAL}`;
  document.getElementById('progressBar').style.width = `${((current + 1) / TOTAL) * 100}%`;
  document.getElementById('prevBtn').style.opacity = current === 0 ? '0.3' : '1';
  document.getElementById('nextBtn').style.opacity = current === TOTAL - 1 ? '0.3' : '1';
}

function navigate(dir) { show(current + dir); }

document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); navigate(1); }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); navigate(-1); }
  if (e.key === 'Home') { e.preventDefault(); show(0); }
  if (e.key === 'End') { e.preventDefault(); show(TOTAL - 1); }
});

// Touch support
let touchStartX = 0;
document.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; });
document.addEventListener('touchend', e => {
  const diff = touchStartX - e.changedTouches[0].screenX;
  if (Math.abs(diff) > 50) navigate(diff > 0 ? 1 : -1);
});

// Save as PDF — opens print dialog
function savePDF() {
  window.print();
}

show(0);
