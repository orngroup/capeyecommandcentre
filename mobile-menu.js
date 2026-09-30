// ══════════════════════════════════════════════════════════════════════
// CapEye — Mobile Menu (v1.8)
// Adds a hamburger (☰) button on small screens that slides the existing
// nav links out as a full-height drawer. No per-page HTML changes needed:
// it finds .nav / .nav-links on any page and enhances them.
// ══════════════════════════════════════════════════════════════════════
(function () {
  function init() {
    var nav = document.querySelector('nav.nav') || document.querySelector('nav');
    var links = nav && nav.querySelector('.nav-links');
    if (!nav || !links) return;
    if (document.getElementById('ceHamburger')) return; // already added

    // Hamburger button
    var btn = document.createElement('button');
    btn.id = 'ceHamburger';
    btn.setAttribute('aria-label', 'Menu');
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    btn.className = 'ce-hamburger';

    // Backdrop
    var backdrop = document.createElement('div');
    backdrop.id = 'ceNavBackdrop';
    backdrop.className = 'ce-nav-backdrop';

    // Insert hamburger right after the brand (so it sits top-left area)
    var brand = nav.querySelector('.nav-brand');
    if (brand && brand.nextSibling) {
      nav.insertBefore(btn, brand.nextSibling);
    } else {
      nav.insertBefore(btn, nav.firstChild);
    }
    document.body.appendChild(backdrop);

    function openMenu() {
      links.classList.add('ce-open');
      backdrop.classList.add('ce-show');
      document.body.style.overflow = 'hidden';
    }
    function closeMenu() {
      links.classList.remove('ce-open');
      backdrop.classList.remove('ce-show');
      document.body.style.overflow = '';
    }
    function toggleMenu() {
      if (links.classList.contains('ce-open')) closeMenu(); else openMenu();
    }

    btn.addEventListener('click', toggleMenu);
    backdrop.addEventListener('click', closeMenu);
    // Close after tapping any nav link
    links.addEventListener('click', function (e) {
      if (e.target.closest('a')) closeMenu();
    });
    // Close on resize back to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeMenu();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
