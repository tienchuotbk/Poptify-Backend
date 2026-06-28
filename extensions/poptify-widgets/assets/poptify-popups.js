/*
 * Poptify popups (storefront). Đọc config từ metafield (script JSON do block xuất),
 * thực thi gate client-side + trigger + frequency + render. Vanilla JS, không lib.
 * Contract: PublicAppSettings + PublicPopup[] (xem backend spec.md F4/F5).
 */
(function () {
  'use strict';

  function readJSON(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    try {
      return JSON.parse(el.textContent);
    } catch (e) {
      return null;
    }
  }

  var settings = readJSON('poptify-settings-data');
  var popupsData = readJSON('poptify-popups-data');
  var root = document.getElementById('poptify-root');

  // Gate tổng: app phải bật + trong lịch + đúng thiết bị.
  if (!settings || settings.appEnabled !== true) return;
  if (!withinSchedule(settings.schedule)) return;
  if (!deviceMatches(settings.deviceTarget)) return;

  var pageKey = currentPageKey(root);
  var popups = (popupsData && popupsData.popups) || [];
  popups.forEach(function (p) {
    setupPopup(p, pageKey);
  });

  function withinSchedule(s) {
    if (!s) return true;
    var now = Date.now();
    if (s.startDate && now < Date.parse(s.startDate)) return false;
    if (s.endDate && now >= Date.parse(s.endDate)) return false;
    return true;
  }

  function deviceMatches(target) {
    if (!target || target === 'all') return true;
    var isMobile = window.matchMedia('(max-width: 768px)').matches;
    return target === 'mobile' ? isMobile : !isMobile;
  }

  function currentPageKey(el) {
    var t = (el && el.getAttribute('data-page-type')) || '';
    return t === 'index' ? 'homepage' : t;
  }

  function pageAllowed(p, pageKey) {
    var tp = p.targetPages;
    if (!tp || !tp.length) return true;
    if (tp.indexOf('all') !== -1) return true;
    return tp.indexOf(pageKey) !== -1;
  }

  function freqStorageKey(p) {
    return 'poptify_seen_' + p.id;
  }

  function frequencyAllowed(p) {
    var f = (p.frequency && p.frequency.frequency) || 'every_visit';
    if (f === 'every_visit') return true;
    var key = freqStorageKey(p);
    if (f === 'once_per_session') return !sessionStorage.getItem(key);
    var last = parseInt(localStorage.getItem(key) || '0', 10);
    if (!last) return true;
    var diff = Date.now() - last;
    if (f === 'once_per_day') return diff >= 86400000;
    if (f === 'once_per_week') return diff >= 604800000;
    return true;
  }

  function markSeen(p) {
    var f = (p.frequency && p.frequency.frequency) || 'every_visit';
    var key = freqStorageKey(p);
    if (f === 'once_per_session') sessionStorage.setItem(key, '1');
    else if (f === 'once_per_day' || f === 'once_per_week') {
      localStorage.setItem(key, String(Date.now()));
    }
  }

  function setupPopup(p, pageKey) {
    if (!pageAllowed(p, pageKey)) return;
    if (!frequencyAllowed(p)) return;

    var trig = (p.trigger && p.trigger.type) || 'page_load';
    var val = parseInt((p.trigger && p.trigger.value) || '0', 10) || 0;
    var fire = function () {
      show(p);
    };

    if (trig === 'time_delay') setTimeout(fire, val * 1000);
    else if (trig === 'scroll_percentage') onScroll(val, fire);
    else if (trig === 'exit_intent') onExit(fire);
    else fire(); // page_load (mặc định)
  }

  function onScroll(percent, cb) {
    var fired = false;
    function handler() {
      if (fired) return;
      var h = document.documentElement;
      var scrolled = h.scrollTop || document.body.scrollTop;
      var max = h.scrollHeight - h.clientHeight || 1;
      if ((scrolled / max) * 100 >= percent) {
        fired = true;
        window.removeEventListener('scroll', handler);
        cb();
      }
    }
    window.addEventListener('scroll', handler, { passive: true });
  }

  function onExit(cb) {
    var fired = false;
    document.addEventListener('mouseout', function (e) {
      if (fired) return;
      if (!e.relatedTarget && e.clientY <= 0) {
        fired = true;
        cb();
      }
    });
  }

  function textEl(tag, cls, text) {
    var el = document.createElement(tag);
    el.className = cls;
    // textContent (KHÔNG innerHTML) → escape-on-render, chống XSS (defense-in-depth).
    el.textContent = text;
    return el;
  }

  function show(p) {
    var d = p.design || {};
    var c = p.content || {};

    var validPos = { center: 1, bottom_left: 1, bottom_right: 1 };
    var pos = validPos[d.position] ? d.position : 'center';
    var overlay = document.createElement('div');
    overlay.className = 'poptify-overlay poptify-pos-' + pos;

    var box = document.createElement('div');
    box.className = 'poptify-box';
    if (d.backgroundColor) box.style.backgroundColor = d.backgroundColor;
    if (d.textColor) box.style.color = d.textColor;
    if (d.borderRadius) box.style.borderRadius = d.borderRadius;
    if (d.width) box.style.maxWidth = d.width;

    function dismiss() {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    if (d.showCloseButton !== false) {
      var close = document.createElement('button');
      close.className = 'poptify-close';
      close.setAttribute('aria-label', 'Close');
      close.textContent = '×';
      close.addEventListener('click', dismiss);
      box.appendChild(close);
    }
    if (c.title) box.appendChild(textEl('h2', 'poptify-title', c.title));
    if (c.description) box.appendChild(textEl('p', 'poptify-desc', c.description));
    if (c.couponCode) box.appendChild(textEl('div', 'poptify-coupon', c.couponCode));
    if (c.buttonText) {
      var a = document.createElement('a');
      a.className = 'poptify-btn';
      a.textContent = c.buttonText;
      // chỉ nhận https (BE đã validate; guard lần nữa chống javascript:/data:).
      if (c.buttonLink && /^https:\/\//i.test(c.buttonLink)) {
        a.href = c.buttonLink;
        a.setAttribute('rel', 'noopener noreferrer');
      }
      box.appendChild(a);
    }

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) dismiss();
    });
    document.body.appendChild(overlay);
    markSeen(p);
  }
})();
