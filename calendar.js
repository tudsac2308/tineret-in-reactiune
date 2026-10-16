// calendar.js - renders events from SITE_DATA.events: upcoming/past lists, "add to calendar", homepage countdown.
(function () {
    var TZ = 'Europe/Bucharest';
    var DEFAULT_DURATION_MIN = 120;
    var MONTHS = {
        ro: ['IAN', 'FEB', 'MAR', 'APR', 'MAI', 'IUN', 'IUL', 'AUG', 'SEP', 'OCT', 'NOI', 'DEC'],
        en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    };

    function t(ro, en) { return window.TR_I18N ? TR_I18N.t(ro, en) : ro; }
    function lang() { return window.TR_I18N ? TR_I18N.lang : 'ro'; }

    // Offset of Romanian local time from UTC, in minutes, at a given instant (handles EET/EEST).
    function tzOffsetMinutes(date) {
        try {
            var part = new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'shortOffset' })
                .formatToParts(date).filter(function (p) { return p.type === 'timeZoneName'; })[0];
            var m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(part ? part.value : '');
            if (m) return (m[1] === '-' ? -1 : 1) * (parseInt(m[2], 10) * 60 + parseInt(m[3] || '0', 10));
        } catch (e) { /* fall through */ }
        var month = date.getUTCMonth();
        return month >= 3 && month <= 9 ? 180 : 120;
    }

    // "2026-09-19" + "10:30" (Romanian time) -> Date
    function localToDate(day, time) {
        var d = day.split('-').map(Number);
        var hm = (time || '00:00').split(':').map(Number);
        var asUtc = Date.UTC(d[0], d[1] - 1, d[2], hm[0], hm[1]);
        var result = new Date(asUtc - tzOffsetMinutes(new Date(asUtc)) * 60000);
        return new Date(asUtc - tzOffsetMinutes(result) * 60000);
    }

    function slug(s) {
        return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    // "2026-10-15" + 1 -> "2026-10-16"
    function addDays(day, n) {
        var d = day.split('-').map(Number);
        return new Date(Date.UTC(d[0], d[1] - 1, d[2] + n)).toISOString().slice(0, 10);
    }

    function normalize(raw) {
        var allDay = !raw.start;
        var lastDay = raw.endDate && raw.endDate > raw.date ? raw.endDate : raw.date;
        var start = localToDate(raw.date, raw.start);
        var end;
        if (allDay) end = localToDate(addDays(lastDay, 1), '00:00');
        else if (raw.end) end = localToDate(lastDay, raw.end);
        else end = new Date(start.getTime() + DEFAULT_DURATION_MIN * 60000);
        return {
            raw: raw,
            id: raw.date + '-' + slug(raw.title),
            start: start,
            end: end,
            allDay: allDay,
            lastDay: lastDay,
            multiDay: lastDay !== raw.date,
            title: function () { return t(raw.title, raw.title_en); },
            description: function () { return t(raw.description || '', raw.description_en); },
            location: function () { return t(raw.location || '', raw.location_en); }
        };
    }

    function getEvents() {
        var list = (window.SITE_DATA && SITE_DATA.events) || [];
        var now = Date.now();
        var all = list.filter(function (e) { return e && e.date && e.title; }).map(normalize);
        return {
            upcoming: all.filter(function (e) { return e.end.getTime() > now; }).sort(function (a, b) { return a.start - b.start; }),
            past: all.filter(function (e) { return e.end.getTime() <= now; }).sort(function (a, b) { return b.start - a.start; })
        };
    }

    // ---------- "Add to calendar" ----------
    function icsStamp(d) {
        return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    }

    function icsEscape(s) {
        return String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    }

    // RFC 5545: lines longer than 75 octets are folded (UTF-8 aware, so diacritics are never split).
    function icsFold(line) {
        var enc = new TextEncoder(), out = '', bytes = 0;
        Array.from(line).forEach(function (ch) {
            var n = enc.encode(ch).length;
            if (bytes + n > 74) { out += '\r\n '; bytes = 1; }
            out += ch; bytes += n;
        });
        return out;
    }

    function buildIcs(ev) {
        var site = (window.SITE_DATA && SITE_DATA.domain) || '';
        var lines = [
            'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Tineret in Reactiune//Calendar//RO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
            'BEGIN:VEVENT',
            'UID:' + ev.id + '@tineretinreactiune.ro',
            'DTSTAMP:' + icsStamp(new Date()),
            ev.allDay ? 'DTSTART;VALUE=DATE:' + ev.raw.date.replace(/-/g, '') : 'DTSTART:' + icsStamp(ev.start),
            ev.allDay ? 'DTEND;VALUE=DATE:' + addDays(ev.lastDay, 1).replace(/-/g, '') : 'DTEND:' + icsStamp(ev.end),
            'SUMMARY:' + icsEscape(ev.title()),
            'DESCRIPTION:' + icsEscape(ev.description()),
            'LOCATION:' + icsEscape(ev.location()),
            'URL:' + site + '/' + (ev.raw.post || 'calendar.html'),
            'END:VEVENT', 'END:VCALENDAR'
        ];
        return lines.map(icsFold).join('\r\n') + '\r\n';
    }

    function downloadIcs(ev) {
        var blob = new Blob([buildIcs(ev)], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = ev.id + '.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    function googleUrl(ev) {
        var params = new URLSearchParams({
            action: 'TEMPLATE',
            text: ev.title(),
            dates: ev.allDay
                ? ev.raw.date.replace(/-/g, '') + '/' + addDays(ev.lastDay, 1).replace(/-/g, '')
                : icsStamp(ev.start) + '/' + icsStamp(ev.end),
            details: ev.description(),
            location: ev.location(),
            ctz: TZ
        });
        return 'https://calendar.google.com/calendar/render?' + params.toString();
    }

    // ---------- Formatting ----------
    function partsInTz(d) {
        var f = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
        var p = {};
        f.formatToParts(d).forEach(function (x) { p[x.type] = x.value; });
        return { day: parseInt(p.day, 10), month: parseInt(p.month, 10) - 1, year: p.year, time: p.hour + ':' + p.minute };
    }

    function longDate(d) {
        return new Intl.DateTimeFormat(lang() === 'en' ? 'en-GB' : 'ro-RO', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' }).format(d);
    }

    // "vineri, 16 octombrie · ora 11:30", "miercuri, 14 octombrie – joi, 15 octombrie"
    function whenText(ev) {
        var text = longDate(ev.start);
        if (ev.multiDay) text += ' – ' + longDate(localToDate(ev.lastDay, '12:00'));
        if (!ev.allDay) text += ' · ' + t('ora ', 'at ') + partsInTz(ev.start).time;
        return text;
    }

    function postLink(ev) {
        var a = el('a', 'btn-small', '📰 ' + t('Citește articolul', 'Read the article'));
        a.href = (window.TR_ROOT || '') + ev.raw.post;
        return a;
    }

    function el(tag, cls, text) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (text !== undefined) n.textContent = text;
        return n;
    }

    // ---------- Calendar page ----------
    function renderCard(ev, isPast, index) {
        var p = partsInTz(ev.start);
        var card = el('article', 'event-card comic-pop' + (isPast ? ' is-past' : ''));
        card.id = 'ev-' + ev.id;
        card.style.transitionDelay = Math.min(index, 4) * 0.1 + 's';

        var date = el('div', 'event-date');
        var dayText = String(p.day);
        if (ev.multiDay) dayText += '–' + partsInTz(localToDate(ev.lastDay, '12:00')).day;
        date.appendChild(el('span', 'event-day' + (ev.multiDay ? ' is-range' : ''), dayText));
        date.appendChild(el('span', 'event-month', MONTHS[lang()][p.month]));
        date.appendChild(el('span', 'event-year', p.year));
        card.appendChild(date);

        var details = el('div', 'event-details');
        details.appendChild(el('h3', null, ev.title()));
        if (ev.description()) details.appendChild(el('p', null, ev.description()));
        var where = [ev.location(), ev.allDay ? '' : t('Ora ', 'At ') + p.time].filter(Boolean).join(' · ');
        details.appendChild(el('span', 'event-location', '📍 ' + where));

        var actions = el('div', 'event-actions');
        if (!isPast) {
            var ics = el('button', 'btn-small', '📅 ' + t('Adaugă în calendar', 'Add to calendar'));
            ics.type = 'button';
            ics.setAttribute('aria-label', t('Descarcă fișierul de calendar pentru ', 'Download the calendar file for ') + ev.title());
            ics.addEventListener('click', function () { downloadIcs(ev); });
            actions.appendChild(ics);

            var g = el('a', 'btn-small', 'Google Calendar');
            g.href = googleUrl(ev);
            g.target = '_blank';
            g.rel = 'noopener noreferrer';
            g.appendChild(el('span', 'sr-only', ' ' + t('(se deschide într-o filă nouă)', '(opens in a new tab)')));
            actions.appendChild(g);
        } else {
            card.appendChild(el('span', 'event-stamp', t('ÎNCHEIAT', 'ENDED')));
        }
        if (ev.raw.post) actions.appendChild(postLink(ev));
        if (actions.childNodes.length) details.appendChild(actions);

        card.appendChild(details);
        return card;
    }

    function renderCalendarPage() {
        var up = document.getElementById('events-upcoming');
        var past = document.getElementById('events-past');
        if (!up || !past) return;
        var ev = getEvents();

        up.replaceChildren();
        if (ev.upcoming.length) {
            ev.upcoming.forEach(function (e, i) { up.appendChild(renderCard(e, false, i)); });
        } else {
            var empty = el('p', 'events-empty comic-pop');
            empty.appendChild(document.createTextNode(t('Pregătim evenimente noi! Urmărește-ne pe ', 'New events are on the way! Follow us on ')));
            var ig = el('a', null, 'Instagram');
            ig.href = 'https://instagram.com/tineretinreactiune';
            ig.target = '_blank';
            ig.rel = 'noopener noreferrer';
            empty.appendChild(ig);
            empty.appendChild(document.createTextNode(t(' ca să afli primul.', ' to hear first.')));
            up.appendChild(empty);
        }

        past.replaceChildren();
        var pastSection = document.getElementById('events-past-section');
        if (pastSection) pastSection.hidden = !ev.past.length;
        ev.past.forEach(function (e, i) { past.appendChild(renderCard(e, true, i)); });

        if (window.TR_REVEAL) { TR_REVEAL.observe(up); TR_REVEAL.observe(past); }
        injectStructuredData(ev.upcoming);
        focusLinkedEvent();
    }

    // calendar.html#ev-... (from search results): the cards are rendered by JS, so scroll to it ourselves.
    var linkedHandled = false;
    function focusLinkedEvent() {
        if (linkedHandled || !/^#ev-/.test(location.hash)) return;
        var card = document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (!card) return;
        linkedHandled = true;
        card.classList.add('is-target', 'active');
        card.setAttribute('tabindex', '-1');
        requestAnimationFrame(function () {
            card.scrollIntoView({ block: 'center' });
            card.focus({ preventScroll: true });
        });
    }

    function injectStructuredData(upcoming) {
        var old = document.getElementById('events-jsonld');
        if (old) old.remove();
        if (!upcoming.length) return;
        var site = (window.SITE_DATA && SITE_DATA.domain) || '';
        var data = upcoming.map(function (ev) {
            return {
                '@context': 'https://schema.org',
                '@type': 'Event',
                name: ev.raw.title,
                description: ev.raw.description || '',
                startDate: ev.allDay ? ev.raw.date : ev.start.toISOString(),
                endDate: ev.allDay ? ev.lastDay : ev.end.toISOString(),
                eventStatus: 'https://schema.org/EventScheduled',
                eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
                location: { '@type': 'Place', name: ev.raw.location || '', address: { '@type': 'PostalAddress', addressLocality: 'Focșani', addressCountry: 'RO' } },
                organizer: { '@type': 'NGO', name: 'Tineret în Reacțiune', url: site + '/' },
                url: site + '/' + (ev.raw.post || 'calendar.html')
            };
        });
        var s = document.createElement('script');
        s.type = 'application/ld+json';
        s.id = 'events-jsonld';
        s.textContent = JSON.stringify(data.length === 1 ? data[0] : data);
        document.head.appendChild(s);
    }

    // ---------- Homepage countdown ----------
    var countdownTimer = null;

    function renderNextEvent() {
        var box = document.getElementById('nextEvent');
        if (!box) return;
        clearInterval(countdownTimer);
        var next = getEvents().upcoming[0];
        if (!next) { box.hidden = true; return; }

        box.replaceChildren();
        box.hidden = false;
        box.appendChild(el('p', 'next-event-label', t('Următorul eveniment', 'Next event')));
        var h = el('h3', null, next.title());
        h.id = 'nextEventTitle';
        box.appendChild(h);
        box.appendChild(el('p', 'next-event-when', whenText(next) + (next.location() ? ' · ' + next.location() : '')));

        var clock = el('div', 'countdown');
        clock.setAttribute('role', 'timer');
        clock.setAttribute('aria-live', 'off');
        var units = [
            { key: 'd', label: t('zile', 'days') },
            { key: 'h', label: t('ore', 'hours') },
            { key: 'm', label: t('min', 'min') }
        ];
        var nums = {};
        units.forEach(function (u) {
            var b = el('div', 'countdown-box');
            nums[u.key] = el('span', 'countdown-num', '0');
            b.appendChild(nums[u.key]);
            b.appendChild(el('span', 'countdown-unit', u.label));
            clock.appendChild(b);
        });
        var live = el('p', 'next-event-live', t('Acum, în desfășurare!', 'Happening now!'));
        live.hidden = true;
        box.appendChild(clock);
        box.appendChild(live);

        var link = el('a', 'btn btn-alt', t('Detalii în calendar', 'See the calendar'));
        link.href = 'calendar.html#ev-' + next.id;
        box.appendChild(link);

        function tick() {
            var now = Date.now();
            if (now >= next.end.getTime()) { renderNextEvent(); return; }
            var diff = next.start.getTime() - now;
            if (diff <= 0) { clock.hidden = true; live.hidden = false; return; }
            var mins = Math.floor(diff / 60000);
            nums.d.textContent = String(Math.floor(mins / 1440));
            nums.h.textContent = String(Math.floor((mins % 1440) / 60));
            nums.m.textContent = String(mins % 60);
        }
        tick();
        countdownTimer = setInterval(tick, 30000);
    }

    function renderAll() {
        renderCalendarPage();
        renderNextEvent();
    }

    document.addEventListener('DOMContentLoaded', function () {
        renderAll();
        if (window.TR_I18N) TR_I18N.onChange(renderAll);
    });

    window.TR_CALENDAR = { getEvents: getEvents, buildIcs: buildIcs, googleUrl: googleUrl, whenText: whenText };
})();
