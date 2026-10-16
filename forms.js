// forms.js - validation + submission for [data-form] forms (Web3Forms, with an email-app fallback).
(function () {
    var ENDPOINT = 'https://api.web3forms.com/submit';
    var MIN_FILL_MS = 3000;
    var loadedAt = Date.now();

    function t(ro, en) { return TR_I18N.t(ro, en); }

    function messageFor(input) {
        var v = input.validity;
        if (input.type === 'checkbox' && v.valueMissing) return t('Bifează căsuța pentru a continua.', 'Please tick the box to continue.');
        if (v.valueMissing) return t('Acest câmp este obligatoriu.', 'This field is required.');
        if (v.typeMismatch && input.type === 'email') return t('Introdu o adresă de email validă (ex: nume@exemplu.ro).', 'Enter a valid email address (e.g. name@example.com).');
        if (v.tooShort) return t('Scrie cel puțin ' + input.minLength + ' caractere.', 'Write at least ' + input.minLength + ' characters.');
        if (v.rangeUnderflow || v.rangeOverflow) return t('Introdu un număr între ' + input.min + ' și ' + input.max + '.', 'Enter a number between ' + input.min + ' and ' + input.max + '.');
        if (v.badInput) return t('Introdu un număr.', 'Enter a number.');
        if (v.customError) return input.validationMessage;
        return t('Verifică acest câmp.', 'Please check this field.');
    }

    function validatePhone(input) {
        if (input.dataset.validate !== 'phone') return;
        var digits = input.value.replace(/[\s.\-()]/g, '');
        var ok = !digits || /^(\+?40|0040|0)7\d{8}$/.test(digits) || /^\+\d{8,15}$/.test(digits);
        input.setCustomValidity(ok ? '' : t('Introdu un număr de telefon valid (ex: 0744 123 456).', 'Enter a valid phone number (e.g. +40 744 123 456).'));
    }

    function showError(input) {
        validatePhone(input);
        var err = document.getElementById(input.id + '-err');
        var valid = input.checkValidity();
        input.setAttribute('aria-invalid', valid ? 'false' : 'true');
        if (err) err.textContent = valid ? '' : messageFor(input);
        return valid;
    }

    function fields(form) {
        return Array.prototype.filter.call(form.elements, function (el) {
            return el.name && el.name !== 'botcheck' && el.type !== 'submit';
        });
    }

    function payload(form) {
        var data = {};
        fields(form).forEach(function (el) {
            if (el.type === 'checkbox') { if (el.checked) data[el.name] = el.value; return; }
            if (el.value.trim()) data[el.name] = el.value.trim();
        });
        return data;
    }

    function setStatus(form, html, isError) {
        var status = form.querySelector('.form-status');
        status.replaceChildren();
        html.forEach(function (part) { status.appendChild(part); });
        status.classList.toggle('is-error', !!isError);
        status.hidden = false;
    }

    function text(s) { return document.createTextNode(s); }

    function mailLink() {
        var a = document.createElement('a');
        a.href = 'mailto:' + SITE_DATA.contactEmail;
        a.textContent = SITE_DATA.contactEmail;
        return a;
    }

    function openMailApp(form, data) {
        var lines = Object.keys(data).map(function (k) { return k + ': ' + data[k]; });
        var url = 'mailto:' + SITE_DATA.contactEmail +
            '?subject=' + encodeURIComponent(form.dataset.subject || 'Mesaj de pe site') +
            '&body=' + encodeURIComponent(lines.join('\n'));
        window.location.href = url;
        setStatus(form, [
            text(t('Am deschis aplicația ta de email cu mesajul completat — apasă „Trimite” acolo. Dacă nu s-a deschis, scrie-ne la ',
                   'We opened your email app with the message filled in — just press "Send" there. If nothing opened, write to us at ')),
            mailLink(), text('.')
        ]);
    }

    function showSuccess(form) {
        var box = document.createElement('div');
        box.className = 'form-success';
        box.setAttribute('role', 'status');

        var img = document.createElement('img');
        img.src = 'spark.webp';
        img.alt = '';
        img.width = 320;
        img.height = 320;

        var h = document.createElement('h2');
        h.tabIndex = -1;
        h.textContent = t('POW! Gata, am primit!', 'POW! Got it!');

        var p = document.createElement('p');
        p.className = 'inner-text';
        p.textContent = form.dataset.form === 'join'
            ? t('Mulțumim pentru înscriere! Te contactăm în curând pe email sau telefon.', 'Thanks for signing up! We\'ll get back to you soon by email or phone.')
            : t('Mulțumim pentru mesaj! Îți răspundem cât de repede putem.', 'Thanks for your message! We\'ll reply as soon as we can.');

        var home = document.createElement('a');
        home.href = 'index.html';
        home.className = 'btn';
        home.textContent = t('Înapoi acasă', 'Back home');

        box.append(img, h, p, home);
        form.replaceWith(box);
        h.focus();
        if (window.TR_SPARK && TR_SPARK.celebrate) TR_SPARK.celebrate(box);
    }

    function submit(form, data, button) {
        var original = button.textContent;
        button.disabled = true;
        button.textContent = t('Se trimite…', 'Sending…');

        data.access_key = SITE_DATA.web3formsKey;
        data.subject = form.dataset.subject || 'Mesaj de pe site';
        data.from_name = 'Site Tineret în Reacțiune';
        if (data.Email) data.replyto = data.Email;

        fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify(data)
        }).then(function (res) {
            return res.json().then(function (json) {
                if (!res.ok || !json.success) throw new Error(json.message || 'Send failed');
            });
        }).then(function () {
            showSuccess(form);
        }).catch(function () {
            button.disabled = false;
            button.textContent = original;
            setStatus(form, [
                text(t('Ups, mesajul nu a putut fi trimis. Încearcă din nou sau scrie-ne direct la ',
                       'Oops, the message could not be sent. Please try again or write to us at ')),
                mailLink(), text('.')
            ], true);
        });
    }

    function wire(form) {
        fields(form).forEach(function (input) {
            input.addEventListener('blur', function () { if (input.value || input.getAttribute('aria-invalid') === 'true') showError(input); });
            input.addEventListener('input', function () { if (input.getAttribute('aria-invalid') === 'true') showError(input); });
            input.addEventListener('change', function () { if (input.type === 'checkbox' || input.tagName === 'SELECT') showError(input); });
        });

        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var invalid = fields(form).filter(function (input) { return !showError(input); });
            if (invalid.length) {
                invalid[0].focus();
                return;
            }

            var bot = form.querySelector('[name="botcheck"]');
            if ((bot && bot.checked) || Date.now() - loadedAt < MIN_FILL_MS) {
                showSuccess(form);
                return;
            }

            var data = payload(form);
            var button = form.querySelector('[type="submit"]');
            if (SITE_DATA.web3formsKey) submit(form, data, button);
            else openMailApp(form, data);
        });

        TR_I18N.onChange(function () {
            fields(form).forEach(function (input) {
                if (input.getAttribute('aria-invalid') === 'true') showError(input);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('form[data-form]').forEach(wire);
    });
})();
