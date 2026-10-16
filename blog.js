// blog.js - news pages: tag filter (noutati.html), share buttons + reading progress (articles).
(function () {
    function t(ro, en) { return window.TR_I18N ? TR_I18N.t(ro, en) : ro; }

    // ---------- Tag filter on the news list ----------
    function setupFilter() {
        var bar = document.querySelector('.tag-filter');
        var cards = document.querySelectorAll('.post-card[data-tags]');
        if (!bar || !cards.length) return;
        var buttons = bar.querySelectorAll('button[data-tag]');
        var count = document.getElementById('postCount');

        function apply(tag, push) {
            var shown = 0;
            buttons.forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.tag === tag ? 'true' : 'false'); });
            cards.forEach(function (card) {
                var match = !tag || (' ' + card.dataset.tags + ' ').indexOf(' ' + tag + ' ') > -1;
                card.hidden = !match;
                if (match) { shown++; card.classList.add('active'); }
            });
            if (count) count.textContent = shown === 1 ? t('1 articol', '1 article') : t(shown + ' articole', shown + ' articles');
            if (push) {
                var url = new URL(location.href);
                if (tag) url.searchParams.set('eticheta', tag); else url.searchParams.delete('eticheta');
                history.replaceState(null, '', url);
            }
        }

        buttons.forEach(function (b) {
            b.addEventListener('click', function () { apply(b.dataset.tag, true); });
        });

        var initial = new URLSearchParams(location.search).get('eticheta') || '';
        var known = Array.prototype.some.call(buttons, function (b) { return b.dataset.tag === initial; });
        apply(known ? initial : '', false);
        if (window.TR_I18N) TR_I18N.onChange(function () {
            var on = bar.querySelector('[aria-pressed="true"]');
            apply(on ? on.dataset.tag : '', false);
        });
    }

    // ---------- Share ----------
    function setupShare() {
        document.querySelectorAll('[data-share]').forEach(function (bar) {
            var url = bar.dataset.url || location.href;
            var title = bar.dataset.title || document.title;

            var native = bar.querySelector('.share-native');
            if (native && navigator.share) {
                native.hidden = false;
                native.addEventListener('click', function () {
                    navigator.share({ title: title, url: url }).catch(function () { /* dismissed */ });
                });
            }

            var copy = bar.querySelector('.share-copy');
            if (copy) {
                var label = copy.querySelector('[data-i18n]');
                copy.addEventListener('click', function () {
                    clearTimeout(copy._timer);
                    (window.TR_COPY ? TR_COPY(url) : Promise.reject()).then(function () {
                        label.textContent = t('Link copiat!', 'Link copied!');
                        copy.classList.add('copiat');
                    }, function () {
                        window.prompt(t('Copiază linkul:', 'Copy the link:'), url);
                    }).then(function () {
                        copy._timer = setTimeout(function () {
                            copy.classList.remove('copiat');
                            if (window.TR_I18N) TR_I18N.apply(copy); else label.textContent = 'Copiază linkul';
                        }, 1800);
                    });
                });
            }
        });
    }

    // ---------- Events linked to the article (from site-data.js, so they stay in sync with the calendar) ----------
    function setupPostEvents() {
        var box = document.querySelector('.post-events[data-post]');
        if (!box || !window.TR_CALENDAR) return;
        var list = box.querySelector('.post-events-list');
        var post = box.dataset.post;

        function render() {
            var ev = TR_CALENDAR.getEvents();
            var mine = ev.upcoming.concat(ev.past.slice().reverse()).filter(function (e) { return e.raw.post === post; })
                .sort(function (a, b) { return a.start - b.start; });
            list.replaceChildren();
            box.hidden = !mine.length;
            var now = Date.now();
            mine.forEach(function (e) {
                var li = document.createElement('li');
                if (e.end.getTime() <= now) li.className = 'is-past';
                var a = document.createElement('a');
                a.href = (window.TR_ROOT || '') + 'calendar.html#ev-' + e.id;
                var title = document.createElement('strong');
                title.textContent = e.title();
                var when = document.createElement('span');
                when.textContent = TR_CALENDAR.whenText(e) + (e.location() ? ' · ' + e.location() : '');
                a.append(title, when);
                li.appendChild(a);
                list.appendChild(li);
            });
        }

        render();
        if (window.TR_I18N) TR_I18N.onChange(render);
    }

    // ---------- Reading progress ----------
    function setupProgress() {
        var bar = document.querySelector('.read-progress span');
        var article = document.querySelector('.post-body');
        if (!bar || !article) return;
        var ticking = false;

        function update() {
            ticking = false;
            var rect = article.getBoundingClientRect();
            var total = rect.height - window.innerHeight * 0.6;
            var done = total > 0 ? (-rect.top + window.innerHeight * 0.25) / total : 1;
            bar.style.transform = 'scaleX(' + Math.max(0, Math.min(1, done)).toFixed(4) + ')';
        }

        window.addEventListener('scroll', function () {
            if (ticking) return;
            ticking = true;
            requestAnimationFrame(update);
        }, { passive: true });
        window.addEventListener('resize', update, { passive: true });
        update();
    }

    document.addEventListener('DOMContentLoaded', function () {
        setupFilter();
        setupShare();
        setupPostEvents();
        setupProgress();
    });
})();
