/*
 * Poptify product slider (storefront). Enhance markup do Liquid render: arrows,
 * dots, autoplay (đọc data-*). Render product đã do Liquid (Liquid-native qua handle).
 */
(function () {
  'use strict';

  function init(slider) {
    var track = slider.querySelector('.poptify-slider-track');
    if (!track) return;

    var arrows = slider.getAttribute('data-arrows') === 'true';
    var dots = slider.getAttribute('data-dots') === 'true';
    var autoplay = slider.getAttribute('data-autoplay') === 'true';
    var speed = parseInt(slider.getAttribute('data-autoplay-speed') || '0', 10);

    function page() {
      return Math.max(track.clientWidth, 1);
    }

    if (arrows) {
      addArrow('prev', -1);
      addArrow('next', 1);
    }

    if (dots) buildDots();

    if (autoplay && speed > 0) {
      var timer = setInterval(function () {
        var atEnd = track.scrollLeft + page() >= track.scrollWidth - 4;
        if (atEnd) track.scrollTo({ left: 0, behavior: 'smooth' });
        else track.scrollBy({ left: page(), behavior: 'smooth' });
      }, speed);
      slider.addEventListener('mouseenter', function () {
        clearInterval(timer);
      });
    }

    function addArrow(kind, dir) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'poptify-slider-arrow poptify-slider-arrow-' + kind;
      btn.setAttribute('aria-label', kind);
      btn.textContent = dir < 0 ? '‹' : '›';
      btn.addEventListener('click', function () {
        track.scrollBy({ left: dir * page(), behavior: 'smooth' });
      });
      slider.appendChild(btn);
    }

    function buildDots() {
      var cards = track.children.length;
      if (!cards) return;
      var nav = document.createElement('div');
      nav.className = 'poptify-slider-dots';
      var pages = Math.ceil(cards / itemsPerView());
      for (var i = 0; i < pages; i++) {
        (function (idx) {
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'poptify-slider-dot';
          dot.setAttribute('aria-label', 'slide ' + (idx + 1));
          dot.addEventListener('click', function () {
            track.scrollTo({ left: idx * page(), behavior: 'smooth' });
          });
          nav.appendChild(dot);
        })(i);
      }
      slider.appendChild(nav);
    }

    function itemsPerView() {
      var w = window.innerWidth;
      var prop =
        w <= 600
          ? '--poptify-mobile'
          : w <= 1024
            ? '--poptify-tablet'
            : '--poptify-desktop';
      var v = parseInt(
        getComputedStyle(slider).getPropertyValue(prop) || '4',
        10,
      );
      return v > 0 ? v : 4;
    }
  }

  function boot() {
    var sliders = document.querySelectorAll('.poptify-slider');
    Array.prototype.forEach.call(sliders, init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
