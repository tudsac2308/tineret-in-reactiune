// spark.js - Spark the mascot: cursor follower (desktop), homepage tips + greeting, easter egg, celebrations.
(function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var GREETED_KEY = 'tr-spark-greeted';

    function t(ro, en) { return window.TR_I18N ? TR_I18N.t(ro, en) : ro; }

    // ------------------------------------------------------------ star confetti + POW
    var STAR = 'M50 3 61 36 97 36 68 57 79 92 50 71 21 92 32 57 3 36 39 36Z';
    var COLORS = ['#FFC90E', '#E62A2B', '#0E5E9C', '#40C4FF', '#FFFFFF'];

    function svgStar(color) {
        var ns = 'http://www.w3.org/2000/svg';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'confetti-star');
        svg.setAttribute('aria-hidden', 'true');
        var path = document.createElementNS(ns, 'path');
        path.setAttribute('d', STAR);
        path.setAttribute('fill', color);
        path.setAttribute('stroke', '#111111');
        path.setAttribute('stroke-width', '7');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
        return svg;
    }

    function burstAt(x, y, count) {
        if (reduceMotion || !Element.prototype.animate) return;
        for (var i = 0; i < count; i++) {
            var s = svgStar(COLORS[i % COLORS.length]);
            s.style.left = (x - 13) + 'px';
            s.style.top = (y - 13) + 'px';
            document.body.appendChild(s);
            var angle = Math.random() * Math.PI * 2;
            var dist = 90 + Math.random() * 170;
            var anim = s.animate([
                { transform: 'translate(0,0) rotate(0deg) scale(0.4)', opacity: 1 },
                { transform: 'translate(' + Math.cos(angle) * dist + 'px,' + (Math.sin(angle) * dist + 60) + 'px) rotate(' + (Math.random() * 540 - 270) + 'deg) scale(1)', opacity: 0 }
            ], { duration: 900 + Math.random() * 500, easing: 'cubic-bezier(.2,.8,.3,1)' });
            anim.onfinish = s.remove.bind(s);
        }
    }

    function pow(x, y, label) {
        if (reduceMotion) return;
        var ns = 'http://www.w3.org/2000/svg';
        var wrap = document.createElement('div');
        wrap.className = 'pow-burst';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.style.left = x + 'px';
        wrap.style.top = y + 'px';
        var svg = document.createElementNS(ns, 'svg');
        svg.setAttribute('viewBox', '0 0 200 200');
        var poly = document.createElementNS(ns, 'polygon');
        var pts = [];
        for (var i = 0; i < 28; i++) {
            var r = i % 2 ? 62 : 96, a = (i / 28) * Math.PI * 2;
            pts.push((100 + Math.cos(a) * r).toFixed(1) + ',' + (100 + Math.sin(a) * r).toFixed(1));
        }
        poly.setAttribute('points', pts.join(' '));
        poly.setAttribute('fill', '#E62A2B');
        poly.setAttribute('stroke', '#111111');
        poly.setAttribute('stroke-width', '6');
        poly.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(poly);
        var span = document.createElement('span');
        span.textContent = label;
        wrap.append(svg, span);
        document.body.appendChild(wrap);
        setTimeout(function () { wrap.remove(); }, 1200);
    }

    function celebrateAt(x, y) {
        pow(x, y, 'POW!');
        burstAt(x, y, 26);
    }

    window.TR_SPARK = {
        celebrate: function (el) {
            var r = el.getBoundingClientRect();
            celebrateAt(r.left + r.width / 2, r.top + Math.min(r.height / 2, 160));
        }
    };

    // ------------------------------------------------------------ homepage hero Spark
    function setupHero() {
        var heroSpark = document.getElementById('heroSpark');
        var tip = document.getElementById('sparkTip');
        var tips = (window.SITE_DATA && SITE_DATA.sparkTips) || [];
        if (!heroSpark || !tip || !tips.length) return;

        var index = 0, hideTimer = null, shown = null;

        function render(i) {
            var item = tips[i];
            tip.replaceChildren(document.createTextNode(t(item.ro, item.en)));
            if (item.href) {
                tip.appendChild(document.createElement('br'));
                var a = document.createElement('a');
                a.href = item.href === 'signup' ? (SITE_DATA.signupUrl || 'inscriere.html') : item.href;
                a.textContent = t('Hai! →', 'Let\'s go! →');
                if (/^https?:/.test(a.getAttribute('href'))) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
                tip.appendChild(a);
            }
        }

        function show(i) {
            shown = i;
            render(i);
            tip.classList.add('show');
            clearTimeout(hideTimer);
            hideTimer = setTimeout(function () {
                tip.classList.remove('show');
                shown = null;
                hideTimer = setTimeout(function () { tip.replaceChildren(); }, 400);
            }, 7000);
        }

        heroSpark.addEventListener('click', function () {
            index = (index + 1) % tips.length;
            show(index);
            heroSpark.classList.add('boing');
            setTimeout(function () { heroSpark.classList.remove('boing'); }, 220);
        });

        if (window.TR_I18N) TR_I18N.onChange(function () { if (shown !== null) render(shown); });

        var greeted = false;
        try { greeted = localStorage.getItem(GREETED_KEY) === '1'; } catch (e) { /* treat as new */ }
        if (!greeted) {
            setTimeout(function () {
                show(0);
                try { localStorage.setItem(GREETED_KEY, '1'); } catch (e) { /* not persisted */ }
            }, reduceMotion ? 300 : 2000);
        }

        // Easter egg: tap the logo sticker five times.
        var badge = document.querySelector('.hero-logo');
        var clicks = [];
        if (badge) {
            badge.addEventListener('click', function (e) {
                var now = Date.now();
                clicks = clicks.filter(function (c) { return now - c < 2500; });
                clicks.push(now);
                if (clicks.length >= 5) {
                    clicks = [];
                    celebrateAt(e.clientX, e.clientY);
                    show(tips.length - 1);
                }
            });
        }
    }

    // ------------------------------------------------------------ cursor-following Spark (desktop only)
    function setupCursor() {
        // Same conditions under which style.css shows it; created here so phones never download the image.
        var canShow = window.matchMedia('(hover: hover) and (pointer: fine) and (min-width: 769px)').matches;
        if (!canShow || reduceMotion) return;

        var spark = document.createElement('img');
        spark.id = 'spark-cursor';
        spark.src = (window.TR_ROOT || '') + 'spark2-sm.webp';
        spark.alt = '';
        spark.width = 140;
        spark.height = 116;
        spark.decoding = 'async';
        spark.setAttribute('aria-hidden', 'true');
        document.body.appendChild(spark);

        var mouseX = window.innerWidth / 2, mouseY = -150;
        var sparkX = mouseX, sparkY = mouseY;
        var scale = 1, targetScale = 1;
        var running = false;
        var paused = false;

        // On the homepage the hero already has a big Spark: follow the cursor only once it scrolls away.
        var hero = document.getElementById('hero');
        if (hero && 'IntersectionObserver' in window) {
            new IntersectionObserver(function (entries) {
                paused = entries[0].isIntersecting;
                if (paused) spark.style.opacity = '0';
            }, { threshold: 0.35 }).observe(hero);
        }

        function start() {
            if (running) return;
            running = true;
            requestAnimationFrame(frame);
        }

        document.addEventListener('mousemove', function (e) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            targetScale = e.target.closest && e.target.closest('.btn, .btn-small, .nav-cta, button, a') ? 1.35 : 1;
            if (paused) return;
            spark.style.opacity = '1';
            start();
        }, { passive: true });

        function frame() {
            var distX = mouseX - sparkX, distY = mouseY - sparkY;
            var distance = Math.hypot(distX, distY);
            if (distance < 15) spark.style.opacity = '0';

            sparkX += distX * 0.08;
            sparkY += distY * 0.08;
            scale += (targetScale - scale) * 0.15;

            var angle = Math.atan2(distY, distX) * (180 / Math.PI) + 180;
            var flip = distX > 0 ? -1 : 1;
            spark.style.transform = 'translate(' + (sparkX - 35) + 'px, ' + (sparkY - 35) + 'px) rotate(' + angle + 'deg) scale(' + scale.toFixed(3) + ', ' + (flip * scale).toFixed(3) + ')';

            if (distance < 0.5 && Math.abs(targetScale - scale) < 0.01) { running = false; return; }
            requestAnimationFrame(frame);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        setupHero();
        setupCursor();
    });
})();
