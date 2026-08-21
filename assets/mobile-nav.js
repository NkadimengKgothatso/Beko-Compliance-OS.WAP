/* Mobile navigation injection for Beko ComplianceOS sidebar pages */
(function () {
  // Register PWA service worker on all sidebar pages
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/service-worker.js')
      .catch(err => console.error('Service worker registration failed:', err));
  }

  const aside = document.querySelector('aside');
  if (!aside) return;

  const nav = aside.querySelector('nav');
  const userBox = aside.querySelector('.user-box');
  const existingLogout = aside.querySelector('.logout');
  const logoSrc = aside.querySelector('img')?.src || '/bg.jpeg';

  // Create mobile header
  const header = document.createElement('header');
  header.className = 'mobile-header';
  header.innerHTML = `
    <img class="logo" src="${logoSrc}" alt="Beko ComplianceOS">
    <button class="hamburger" aria-label="Open menu" aria-expanded="false">
      <span></span>
      <span></span>
      <span></span>
    </button>
  `;

  // Create mobile menu
  const menu = document.createElement('div');
  menu.className = 'mobile-menu';

  let userHtml = '';
  if (userBox) {
    const name = userBox.querySelector('.name')?.textContent || '';
    const email = userBox.querySelector('.email')?.textContent || '';
    userHtml = `
      <div class="menu-user">
        <div class="name">${escapeHtml(name)}</div>
        <div class="email">${escapeHtml(email)}</div>
      </div>
    `;
  }

  let linksHtml = '';
  if (nav) {
    const links = Array.from(nav.querySelectorAll('a'));
    const currentPath = window.location.pathname;
    linksHtml = links
      .map(link => {
        const href = link.getAttribute('href');
        const isActive = href && currentPath.includes(href.replace(/^\//, ''));
        return `<a href="${href}" class="${isActive ? 'active' : ''}">${escapeHtml(link.textContent)}</a>`;
      })
      .join('');
  }

  menu.innerHTML = `
    ${userHtml}
    <nav>${linksHtml}</nav>
    <button class="logout" id="mobileLogout">Log out</button>
  `;

  document.body.insertBefore(header, document.body.firstChild);
  document.body.appendChild(menu);

  // Hamburger toggle
  const hamburger = header.querySelector('.hamburger');
  hamburger.addEventListener('click', () => {
    const open = menu.classList.toggle('open');
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  // Close menu when a link is clicked
  menu.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    });
  });

  // Mobile logout triggers existing logout logic
  const mobileLogout = menu.querySelector('#mobileLogout');
  mobileLogout.addEventListener('click', () => {
    if (existingLogout) {
      existingLogout.click();
    } else if (typeof handleLogout === 'function') {
      handleLogout();
    } else {
      window.location.href = '/login/login.html';
    }
  });

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
