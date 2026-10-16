// =====================================================================
//  DATELE SITE-ULUI — singurul fișier pe care trebuie să-l editezi
//  pentru evenimente, cifre de impact și formulare.
// =====================================================================
window.SITE_DATA = {
    domain: 'https://tineretinreactiune.ro',
    contactEmail: 'salut@tineretinreactiune.ro',

    // Formularul de înscriere (Google Forms). Toate butoanele „Înscrie-te!” duc aici.
    signupUrl: 'https://forms.gle/Et9LzJrL6iJFySSk9',

    // Cheia primită pe email de la https://web3forms.com (introdu adresa salut@...).
    // Cât timp e goală, formularul de contact deschide aplicația de email a vizitatorului.
    web3formsKey: '',

    // Cifrele de impact de pe prima pagină. Lasă null ca să ascunzi o cifră.
    // Exemplu: tineri: 120
    impact: {
        tineri: null,
        evenimente: null,
        ore: null
    },

    // EVENIMENTE — adaugă câte un bloc { ... } pentru fiecare eveniment.
    //   date:    'AAAA-LL-ZZ'   (ex. '2026-10-15')
    //   endDate: 'AAAA-LL-ZZ'   opțional, pentru evenimente de mai multe zile
    //   start:   'HH:MM'        ora de început (ora României); fără oră = toată ziua
    //   end:     'HH:MM'        opțional; dacă lipsește, se presupun 2 ore
    //   post:    'noutati/....html'  opțional, articolul de pe pagina Noutăți
    //   *_en:    opțional, textul în engleză (altfel se afișează româna)
    // Evenimentele trecute se mută automat la „Evenimente trecute”.
    events: [
        {
            date: '2026-09-19',
            start: '10:30',
            title: 'Cafeneaua Culturală',
            title_en: 'The Cultural Café',
            description: 'Un spațiu relaxat de întâlnire între tineri, comunitate și partenerii sociali. Vino să discutăm despre viitorul orașului tău!',
            description_en: 'A relaxed meeting space for young people, the community and social partners. Come and talk with us about the future of your town!',
            location: 'Centrul Multifuncțional Focșani'
        },
        {
            date: '2026-10-13',
            title: 'Caravana „Povestea ta / Vocea ta” la Vidra',
            title_en: '“Your Story / Your Voice” Caravan in Vidra',
            description: 'Am povestit și am dezbătut idei alături de elevii Liceului „Simion Mehedinți”, în Săptămâna Erasmus.',
            description_en: 'We shared stories and debated ideas with the students of the “Simion Mehedinți” High School, during Erasmus Week.',
            location: 'Liceul „Simion Mehedinți”, Vidra',
            post: 'noutati/caravana-povestea-ta-vocea-ta.html'
        },
        {
            date: '2026-10-14',
            endDate: '2026-10-15',
            title: 'Caravana „Povestea ta / Vocea ta” la Focșani',
            title_en: '“Your Story / Your Voice” Caravan in Focșani',
            description: 'Două zile în mijlocul elevilor de la Colegiul „Gheorghe Asachi”, în Săptămâna Erasmus.',
            description_en: 'Two days with the students of the “Gheorghe Asachi” College, during Erasmus Week.',
            location: 'Colegiul „Gheorghe Asachi”, Focșani',
            post: 'noutati/caravana-povestea-ta-vocea-ta.html'
        },
        {
            date: '2026-10-16',
            start: '11:30',
            title: 'Caravana „Povestea ta / Vocea ta” la Odobești',
            title_en: '“Your Story / Your Voice” Caravan in Odobești',
            description: 'Îi așteptăm pe elevi să se alăture echipei noastre și să „voteze” pentru voluntariat și comunitate.',
            description_en: 'We invite students to join our team and “vote” for volunteering and their community.',
            location: 'Liceul „Duiliu Zamfirescu”, Odobești',
            post: 'noutati/caravana-povestea-ta-vocea-ta.html'
        }
    ],

    // Sfaturile lui Spark (apar când apeși pe el, pe prima pagină).
    // href: 'signup' trimite la formularul de înscriere.
    sparkTips: [
        { ro: 'Salut! Sunt Spark. Apasă pe mine oricând pentru un sfat!', en: 'Hi! I\'m Spark. Tap me anytime for a tip!' },
        { ro: 'Ai între 13 și 21 de ani? Fă echipă cu noi! Apasă pe „GO!”', en: 'Aged 13 to 21? Team up with us! Hit “GO!”', href: 'signup' },
        { ro: 'Vezi ce urmează în Calendar, ca să nu ratezi următoarea întâlnire!', en: 'Check the Calendar so you don\'t miss the next meetup!', href: 'calendar.html' },
        { ro: 'Citește noutățile: Caravana noastră a trecut prin liceele din Vrancea!', en: 'Read the news: our Caravan toured the high schools of Vrancea!', href: 'noutati.html' },
        { ro: 'Cauți ceva anume? Apasă pe lupă sau tasta „/” ca să cauți pe site.', en: 'Looking for something? Hit the magnifier or the “/” key to search the site.' },
        { ro: 'Ai o idee pentru orașul tău? Scrie-ne pe pagina de Contact!', en: 'Got an idea for your town? Tell us on the Contact page!', href: 'contact.html' },
        { ro: 'Urmărește-ne pe Instagram: @tineretinreactiune', en: 'Follow us on Instagram: @tineretinreactiune', href: 'https://instagram.com/tineretinreactiune' },
        { ro: 'Poți instala site-ul ca aplicație pe telefon!', en: 'You can install this site as an app on your phone!' },
        { ro: 'Vocea ta contează. Implică-te!', en: 'Your voice matters. Get involved!' }
    ]
};
