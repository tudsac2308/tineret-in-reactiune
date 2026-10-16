// shared.js - common header/footer, mobile menu, language switch, dates, PWA install + service worker.
(function () {
    // Pages inside a folder (e.g. noutati/...) set <body data-root="../"> so links still resolve.
    var ROOT = document.body.getAttribute('data-root') || '';
    window.TR_ROOT = ROOT;

    var SIGNUP = (window.SITE_DATA && SITE_DATA.signupUrl) || (ROOT + 'inscriere.html');
    var NEW_TAB = ' <span class="sr-only" data-i18n="a11y.newTab">(se deschide într-o filă nouă)</span>';

    var NAV_ITEMS = [
        { key: 'index',    href: 'index.html',    label: 'Acasă',    i18n: 'nav.home' },
        { key: 'despre',   href: 'despre.html',   label: 'Despre',   i18n: 'nav.about' },
        { key: 'noutati',  href: 'noutati.html',  label: 'Noutăți',  i18n: 'nav.news' },
        { key: 'calendar', href: 'calendar.html', label: 'Calendar', i18n: 'nav.calendar' },
        { key: 'donatii',  href: 'donatii.html',  label: 'Donații',  i18n: 'nav.donate' },
        { key: 'contact',  href: 'contact.html',  label: 'Contact',  i18n: 'nav.contact' }
    ];

    var SEARCH_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="6.5" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 15l6 6" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"/></svg>';

    function renderHeader(activeKey) {
        var links = NAV_ITEMS.map(function (item) {
            var cls = item.key === activeKey ? ' class="active" aria-current="page"' : '';
            return '<li><a href="' + ROOT + item.href + '"' + cls + ' data-i18n="' + item.i18n + '">' + item.label + '</a></li>';
        }).join('');

        return (
            '<a href="' + ROOT + 'index.html" class="pop-logo-container">' +
                '<img src="' + ROOT + 'logo-tineret-sm.webp" alt="" width="260" height="157">' +
                '<span class="site-title">Tineret <span>în</span> Reacțiune</span>' +
            '</a>' +
            '<nav class="pop-nav" data-i18n-attr="aria-label:nav.label" aria-label="Meniu principal">' +
                '<button type="button" class="search-toggle" id="searchToggle" aria-haspopup="dialog" data-i18n-attr="aria-label:search.open" aria-label="Caută pe site">' + SEARCH_ICON + '</button>' +
                '<button type="button" class="menu-toggle" id="menuToggle" aria-label="Deschide meniul" aria-expanded="false" aria-controls="navLinks">' +
                    '<span></span><span></span><span></span>' +
                '</button>' +
                '<ul class="nav-links" id="navLinks">' + links +
                    '<li><a href="' + SIGNUP + '" class="nav-cta" target="_blank" rel="noopener noreferrer"><span data-i18n="nav.join">Înscrie-te!</span>' + NEW_TAB + '</a></li>' +
                    '<li><button type="button" class="lang-toggle" id="langToggle"></button></li>' +
                '</ul>' +
            '</nav>'
        );
    }

    function renderFooter() {
        var year = new Date().getFullYear();

        return (
            '<div class="footer-inner">' +
                '<div class="footer-col comic-pop">' +
                    '<h2 data-i18n="footer.contact">Contact</h2>' +
                    '<p><a href="mailto:salut@tineretinreactiune.ro">✉️ salut@tineretinreactiune.ro</a></p>' +
                    '<p><a href="tel:+40744217031">📞 0744 217 031</a></p>' +
                    '<p><a href="' + ROOT + 'inscriere.html" data-i18n="footer.howToJoin">Cum te înscrii în echipă</a></p>' +
                '</div>' +
                '<div class="footer-col comic-pop" style="transition-delay:0.1s">' +
                    '<h2 data-i18n="footer.follow">Urmărește-ne</h2>' +
                    '<div class="footer-social">' +
                        '<a href="https://instagram.com/tineretinreactiune" target="_blank" rel="noopener noreferrer">Instagram' + NEW_TAB + '</a>' +
                        '<a href="https://facebook.com/tineretinreactiune" target="_blank" rel="noopener noreferrer">Facebook' + NEW_TAB + '</a>' +
                        '<a href="' + ROOT + 'feed.xml" data-i18n="footer.rss">Flux RSS al noutăților</a>' +
                    '</div>' +
                    '<p class="footer-handle">@tineretinreactiune</p>' +
                '</div>' +
                '<div class="footer-col comic-pop" style="transition-delay:0.2s">' +
                    '<p data-i18n="footer.funding">Proiect finanțat de Uniunea Europeană prin programul Erasmus+.</p>' +
                    '<p>&copy; ' + year + ' Tineret în Reacțiune — <span data-i18n="footer.byAssoc">un proiect al asociației „Eu, tu și ei”.</span></p>' +
                    '<p><a href="' + ROOT + 'confidentialitate.html" data-i18n="footer.privacy">Politica de confidențialitate</a></p>' +
                    '<button type="button" class="btn-install" id="installApp" hidden data-i18n="footer.install">📲 Instalează pe telefon</button>' +
                '</div>' +
            '</div>'
        );
    }

    function wireMobileMenu() {
        var menuToggle = document.getElementById('menuToggle');
        var navLinks = document.getElementById('navLinks');
        if (!menuToggle || !navLinks) return;

        function isOpen() { return navLinks.classList.contains('open'); }

        function setOpen(open) {
            navLinks.classList.toggle('open', open);
            menuToggle.classList.toggle('open', open);
            menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            updateToggleLabel();
        }

        function updateToggleLabel() {
            var open = isOpen();
            menuToggle.setAttribute('aria-label', open
                ? TR_I18N.t('Închide meniul', 'Close menu')
                : TR_I18N.t('Deschide meniul', 'Open menu'));
        }

        menuToggle.addEventListener('click', function () { setOpen(!isOpen()); });
        navLinks.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () { setOpen(false); });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && isOpen()) { setOpen(false); menuToggle.focus(); }
        });
        document.addEventListener('click', function (e) {
            if (isOpen() && !navLinks.contains(e.target) && !menuToggle.contains(e.target)) setOpen(false);
        });
        TR_I18N.onChange(updateToggleLabel);
        updateToggleLabel();
    }

    function wireLangToggle() {
        var btn = document.getElementById('langToggle');
        if (!btn) return;
        function render() {
            var en = TR_I18N.lang === 'en';
            btn.textContent = en ? 'RO' : 'EN';
            btn.setAttribute('lang', en ? 'ro' : 'en');
            btn.setAttribute('aria-label', en ? 'Schimbă limba în română' : 'Switch language to English');
        }
        btn.addEventListener('click', function () {
            TR_I18N.set(TR_I18N.lang === 'en' ? 'ro' : 'en');
        });
        TR_I18N.onChange(render);
        render();
    }

    // Every link marked data-signup (and "#signup" placeholders) goes to the sign-up form.
    function wireSignupLinks() {
        document.querySelectorAll('a[data-signup]').forEach(function (a) {
            a.href = SIGNUP;
            if (/^https?:/.test(SIGNUP)) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
        });
    }

    // <time datetime="2026-10-16" data-format="long"> follows the chosen language.
    function formatDates(root) {
        (root || document).querySelectorAll('time[data-format]').forEach(function (el) {
            var d = new Date(el.getAttribute('datetime') + 'T12:00:00Z');
            if (isNaN(d)) return;
            el.textContent = new Intl.DateTimeFormat(TR_I18N.lang === 'en' ? 'en-GB' : 'ro-RO', {
                timeZone: 'Europe/Bucharest', day: 'numeric', month: 'long', year: 'numeric'
            }).format(d);
        });
    }

    function wireInstall() {
        var btn = document.getElementById('installApp');
        var deferred = null;
        window.addEventListener('beforeinstallprompt', function (e) {
            e.preventDefault();
            deferred = e;
            if (btn) btn.hidden = false;
        });
        window.addEventListener('appinstalled', function () {
            deferred = null;
            if (btn) btn.hidden = true;
        });
        if (!btn) return;
        btn.addEventListener('click', function () {
            if (!deferred) return;
            deferred.prompt();
            deferred.userChoice.then(function () { deferred = null; btn.hidden = true; });
        });
    }

    // A page transition can be skipped (hidden tab, very fast clicks). That's fine; don't log it as an error.
    ['pageswap', 'pagereveal'].forEach(function (type) {
        window.addEventListener(type, function (e) {
            var vt = e.viewTransition;
            if (!vt) return;
            [vt.ready, vt.finished, vt.updateCallbackDone].forEach(function (p) { if (p) p.catch(function () {}); });
        });
    });

    if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js').catch(function () { /* offline support is optional */ });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var headerEl = document.getElementById('site-header');
        var footerEl = document.getElementById('site-footer');

        if (headerEl) {
            headerEl.innerHTML = renderHeader(document.body.dataset.page);
            TR_I18N.apply(headerEl);
            wireMobileMenu();
            wireLangToggle();
        }
        if (footerEl) {
            footerEl.innerHTML = renderFooter();
            TR_I18N.apply(footerEl);
        }
        wireSignupLinks();
        formatDates(document);
        TR_I18N.onChange(function () { formatDates(document); });
        wireInstall();
    });
})();
