// i18n.js - Romanian lives in the HTML; this file holds the English translations and swaps them in.
//   <p data-i18n="key">text RO</p>                 -> textContent
//   <input data-i18n-attr="placeholder:key; aria-label:key2">  -> attributes
//   <span data-en="Caravan">Caravana</span>         -> inline English (generated pages)
(function () {
    var STORAGE_KEY = 'tr-lang';

    var EN = {
        "a11y.newTab": "(opens in a new tab)",
        "a11y.skip": "Skip to content",
        "a11y.backToTop": "Back to top",
        "nav.home": "Home",
        "nav.about": "About",
        "nav.calendar": "Calendar",
        "nav.donate": "Donate",
        "nav.contact": "Contact",
        "nav.join": "Sign up!",
        "nav.news": "News",
        "search.open": "Search the site",
        "nav.label": "Main menu",
        "meta.title.index": "Tineret în Reacțiune - Giving Young People a Voice!",
        "meta.title.despre": "About the Project - Tineret în Reacțiune",
        "meta.title.calendar": "Events Calendar - Tineret în Reacțiune",
        "meta.title.donatii": "Support Our Action! - Tineret în Reacțiune",
        "meta.title.contact": "Contact - Tineret în Reacțiune",
        "meta.title.inscriere": "Join the Team - Tineret în Reacțiune",
        "meta.title.noutati": "News - Tineret în Reacțiune",
        "meta.title.confidentialitate": "Privacy Policy - Tineret în Reacțiune",
        "meta.title.offline": "Offline - Tineret în Reacțiune",
        "meta.title.404": "Page Not Found - Tineret în Reacțiune",
        "meta.desc.index": "Tineret în Reacțiune is a civic engagement club for young people in Vrancea, funded by Erasmus+. Join the team and make your voice heard!",
        "meta.desc.despre": "The Tineret în (re)acțiune team is a civic engagement club dedicated to open dialogue and ideas for the community, funded by the EU through Erasmus+.",
        "meta.desc.calendar": "See the activities and events organised by Tineret în Reacțiune, the civic engagement club for young people in Vrancea.",
        "meta.desc.donatii": "Support the civic engagement of young people in Vrancea. Your donation helps run workshops and give young people the resources they need.",
        "meta.desc.contact": "Contact the Tineret în Reacțiune team: email, phone and contact form. Got an idea or want to join? Write to us!",
        "meta.desc.inscriere": "Aged 13 to 21? Join Tineret în Reacțiune, the Erasmus+ civic engagement club for young people in Vrancea: mentoring, your own community project and skills for the future.",
        "meta.desc.noutati": "News from the Tineret în Reacțiune project: stories from our events, high school caravans, announcements and sign-ups for young people in Vrancea.",
        "meta.desc.confidentialitate": "How we collect, use and protect the data you send through the Tineret în Reacțiune website forms.",
        "meta.desc.offline": "No internet connection.",
        "meta.desc.404": "The page you're looking for doesn't exist. Head back to Tineret în Reacțiune.",
        "hero.cta": "GO! Sign up!",
        "hero.logoAlt": "Tineret în Reacțiune logo",
        "hero.sparkLabel": "Spark, our mascot: tap for a tip",
        "intro.kicker": "Civic engagement club · Erasmus+",
        "intro.title": "Giving young people a voice!",
        "intro.quote": "“Volunteering is not just an activity — it is the voice of those who refuse to be mere spectators while their future is being built.”",
        "intro.text": "“Tineret în (re)acțiune” is a civic engagement club for young people in Vrancea: a space for open dialogue, ideas and real action for the community.",
        "intro.more": "Find out more",
        "intro.calendar": "See the calendar",
        "impact.title": "Our impact",
        "impact.tineri": "young people involved",
        "impact.evenimente": "events organised",
        "impact.ore": "volunteering hours",
        "about.title": "ABOUT THE PROJECT",
        "about.goalsTitle": "Our aims and goals",
        "about.p1": "The “Tineret în (re)acțiune” team – a civic engagement club – is a project dedicated to open dialogue and ideas for the community, run together with people who care about the issues young people face.",
        "about.p2": "The event is designed as a relaxed meeting space for young people, the community and social partners. Our goal is to discuss the impact youth initiatives have on local development.",
        "about.p3": "The programme is proudly funded by the EU through the Erasmus+ programme.",
        "about.cta": "Want to get involved? Sign up!",
        "facts.title": "The project at a glance",
        "facts.ages": "years old: who we're looking for",
        "facts.months": "months of activities",
        "facts.youth": "young participants",
        "facts.action": "Youth Participation",
        "cal.title": "EVENTS CALENDAR",
        "cal.intro": "Join us! Below you'll find the project's activities.",
        "cal.upcoming": "Coming up",
        "cal.past": "Past events",
        "cal.noscript": "Turn on JavaScript to see the calendar, or write to us at salut@tineretinreactiune.ro.",
        "donate.title": "SUPPORT OUR ACTION!",
        "donate.intro": "Our initiatives take flight with your help. Every donation helps us run workshops and give young people the resources they need.",
        "donate.heroTitle": "Be a hero for young people!",
        "donate.heroText": "Your donation supports the civic engagement of young people in Vrancea.",
        "donate.cta": "Donate now!",
        "donate.bankTitle": "Bank transfer details",
        "donate.beneficiary": "Beneficiary",
        "donate.taxId": "Tax ID (CIF)",
        "donate.iban": "IBAN",
        "donate.bank": "Bank",
        "donate.bankValue": "UniCredit Bank, Focșani branch",
        "donate.reference": "Payment reference",
        "donate.copy": "Copy",
        "contact.title": "TALK TO US!",
        "contact.intro": "Got an idea, a question, or want to join the team? Don't hesitate to send us a message or give us a call.",
        "contact.team": "Project team",
        "contact.emailLabel": "Email:",
        "contact.phoneLabel": "Phone:",
        "contact.welcome": "We look forward to hearing from you!",
        "contact.coordinator": "Project coordinator",
        "contact.formTitle": "Message us right here",
        "contact.footnote": "A project of the association, implemented with financial support from the EU.",
        "form.name": "Your name",
        "form.email": "Email",
        "form.subject": "What would you like to talk about?",
        "form.subject.general": "General question",
        "form.subject.join": "I want to get involved",
        "form.subject.partner": "Partnership",
        "form.subject.donate": "Donations",
        "form.subject.other": "Something else",
        "form.message": "Your message",
        "form.consent": "I agree to my data being processed in line with the",
        "form.consentLink": "Privacy Policy",
        "form.sendMessage": "Send message!",
        "join.title": "JOIN THE TEAM!",
        "join.intro": "Aged 13 to 21, full of energy and ideas for your community? Your place is in “Tineret în (re)acțiune”!",
        "join.whoTitle": "Who is it for?",
        "join.whoText": "We're especially looking for freshmen and students who have just started high school and want to team up with others their age for real change.",
        "join.gainTitle": "What do you get if you join?",
        "join.gain1": "Step-by-step guidance: our team will be with you every step of the way.",
        "join.gain2": "Your project, your idea: you'll get to design and carry out your own community project — at your school, your boarding school or your home village.",
        "join.gain3": "Skills for the future: you'll learn to speak in public, work in a team and make yourself heard.",
        "join.gain4": "Mentoring from our senior volunteers, who answer your questions and share their experience.",
        "join.howTitle": "How do you sign up?",
        "join.howText": "Fill in the sign-up form and our team will get in touch with all the details.",
        "join.cta": "GO! Fill in the form",
        "join.formNote": "The form opens in Google Forms, in a new tab.",
        "join.team": "Team name",
        "join.size": "Number of members",
        "join.contact": "Contact person",
        "join.city": "Town / city",
        "join.phone": "Phone",
        "join.phoneHint": "E.g. +40 744 123 456",
        "join.school": "School / organisation",
        "join.ages": "Members' ages",
        "join.ages.pick": "Choose…",
        "join.ages.u14": "under 14",
        "join.ages.14": "14–17",
        "join.ages.18": "18–24",
        "join.ages.25": "25–30",
        "join.ages.mixed": "Mixed",
        "join.why": "Why do you want to join? What ideas do you have?",
        "join.minors": "If you're under 16, please fill in the form together with a parent or guardian.",
        "join.submit": "GO! Send sign-up",
        "footer.contact": "Contact",
        "footer.follow": "Follow us",
        "footer.funding": "Project funded by the European Union through the Erasmus+ programme.",
        "footer.byAssoc": "a project of the “Eu, tu și ei” association.",
        "footer.privacy": "Privacy Policy",
        "footer.install": "📲 Install on your phone",
        "footer.howToJoin": "How to join the team",
        "footer.rss": "News RSS feed",
        "news.title": "NEWS",
        "news.intro": "What's happening in the project: stories from our events, announcements and invitations.",
        "news.introCal": "See what's coming up in the calendar →",
        "news.all": "All",
        "news.filter": "Filter by tag",
        "news.tags": "Tags",
        "news.readMore": "Read the article",
        "news.latest": "Latest news",
        "news.seeAll": "All the news",
        "news.empty": "The first articles are coming soon!",
        "post.minRead": "min read",
        "post.by": "The Tineret în Reacțiune team",
        "post.breadcrumb": "You are here",
        "post.events": "In the calendar",
        "post.seeEvent": "See in the calendar",
        "post.ctaTitle": "Want to be part of the team?",
        "post.ctaText": "If you're 13 to 21 and want to change something in your community, we're waiting for you!",
        "post.ctaBtn": "GO! Sign up!",
        "post.share": "Pass it on!",
        "post.shareNative": "Share",
        "post.copyLink": "Copy link",
        "post.more": "More articles",
        "post.older": "← Previous article",
        "post.newer": "Next article →",
        "post.related": "Read more",
        "offline.title": "YOU'RE OFFLINE!",
        "offline.text": "Spark can't find a signal. Pages you've already visited still work; everything else will be back as soon as you're online.",
        "offline.cta": "Try again",
        "notfound.title": "Oops! We couldn't find that page.",
        "notfound.text": "Looks like the rocket took a wrong turn.",
        "notfound.cta": "Back home",
        "privacy.title": "PRIVACY POLICY",
        "privacy.updated": "Last updated: 16 October 2026",
        "privacy.who.title": "Who we are",
        "privacy.who.p1": "The tineretinreactiune.ro website belongs to the “Tineret în Reacțiune” project, run by the “Eu, tu și ei” Association (tax ID 11721533), which is the controller of your data.",
        "privacy.who.p2": "You can contact us anytime at salut@tineretinreactiune.ro or on +40 744 217 031.",
        "privacy.what.title": "What data we collect",
        "privacy.what.p1": "We only collect the data you send us through the forms on this website:",
        "privacy.what.li1": "the sign-up form (Google Forms): the answers you fill in there;",
        "privacy.what.li2": "the contact form: your name, email, subject and message.",
        "privacy.cookies.title": "Cookies and data stored in your browser",
        "privacy.cookies.p1": "We don't use tracking, advertising or analytics cookies. The site only stores, in your own browser, the language you chose and whether you've already seen Spark's greeting. This information is never sent to us, and you can delete it anytime in your browser settings.",
        "privacy.cookies.p2": "Fonts and images are hosted on our own server, so your visit is not passed on to third-party services such as Google Fonts.",
        "privacy.cookies.p3": "The site search runs entirely in your browser: what you search for is never sent to us. The Facebook and WhatsApp share buttons are plain links and load nothing from those services until you tap them.",
        "privacy.why.title": "Why we use it",
        "privacy.why.p1": "We use your data to reply to you, to organise the project's activities and to keep in touch with registered teams. We don't sell your data or use it for marketing.",
        "privacy.why.p2": "The legal basis is your consent (Art. 6(1)(a) of Regulation (EU) 2016/679 – GDPR), which you can withdraw at any time without affecting processing carried out before then.",
        "privacy.share.title": "Who we share it with",
        "privacy.share.p1": "Messages sent through the contact form are delivered to our email by the Web3Forms service, which acts as a technical intermediary. The sign-up form is hosted by Google (Google Forms) and the answers go to the team's Google account, under Google's privacy policy. We don't share your data with any other third parties unless required by law.",
        "privacy.keep.title": "How long we keep it",
        "privacy.keep.p1": "We keep your data only as long as needed to run the project and meet legal or reporting obligations, then we delete it.",
        "privacy.minors.title": "Minors",
        "privacy.minors.p1": "If you're under 16, please fill in the forms together with a parent or guardian.",
        "privacy.rights.title": "Your rights",
        "privacy.rights.p1": "You have the right to access, correct, erase, restrict and port your data, the right to object, and the right to withdraw your consent. To exercise any of them, write to us at salut@tineretinreactiune.ro.",
        "privacy.rights.p2": "If you're unhappy with how we process your data, you can file a complaint with Romania's National Supervisory Authority for Personal Data Processing (www.dataprotection.ro)."
    };

    var current = 'ro';
    try { if (localStorage.getItem(STORAGE_KEY) === 'en') current = 'en'; } catch (e) { /* stay RO */ }

    var originals = new WeakMap();
    var listeners = [];

    function store(el) {
        var o = originals.get(el);
        if (!o) { o = { attrs: {} }; originals.set(el, o); }
        return o;
    }

    function apply(root) {
        root = root || document;
        root.querySelectorAll('[data-i18n]').forEach(function (el) {
            var o = store(el);
            if (o.text === undefined) o.text = el.textContent;
            var en = EN[el.getAttribute('data-i18n')];
            el.textContent = current === 'en' && en !== undefined ? en : o.text;
        });
        root.querySelectorAll('[data-en]').forEach(function (el) {
            var o = store(el);
            if (o.text === undefined) o.text = el.textContent;
            el.textContent = current === 'en' ? el.getAttribute('data-en') : o.text;
        });
        root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
            var o = store(el);
            el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
                var i = pair.indexOf(':');
                if (i < 0) return;
                var attr = pair.slice(0, i).trim(), key = pair.slice(i + 1).trim();
                if (!(attr in o.attrs)) o.attrs[attr] = el.getAttribute(attr);
                var en = EN[key];
                el.setAttribute(attr, current === 'en' && en !== undefined ? en : o.attrs[attr]);
            });
        });
    }

    function set(lang) {
        if (lang !== 'ro' && lang !== 'en') return;
        current = lang;
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* not persisted */ }
        document.documentElement.lang = lang;
        apply(document);
        listeners.forEach(function (fn) { fn(lang); });
    }

    window.TR_I18N = {
        get lang() { return current; },
        set: set,
        apply: apply,
        t: function (ro, en) { return current === 'en' && en ? en : ro; },
        key: function (key, ro) { return current === 'en' && EN[key] !== undefined ? EN[key] : ro; },
        onChange: function (fn) { listeners.push(fn); }
    };

    document.addEventListener('DOMContentLoaded', function () {
        document.documentElement.lang = current;
        apply(document);
        // After every DOMContentLoaded handler (header/footer injection) has run, before the first paint.
        requestAnimationFrame(function () {
            document.documentElement.classList.remove('i18n-pending');
        });
    });
})();
