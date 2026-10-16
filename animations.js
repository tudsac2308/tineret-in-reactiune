// animations.js - scroll reveal, header shrink, back-to-top, impact counters, copy buttons.

(function () {
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // --- Scroll reveal "comic pop" (also used by content rendered later, e.g. calendar cards) ---
    var observer = null;
    if (!reduceMotion && 'IntersectionObserver' in window) {
        observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: 0.05 });
    }

    function observe(root) {
        var els = root.matches && root.matches('.comic-pop') ? [root] : root.querySelectorAll('.comic-pop');
        Array.prototype.forEach.call(els, function (el) {
            if (observer) observer.observe(el);
            else el.classList.add('active');
        });
    }

    window.TR_REVEAL = { observe: observe };

    // Registered after shared.js, so the injected footer already exists.
    document.addEventListener('DOMContentLoaded', function () {
        observe(document);
    });

    // --- Header shrink + back-to-top (one throttled, passive scroll listener) ---
    document.addEventListener('DOMContentLoaded', function () {
        var header = document.getElementById('site-header');

        var backToTop = document.createElement('button');
        backToTop.type = 'button';
        backToTop.className = 'back-to-top';
        backToTop.setAttribute('data-i18n-attr', 'aria-label:a11y.backToTop');
        backToTop.setAttribute('aria-label', 'Înapoi sus');
        backToTop.innerHTML = '&#9650;';
        document.body.appendChild(backToTop);
        if (window.TR_I18N) TR_I18N.apply(document.body);

        backToTop.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        });

        var ticking = false;
        function update() {
            ticking = false;
            var y = window.scrollY;
            if (header) header.classList.toggle('scrolled', y > 40);
            backToTop.classList.toggle('visible', y > 400);
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });

        update();
    });

    // --- Impact counters (hidden until real numbers are set in site-data.js) ---
    document.addEventListener('DOMContentLoaded', function () {
        var section = document.getElementById('impact');
        var data = window.SITE_DATA && SITE_DATA.impact;
        if (!section || !data) return;

        var items = [];
        section.querySelectorAll('[data-impact]').forEach(function (li) {
            var value = data[li.getAttribute('data-impact')];
            if (typeof value !== 'number' || value < 0) { li.remove(); return; }
            items.push({ li: li, num: li.querySelector('.impact-num'), value: value });
        });
        if (!items.length) return;
        section.hidden = false;

        function format(n) { return Math.round(n).toLocaleString('ro-RO'); }

        function countUp(item) {
            if (reduceMotion) { item.num.textContent = format(item.value); return; }
            var start = null, duration = 1600;
            function frame(ts) {
                if (start === null) start = ts;
                var p = Math.min(1, (ts - start) / duration);
                item.num.textContent = format(item.value * (1 - Math.pow(1 - p, 3)));
                if (p < 1) requestAnimationFrame(frame);
            }
            requestAnimationFrame(frame);
        }

        items.forEach(function (item) { item.num.textContent = reduceMotion ? format(item.value) : '0'; });
        if (!('IntersectionObserver' in window)) { items.forEach(countUp); return; }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (!entry.isIntersecting) return;
                io.unobserve(entry.target);
                items.forEach(function (item) { if (item.li === entry.target) countUp(item); });
            });
        }, { threshold: 0.4 });
        items.forEach(function (item) { io.observe(item.li); });
    });

    // --- Copy buttons (IBAN / cod fiscal) ---
    function fallbackCopy(text) {
        return new Promise(function (resolve, reject) {
            var input = document.createElement('textarea');
            input.value = text;
            input.setAttribute('readonly', '');
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            var ok = false;
            try { ok = document.execCommand('copy'); } catch (err) { /* unsupported */ }
            document.body.removeChild(input);
            ok ? resolve() : reject(new Error('copy failed'));
        });
    }

    function copyText(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text).catch(function () {
                return fallbackCopy(text);
            });
        }
        return fallbackCopy(text);
    }

    window.TR_COPY = copyText;

    document.addEventListener('click', function (e) {
        var btn = e.target.closest('.btn-copiaza');
        if (!btn || !btn.dataset.copy) return;

        clearTimeout(btn._resetTimer);

        copyText(btn.dataset.copy).then(function () {
            btn.textContent = TR_I18N.t('Copiat!', 'Copied!');
            btn.classList.add('copiat');
        }, function () {
            btn.textContent = TR_I18N.t('Selectează manual', 'Select manually');
        }).then(function () {
            btn._resetTimer = setTimeout(function () {
                btn.textContent = TR_I18N.t('Copiază', 'Copy');
                btn.classList.remove('copiat');
            }, 1500);
        });
    });
})();
