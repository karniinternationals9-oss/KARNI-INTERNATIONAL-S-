(function () {
  'use strict';

  // Logo fallback: if logo_transparent.png is missing, show the saved original logo file instead.
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function useFallback() {
      if (img.dataset.fallbackUsed) return;
      img.dataset.fallbackUsed = '1';
      img.src = img.dataset.fallback;
    }
    img.addEventListener('error', useFallback);
    if (img.complete && img.naturalWidth === 0) useFallback();
  });

  // Mobile menu
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('navMenu');
  function closeMenu() {
    menu.classList.remove('open');
    toggle.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }
  toggle.addEventListener('click', function () {
    var open = menu.classList.toggle('open');
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  });
  menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  // Header shadow on scroll
  var header = document.getElementById('header');
  function onScroll() { header.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // Active menu link
  var links = document.querySelectorAll('.nav-menu a[href^="#"]');
  var sections = ['home', 'services', 'about', 'contact']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);
  function setActive() {
    var pos = window.scrollY + 120;
    var current = 'home';
    sections.forEach(function (s) { if (s.offsetTop <= pos) current = s.id; });
    links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + current); });
  }
  window.addEventListener('scroll', setActive, { passive: true });
  setActive();

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
