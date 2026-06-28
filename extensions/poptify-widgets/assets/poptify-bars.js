/*
 * Poptify announcement bars (storefront). Contract: PublicAppSettings + PublicAnnouncementBar[].
 * Render simple/countdown/free_shipping_progress + gate client-side. Vanilla JS.
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

  var settings = readJSON('poptify-bars-settings');
  var data = readJSON('poptify-bars-data');
  var root = document.getElementById('poptify-bars-root');

  if (!settings || settings.appEnabled !== true) return;
  if (!withinSchedule(settings.schedule)) return;
  if (!deviceMatches(settings.deviceTarget)) return;

  var pageKey = currentPageKey(root);
  var bars = (data && data.bars) || [];
  bars.forEach(function (b) {
    if (barVisible(b, pageKey)) render(b);
  });

  function withinSchedule(s) {
    if (!s) return true;
    var n = Date.now();
    if (s.startDate && n < Date.parse(s.startDate)) return false;
    if (s.endDate && n >= Date.parse(s.endDate)) return false;
    return true;
  }

  function deviceMatches(t) {
    if (!t || t === 'all') return true;
    var m = window.matchMedia('(max-width: 768px)').matches;
    return t === 'mobile' ? m : !m;
  }

  function currentPageKey(el) {
    var t = (el && el.getAttribute('data-page-type')) || '';
    return t === 'index' ? 'homepage' : t;
  }

  function barVisible(b, pageKey) {
    var v = b.visibility || {};
    if (!deviceMatches(v.deviceTarget)) return false;
    var tp = v.targetPages;
    if (tp && tp.length && tp.indexOf('all') === -1 && tp.indexOf(pageKey) === -1)
      return false;
    return true;
  }

  function applyStyle(el, style) {
    style = style || {};
    if (style.backgroundColor) el.style.backgroundColor = style.backgroundColor;
    if (style.textColor) el.style.color = style.textColor;
    if (style.fontSize) el.style.fontSize = style.fontSize;
    if (style.height) el.style.minHeight = style.height;
  }

  function textNode(parent, cls, text) {
    var s = document.createElement('span');
    s.className = cls;
    s.textContent = text; // textContent → escape-on-render (chống XSS)
    parent.appendChild(s);
    return s;
  }

  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  function render(b) {
    var c = b.content || {};
    var bar = document.createElement('div');
    bar.className =
      'poptify-bar poptify-bar-' +
      (b.position === 'bottom' ? 'bottom' : 'top') +
      (b.sticky ? ' poptify-bar-sticky' : '');
    applyStyle(bar, b.style);

    if (b.type === 'countdown') renderCountdown(bar, c);
    else if (b.type === 'free_shipping_progress') renderFreeShipping(bar, c);
    else renderSimple(bar, c);

    document.body.appendChild(bar);
  }

  function renderSimple(bar, c) {
    if (c.text) textNode(bar, 'poptify-bar-text', c.text);
    if (c.buttonText) {
      var a = document.createElement('a');
      a.className = 'poptify-bar-btn';
      a.textContent = c.buttonText;
      if (c.buttonLink && /^https:\/\//i.test(c.buttonLink)) {
        a.href = c.buttonLink;
        a.setAttribute('rel', 'noopener noreferrer');
      }
      bar.appendChild(a);
    }
  }

  function renderCountdown(bar, c) {
    if (c.text) textNode(bar, 'poptify-bar-text', c.text);
    var timer = textNode(bar, 'poptify-bar-timer', '');
    var end = c.endDate ? Date.parse(c.endDate) : NaN;
    if (isNaN(end)) return;

    var iv = setInterval(tick, 1000);
    tick();

    function tick() {
      var diff = end - Date.now();
      if (diff <= 0) {
        clearInterval(iv);
        bar.textContent = '';
        if (c.expiredMessage) textNode(bar, 'poptify-bar-text', c.expiredMessage);
        return;
      }
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400);
      var h = Math.floor((s % 86400) / 3600);
      var m = Math.floor((s % 3600) / 60);
      timer.textContent = d + 'd ' + pad(h) + ':' + pad(m) + ':' + pad(s % 60);
    }
  }

  function renderFreeShipping(bar, c) {
    var goal =
      typeof c.goalAmount === 'number'
        ? c.goalAmount
        : parseFloat(c.goalAmount || '0') || 0;
    var textSpan = textNode(bar, 'poptify-bar-text', c.progressText || '');
    var track = document.createElement('div');
    track.className = 'poptify-bar-progress';
    var fill = document.createElement('div');
    fill.className = 'poptify-bar-progress-fill';
    track.appendChild(fill);
    bar.appendChild(track);

    fetch('/cart.js', { headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        // total_price là cents (Shopify AJAX API) → đổi sang đơn vị tiền.
        var total =
          cart && typeof cart.total_price === 'number'
            ? cart.total_price / 100
            : 0;
        var pct = goal > 0 ? Math.min(100, (total / goal) * 100) : 0;
        fill.style.width = pct + '%';
        if (goal > 0 && total >= goal) {
          textSpan.textContent = c.successText || c.progressText || '';
        }
      })
      .catch(function () {});
  }
})();
