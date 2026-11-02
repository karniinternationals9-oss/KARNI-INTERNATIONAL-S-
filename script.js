/* RDB NexGlobal: shared script for all pages */
(function () {
  'use strict';
  document.documentElement.classList.add('js');

  var WA_NUMBER = '918504093551';

  // ---------- Logo fallback ----------
  // If logo_transparent.png is not uploaded yet, show the saved original logo file instead.
  document.querySelectorAll('img[data-fallback]').forEach(function (img) {
    function useFallback() {
      if (img.dataset.fallbackUsed) return;
      img.dataset.fallbackUsed = '1';
      img.src = img.dataset.fallback;
      var fav = document.getElementById('favicon');
      if (fav) fav.href = 'assets/brand/rdb-nexglobal-icon.jpg';
    }
    img.addEventListener('error', useFallback);
    if (img.complete && img.naturalWidth === 0) useFallback();
  });

  // ---------- Mobile menu ----------
  var toggle = document.getElementById('menuToggle');
  var menu = document.getElementById('navMenu');
  if (toggle && menu) {
    var closeMenu = function () {
      menu.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    };
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    menu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', closeMenu); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    document.addEventListener('click', function (e) {
      if (menu.classList.contains('open') && !menu.contains(e.target) && !toggle.contains(e.target)) closeMenu();
    });
  }

  // ---------- Header shadow ----------
  var header = document.getElementById('header');
  function onScroll() { if (header) header.classList.toggle('scrolled', window.scrollY > 10); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Reveal on scroll ----------
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('visible'); });
  }

  // ---------- Footer year ----------
  document.querySelectorAll('.year').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  // ---------- Portfolio filter + lightbox ----------
  var grid = document.getElementById('portfolioGrid');
  if (grid) {
    var buttons = document.querySelectorAll('.filter-btn');
    var empty = document.getElementById('pfEmpty');
    var items = function () { return Array.prototype.slice.call(grid.querySelectorAll('.pf-item')); };
    var visibleItems = function () { return items().filter(function (i) { return !i.classList.contains('hide'); }); };

    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.dataset.filter;
        buttons.forEach(function (b) {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        items().forEach(function (item) {
          item.classList.toggle('hide', f !== 'all' && item.dataset.category !== f);
        });
        if (empty) empty.hidden = visibleItems().length > 0;
      });
    });

    var lb = document.getElementById('lightbox');
    var lbMedia = document.getElementById('lbMedia');
    var lbCaption = document.getElementById('lbCaption');
    var current = 0;
    var lastFocus = null;

    var show = function (index) {
      var list = visibleItems();
      if (!list.length) return;
      current = (index + list.length) % list.length;
      var item = list[current];
      var img = item.querySelector('img');
      lbMedia.innerHTML = '';
      if (img) {
        var big = document.createElement('img');
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        lbMedia.appendChild(big);
      } else {
        var ph = item.querySelector('.pf-placeholder');
        if (ph) lbMedia.appendChild(ph.cloneNode(true));
      }
      var cap = item.querySelector('figcaption');
      lbCaption.textContent = cap
        ? Array.prototype.map.call(cap.children, function (c) { return c.textContent.trim(); }).filter(Boolean).join(' \u2013 ')
        : '';
    };
    var open = function (item) {
      lastFocus = document.activeElement;
      show(visibleItems().indexOf(item));
      lb.hidden = false;
      document.body.classList.add('lb-open');
      document.getElementById('lbClose').focus();
    };
    var close = function () {
      lb.hidden = true;
      document.body.classList.remove('lb-open');
      if (lastFocus) lastFocus.focus();
    };

    items().forEach(function (item) {
      item.setAttribute('tabindex', '0');
      item.setAttribute('role', 'button');
      item.addEventListener('click', function () { open(item); });
      item.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(item); }
      });
    });
    document.getElementById('lbClose').addEventListener('click', close);
    document.getElementById('lbPrev').addEventListener('click', function () { show(current - 1); });
    document.getElementById('lbNext').addEventListener('click', function () { show(current + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') show(current - 1);
      if (e.key === 'ArrowRight') show(current + 1);
    });
  }

  // ---------- Contact form -> WhatsApp ----------
  var form = document.getElementById('enquiryForm');
  if (form) {
    var errorBox = document.getElementById('formError');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.name.value.trim();
      var business = form.business.value.trim();
      var service = form.service.value;
      var message = form.message.value.trim();

      form.name.classList.toggle('invalid', !name);
      form.service.classList.toggle('invalid', !service);
      if (!name || !service) {
        errorBox.textContent = 'Please enter your name and choose a service.';
        errorBox.hidden = false;
        (!name ? form.name : form.service).focus();
        return;
      }
      errorBox.hidden = true;

      var lines = [
        'Hello RDB NexGlobal, I have an enquiry.',
        '',
        'Name: ' + name,
        'Business: ' + (business || '-'),
        'Service: ' + service
      ];
      if (message) lines.push('Message: ' + message);

      var url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
      var win = window.open(url, '_blank');
      if (win) win.opener = null; else window.location.href = url;
    });
  }
})();
