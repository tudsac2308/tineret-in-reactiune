// search.js - site search: pages + news (search-index.json, built by _tools/build.py) + events (site-data.js).
// Opens from the header magnifier, Ctrl/Cmd+K or "/". Diacritics-insensitive ("reactiune" finds "Reacțiune").
(function () {
    var ROOT = function () { return window.TR_ROOT || ''; };
    var MAX_RESULTS = 12;
    var index = null, loading = null;
    var dialog, input, list, status, opener;
    var results = [], active = -1;

    function t(ro, en) { return window.TR_I18N ? TR_I18N.t(ro, en) : ro; }
    function en() { return window.TR_I18N && TR_I18N.lang === 'en'; }

    // "(RE)acțiune!" -> "reactiune"
    function fold(s) {
        return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
            .toLowerCase().replace(/[()]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    }

    // ---------- Data ----------
    function loadIndex() {
        if (index) return Promise.resolve(index);
        if (loading) return loading;
        loading = fetch(ROOT() + 'search-index.json', { credentials: 'same-origin' })
            .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
            .then(function (data) { index = data.map(prepare).concat(eventDocs()); return index; })
            .catch(function () { loading = null; index = null; return eventDocs(); });
        return loading;
    }

    function prepare(doc) {
        doc.f = {
            title: fold(doc.title) + ' ' + fold(doc.title_en),
            head: fold((doc.headings || []).join(' ')) + ' ' + fold((doc.tags || []).join(' ')),
            text: fold(doc.desc) + ' ' + fold(doc.desc_en) + ' ' + fold(doc.text) + ' ' + fold(doc.text_en)
        };
        return doc;
    }

    // Same id as the calendar cards (calendar.js), so results land on the right card.
    function slug(s) {
        return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function eventDocs() {
        var list = (window.SITE_DATA && SITE_DATA.events) || [];
        return list.filter(function (e) { return e && e.date && e.title; }).map(function (e) {
            return prepare({
                type: 'event',
                url: 'calendar.html#ev-' + e.date + '-' + slug(e.title),
                title: e.title, title_en: e.title_en,
                desc: e.description, desc_en: e.description_en,
                text: e.location, text_en: e.location_en,
                date: e.date
            });
        });
    }

    // ---------- Matching ----------
    function search(query) {
        var terms = fold(query).split(' ').filter(function (w) { return w.length > 0; });
        if (!terms.length || !index) return [];
        var out = [];
        index.forEach(function (doc) {
            var score = 0;
            for (var i = 0; i < terms.length; i++) {
                var w = terms[i];
                var re = new RegExp('(^| )' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
                var s = 0;
                if (re.test(doc.f.title)) s += 12; else if (doc.f.title.indexOf(w) > -1) s += 6;
                if (re.test(doc.f.head)) s += 5; else if (doc.f.head.indexOf(w) > -1) s += 2;
                if (re.test(doc.f.text)) s += 2; else if (doc.f.text.indexOf(w) > -1) s += 1;
                if (!s) return; // every word must match somewhere
                score += s;
            }
            if (doc.type === 'post') score += 1;
            out.push({ doc: doc, score: score });
        });
        out.sort(function (a, b) { return b.score - a.score || String(b.doc.date || '').localeCompare(String(a.doc.date || '')); });
        return out.slice(0, MAX_RESULTS).map(function (r) { return r.doc; });
    }

    // Short excerpt around the first matching word, with <mark>s (built as DOM nodes, never as HTML).
    function snippet(doc, terms) {
        var parts = en() ? [doc.desc_en || doc.desc, doc.text_en || doc.text] : [doc.desc, doc.text];
        var text = parts.filter(Boolean).join(' — ');
        var folded = foldKeepLength(text);
        var pos = -1;
        terms.forEach(function (w) {
            var i = folded.indexOf(w);
            if (i > -1 && (pos === -1 || i < pos)) pos = i;
        });
        var start = Math.max(0, pos - 40);
        var end = Math.min(text.length, start + 160);
        return { text: text.slice(start, end), folded: folded.slice(start, end), cutStart: start > 0, cutEnd: end < text.length };
    }

    // Same length as the input (one char per char) so positions map back to the original text.
    function foldKeepLength(s) {
        return Array.from(String(s)).map(function (ch) {
            var c = ch.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
            return c.length === 1 && /[a-z0-9]/.test(c) ? c : ' ';
        }).join('');
    }

    function highlighted(sn, terms) {
        var frag = document.createDocumentFragment();
        var marks = [];
        terms.forEach(function (w) {
            if (w.length < 2) return;
            var i = sn.folded.indexOf(w);
            while (i > -1) { marks.push([i, i + w.length]); i = sn.folded.indexOf(w, i + w.length); }
        });
        marks.sort(function (a, b) { return a[0] - b[0]; });
        var cursor = 0;
        if (sn.cutStart) frag.appendChild(document.createTextNode('…'));
        marks.forEach(function (m) {
            if (m[0] < cursor) return;
            frag.appendChild(document.createTextNode(sn.text.slice(cursor, m[0])));
            var mark = document.createElement('mark');
            mark.textContent = sn.text.slice(m[0], m[1]);
            frag.appendChild(mark);
            cursor = m[1];
        });
        frag.appendChild(document.createTextNode(sn.text.slice(cursor) + (sn.cutEnd ? '…' : '')));
        return frag;
    }

    // ---------- UI ----------
    var TYPE_LABEL = {
        page: ['Pagină', 'Page'],
        post: ['Noutăți', 'News'],
        event: ['Eveniment', 'Event']
    };

    function build() {
        dialog = document.createElement('dialog');
        dialog.className = 'search-dialog';
        dialog.setAttribute('aria-labelledby', 'searchTitle');
        dialog.innerHTML =
            '<div class="search-box">' +
                '<div class="search-head">' +
                    '<h2 id="searchTitle" class="search-title"></h2>' +
                    '<button type="button" class="search-close" id="searchClose">✕</button>' +
                '</div>' +
                '<div class="search-field">' +
                    '<input type="search" id="searchInput" autocomplete="off" spellcheck="false" enterkeyhint="search"' +
                        ' role="combobox" aria-expanded="false" aria-controls="searchResults" aria-autocomplete="list">' +
                '</div>' +
                '<p class="search-status" id="searchStatus" role="status" aria-live="polite"></p>' +
                '<ul class="search-results" id="searchResults" role="listbox"></ul>' +
                '<p class="search-keys" aria-hidden="true"></p>' +
            '</div>';
        document.body.appendChild(dialog);

        input = dialog.querySelector('#searchInput');
        list = dialog.querySelector('#searchResults');
        status = dialog.querySelector('#searchStatus');
        labels();

        dialog.querySelector('#searchClose').addEventListener('click', close);
        // Click on the dimmed backdrop (outside the box) closes.
        dialog.addEventListener('click', function (e) { if (e.target === dialog) close(); });
        dialog.addEventListener('close', function () {
            document.documentElement.classList.remove('search-open');
            if (opener && document.contains(opener)) opener.focus();
        });

        var timer;
        input.addEventListener('input', function () {
            clearTimeout(timer);
            timer = setTimeout(run, 80);
        });
        input.addEventListener('keydown', onKey);
        if (window.TR_I18N) TR_I18N.onChange(function () { labels(); if (dialog.open) run(); });
    }

    function labels() {
        dialog.querySelector('#searchTitle').textContent = t('Caută pe site', 'Search the site');
        dialog.querySelector('#searchClose').setAttribute('aria-label', t('Închide căutarea', 'Close search'));
        input.setAttribute('placeholder', t('Ex: caravana, donații, Erasmus…', 'E.g. caravan, donate, Erasmus…'));
        input.setAttribute('aria-label', t('Ce cauți?', 'What are you looking for?'));
        dialog.querySelector('.search-keys').textContent = t('↑ ↓ alegi · Enter deschizi · Esc închizi', '↑ ↓ choose · Enter open · Esc close');
    }

    function run() {
        var q = input.value.trim();
        list.replaceChildren();
        active = -1;
        input.removeAttribute('aria-activedescendant');
        if (fold(q).length < 2) {
            results = [];
            status.textContent = t('Scrie cel puțin două litere.', 'Type at least two letters.');
            input.setAttribute('aria-expanded', 'false');
            return;
        }
        loadIndex().then(function () {
            if (input.value.trim() !== q) return; // a newer query is on its way
            results = search(q);
            var terms = fold(q).split(' ');
            list.replaceChildren();
            results.forEach(function (doc, i) { list.appendChild(renderResult(doc, i, terms)); });
            input.setAttribute('aria-expanded', results.length ? 'true' : 'false');
            status.textContent = results.length
                ? t(results.length === 1 ? '1 rezultat' : results.length + ' rezultate', results.length === 1 ? '1 result' : results.length + ' results')
                : t('Nimic găsit pentru „' + q + '”. Încearcă alt cuvânt.', 'Nothing found for “' + q + '”. Try another word.');
            if (results.length) setActive(0);
        });
    }

    function renderResult(doc, i, terms) {
        var li = document.createElement('li');
        li.setAttribute('role', 'option');
        li.id = 'sr-' + i;
        var a = document.createElement('a');
        a.href = ROOT() + doc.url;
        a.tabIndex = -1;
        a.className = 'search-hit search-hit--' + doc.type;

        var type = document.createElement('span');
        type.className = 'search-type';
        var label = TYPE_LABEL[doc.type] || TYPE_LABEL.page;
        type.textContent = t(label[0], label[1]);
        a.appendChild(type);

        var title = document.createElement('span');
        title.className = 'search-hit-title';
        title.textContent = en() && doc.title_en ? doc.title_en : doc.title;
        a.appendChild(title);

        var text = document.createElement('span');
        text.className = 'search-hit-text';
        text.appendChild(highlighted(snippet(doc, terms), terms));
        a.appendChild(text);

        a.addEventListener('mousemove', function () { if (active !== i) setActive(i); });
        a.addEventListener('click', function () { dialog.close(); });
        li.appendChild(a);
        return li;
    }

    function setActive(i) {
        var items = list.children;
        if (!items.length) return;
        if (active > -1 && items[active]) items[active].removeAttribute('aria-selected');
        active = (i + items.length) % items.length;
        items[active].setAttribute('aria-selected', 'true');
        input.setAttribute('aria-activedescendant', items[active].id);
        items[active].scrollIntoView({ block: 'nearest' });
    }

    function onKey(e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); setActive(active + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(active - 1); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            var hit = active > -1 && list.children[active] && list.children[active].querySelector('a');
            if (hit) { dialog.close(); location.href = hit.href; }
        }
    }

    function open(from) {
        if (!dialog) build();
        if (dialog.open) return;
        opener = from || document.activeElement;
        document.documentElement.classList.add('search-open');
        dialog.showModal();
        input.focus();
        input.select();
        run();
        loadIndex();
    }

    function close() {
        if (dialog && dialog.open) dialog.close();
    }

    document.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('searchToggle');
        if (btn) {
            btn.addEventListener('click', function () { open(btn); });
            // Warm the index up while the pointer is on its way to the button.
            btn.addEventListener('pointerenter', loadIndex, { once: true });
            btn.addEventListener('focus', loadIndex, { once: true });
        }
        document.querySelectorAll('[data-open-search]').forEach(function (el) {
            el.addEventListener('click', function (e) { e.preventDefault(); open(el); });
        });
    });

    document.addEventListener('keydown', function (e) {
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
        if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) { e.preventDefault(); open(); }
        else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); open(); }
    });

    window.TR_SEARCH = { open: open, close: close, fold: fold };
})();
