// Loaded in <head>: hides the page for one frame when English is saved, so it never flashes Romanian first.
(function () {
    try {
        if (localStorage.getItem('tr-lang') === 'en') {
            document.documentElement.lang = 'en';
            document.documentElement.classList.add('i18n-pending');
        }
    } catch (e) { /* storage blocked: stay in Romanian */ }
})();
