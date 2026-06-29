/**
 * scripts/seedReviews.js
 *
 * 1. Deletes all reviews written by the 20 mock users (@gmail.com).
 * 2. Seeds 5 category-aware reviews per mock user, each targeting a
 *    different random product.
 *
 * Review texts are matched to the product's category (and subcategory
 * for PC components). Every comment is strictly under 20 words.
 *
 * Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/seedReviews.js
 */

const pool = require("../db");

// ─── Review dictionary ────────────────────────────────────────────────────────
// Keys mirror the `category` column in `products`; for `components` the key
// is the `subcategory` value (cpu, gpu, ram, …).
// 15 entries per key → good variety across 20 users × 5 reviews.

const REVIEWS = {
  // ── PC component subcategories ──────────────────────────────────────────
  cpu: {
    5: [
      "Temperaturi scăzute chiar și la full load. Performanță excelentă pentru prețul plătit.",
      "Cel mai rapid procesor pe care l-am avut. Gaming și multitasking fără probleme.",
      "Overclock stabil la 5 GHz, temperaturi decente. Răcire bună inclusă. Foarte mulțumit.",
      "Single-core excelent, jocurile rulează fluid. Upgrade vizibil față de generația anterioară.",
      "Consum redus, performanțe mari. Procesorul perfect pentru un PC silențios și rapid.",
    ],
    4: [
      "Procesor bun, se descurcă la orice task. Puțin cald sub sarcină maximă, altfel ok.",
      "Performanță solidă la editare video și gaming. Prețul e corect pentru ce oferă.",
      "Bun pentru workload-uri intense. Temperaturile cresc puțin fără răcire aftermarket.",
      "Rapid și eficient. Software-ul de overclock ar putea fi mai intuitiv.",
      "Performanțe constante, fără throttling. Bun pentru uz zilnic și gaming moderat.",
    ],
    3: [
      "Decent pentru uz de birou, dar nu excelează la gaming. Face ce promite.",
      "Performanță medie față de concurență la același preț. Utilizabil, dar există alternative mai bune.",
      "Ok pentru task-uri ușoare. La sarcini grele temperatura crește vizibil.",
      "Se descurcă, dar nu m-a impresionat. Așteptam mai mult de la această generație.",
      "Funcțional, dar prețul e puțin ridicat față de ce oferă în benchmark-uri.",
    ],
  },

  gpu: {
    5: [
      "FPS stabil la 1440p Ultra. Niciun artefact, temperaturi mici. Placa perfectă!",
      "Ray tracing fluid, DLSS excelent. Jocurile arată superb. Cea mai bună achiziție.",
      "Silențioasă în joc, performanțe top. Upgrade spectaculos față de placa anterioară.",
      "4K gaming la maxim fără scăderi de FPS. Build solid, radiatoare eficiente.",
      "Raport performanță-preț imbatabil în segmentul mid-range. Complet mulțumit.",
    ],
    4: [
      "Bună pentru 1080p și 1440p. Puțin zgomotoasă sub load, dar performanțele compensează.",
      "FPS mare în titlurile noi. Driverele stabile, nicio problemă în două luni de utilizare.",
      "Placa funcționează bine, temperaturile sunt ok. Software-ul de RGB e puțin greoi.",
      "Performanțe bune la prețul acesta. Ideală pentru gaming competitiv la 144Hz.",
      "Construcție solidă, cooler eficient. Câteva jocuri vechi au probleme de driver minor.",
    ],
    3: [
      "Satisfăcătoare pentru 1080p medium. Nu recomand pentru 1440p sau mai mult.",
      "Funcționează, dar concurența oferă mai mult la același preț. Driverele au câteva bug-uri.",
      "Medie ca performanță. Ok pentru esports, slab pentru titluri AAA recente la setări maxime.",
      "Se descurcă la gaming casual. Ventilatoarele sunt zgomotoase peste 80% load.",
      "Decent pentru bugetul alocat, dar nu excelează în niciun test. Utilizabilă.",
    ],
  },

  ram: {
    5: [
      "XMP stabil la 6000 MHz din prima. Latențe mici, câștig vizibil în jocuri.",
      "Compatibilitate perfectă cu placa mea de bază. Viteze mari, stabilitate impecabilă.",
      "Design elegant, LED discret. Performanțe excelente, niciun crash după luni de utilizare.",
      "Dual channel fără probleme. Jocurile încarcă mai rapid, multitasking fluid. Super!",
      "Cel mai bun kit de RAM testat până acum. Stabil la overclocking, temperaturi mici.",
    ],
    4: [
      "RAM bun, XMP pornit din BIOS fără probleme. Viteze conform specificațiilor.",
      "Funcționează excelent pentru gaming și editare. Puțin scump față de alternative similare.",
      "Stabil și rapid. Compatibilitatea cu placa mea a fost imediată, fără ajustări.",
      "Bun raport calitate-preț. Timingurile sunt ok, nu excepționale, dar suficiente.",
      "Kit solid, instalare rapidă. LED-urile arată bine în carcasă cu geam lateral.",
    ],
    3: [
      "Funcțional, dar XMP a necesitat ajustări manuale în BIOS pentru stabilitate.",
      "Decent pentru prețul plătit. Nu e cel mai rapid din piață, dar face treaba.",
      "Ok pentru uz de birou. La gaming am observat câștiguri minime față de kitul anterior.",
      "Stabil, dar timingurile lasă de dorit față de competiție la același preț.",
      "Utilizabil, fără surprize. Nu am reușit să-l overclock dincolo de specificații.",
    ],
  },

  gpu_stocare: {}, // alias handled in code

  stocare: {
    5: [
      "Viteze de citire extraordinare, sistemul pornește în sub 10 secunde. Excelent!",
      "Cel mai rapid SSD pe care l-am folosit. Transfer de fișiere mari în secunde.",
      "Temperaturi mici chiar și la scriere continuă. Fiabil și rapid. Recomand.",
      "NVMe performant, diferența față de HDD e uriașă. Merită fiecare leu investit.",
      "Silențios, rapid, compact. Instalare simplă, detecție imediată în BIOS. Perfect.",
    ],
    4: [
      "Viteză bună de citire, scrierile sunt puțin mai lente decât așteptam.",
      "SSD decent, instalare rapidă. Temperaturile sunt ok fără heatsink propriu.",
      "Performanțe constante, fără scăderi de viteză după umplere. Solid pentru prețul dat.",
      "Bun pentru sistemul de operare și aplicații. Prețul pe GB e competitiv.",
      "Funcționează excelent. Puțin cald în carcasele fără airflow bun.",
    ],
    3: [
      "Decent, dar vitezele reale sunt sub cele din specificații la scriere susținută.",
      "Ok pentru uz casual. Nu recomand pentru workload-uri de scriere intensivă.",
      "Funcțional, dar am găsit alternative mai rapide la același preț.",
      "Satisfăcător pentru prețul plătit. Temperatura crește vizibil fără heatsink.",
      "Se descurcă ca drive secundar. Ca drive principal așteptam viteze mai mari.",
    ],
  },

  placa_baza: {
    5: [
      "VRM excelente, overclocking stabil la toate nucleele. Build premium, calitate vizibilă.",
      "BIOS intuitiv, compatibilitate perfectă cu CPU și RAM. Nu am ce reproșa.",
      "Conectivitate completă: WiFi 6E, 2.5G LAN, USB 4. Placa perfectă pentru build-ul meu.",
      "Stabilitate remarcabilă la overclock. Condensatori de calitate, temperaturi VRM mici.",
      "Cea mai bună placă de bază pe care am deținut-o. Setup rapid, funcționare impecabilă.",
    ],
    4: [
      "Bună compatibilitate cu componentele alese. BIOS-ul are câteva opțiuni ascunse greu de găsit.",
      "Solidă, overclocking decent. Software-ul de monitorizare ar putea fi mai intuitiv.",
      "Placă bună la prețul acesta. Porturile sunt bine poziționate, montajul e simplu.",
      "Funcționează excelent, VRM-urile rămân reci. Lipsa WiFi integrat e un minus.",
      "Stabilitate bună, boot rapid. Un slot M.2 suplimentar ar fi fost util.",
    ],
    3: [
      "Decentă pentru un build de buget. Nu recomand overclocking agresiv pe ea.",
      "BIOS-ul e greoi și puțin intuitiv. Altfel, funcțiile de bază lucrează corect.",
      "Ok pentru configurații entry-level. VRM-urile se încălzesc vizibil sub sarcină.",
      "Satisfăcătoare, dar concurența oferă mai mult la același preț.",
      "Funcțională, dar build quality-ul lasă puțin de dorit față de așteptări.",
    ],
  },

  sursa: {
    5: [
      "80+ Gold eficient, complet modular, cabluri de calitate. Sursa perfectă pentru orice build.",
      "Silențioasă în regim normal, ventilatorul pornește rar. Stabilitate excelentă pe toate liniile.",
      "Certificare Gold, protecții complete. Am overclockat fără niciun semn de instabilitate.",
      "Cabluri bine organizate, conector lung suficient pentru orice carcasă. Excelentă.",
      "Zero zgomot până la 50% load. Cea mai silențioasă sursă pe care am avut-o.",
    ],
    4: [
      "Sursă bună, stabilă sub sarcină. Cablurile sunt puțin rigide, greu de cable managed.",
      "Eficientă și silențioasă la load normal. La 80%+ ventilatorul devine audibil.",
      "Protecții complete, tensiuni stabile. Prețul e puțin ridicat față de concurență.",
      "Funcționează excelent, certificare bună. Setul de cabluri ar putea fi mai complet.",
      "Solidă și fiabilă. Condensatoarele sunt de calitate, nu mă tem pentru longevitate.",
    ],
    3: [
      "Decentă pentru un PC de birou. La un gaming PC cu consum mare aș lua ceva mai bun.",
      "Funcționează, dar ventilatorul e zgomotos chiar și la load redus.",
      "Ok pentru prețul plătit. Nu are modul semi-pasiv, ventilatorul merge mereu.",
      "Satisfăcătoare, tensiunile sunt stabile. Cablurile sunt scurte pentru carcasele mid-tower.",
      "Utilizabilă, dar certificarea de eficiență lasă de dorit față de alternativele moderne.",
    ],
  },

  carcasa: {
    5: [
      "Airflow excelent, temperaturi scăzute la toate componentele. Design elegant și modern.",
      "Spațioasă, gestionare cabluri ușoară. Mesh-ul față permite flux de aer fantastic.",
      "Build premium, panou lateral din sticlă securizată. Montajul a fost simplu și plăcut.",
      "Filtre de praf pe toate prizele, demontabile. Cea mai bine gândită carcasă testată.",
      "Compatibilă cu radiatoare mari, layout excelent. Componentele respiră în ea.",
    ],
    4: [
      "Carcasă bine construită, airflow decent. Gestionarea cablurilor e puțin strâmtă.",
      "Design frumos, geam lateral elegant. Lipsesc câteva bride pentru cabluri în spate.",
      "Spațioasă și ușor de asamblat. Ventilatoarele incluse sunt ok, dar zgomotoase.",
      "Finisaje bune, design modern. Temperatura componentelor e acceptabilă cu ventilatoare aftermarket.",
      "Solidă, fără vibrații la mers. Prețul e puțin ridicat față de funcționalitățile oferite.",
    ],
    3: [
      "Arată decent, dar airflow-ul lasă de dorit cu configurația de bază.",
      "Ok pentru un build entry-level. Cablurile sunt greu de ascuns fără modificări.",
      "Decentă, dar peretele din spate e prea îngust pentru cabluri mai groase.",
      "Funcțională, dar calitatea plasticului e medie. Panourile se fixează greu.",
      "Se descurcă ca protecție pentru componente. Ca airflow, lasă de dorit.",
    ],
  },

  // ── Top-level categories ─────────────────────────────────────────────────
  laptop: {
    5: [
      "Autonomie de 12 ore, ecran IPS superb. Cel mai bun laptop pe care l-am deținut.",
      "Performanță excelentă pentru greutatea lui. Tastatură plăcută, trackpad precis.",
      "Ecran cu refresh 144Hz, culori accurate. Gaming portabil fără compromisuri majore.",
      "Răcire eficientă, nu throttlează sub sarcină. Premium la toate capitolele.",
      "Build din aluminiu solid, afișaj mat fără reflexii. Perfect pentru muncă și călătorii.",
    ],
    4: [
      "Laptop bun, performanțe solide. Autonomia ar putea fi mai mare la sarcini grele.",
      "Display frumos, procesor rapid. Ventilatoarele devin audibile la load maxim.",
      "Raport calitate-preț bun. Lipsesc câteva porturi, necesit un hub USB-C.",
      "Bun pentru gaming la setări medii. Temperatura suprafeței crește vizibil după o oră.",
      "Performanțe bune, construcție solidă. Software-ul bloatware ar trebui eliminat din fabrică.",
    ],
    3: [
      "Decent pentru birou și browsing. La gaming sau editare video, resimți limitele.",
      "Ok pentru prețul plătit. Ecranul are unghiuri de vizualizare slabe față de IPS.",
      "Autonomie medie, vreo 6-7 ore real. Așteptam mai mult la această clasă de preț.",
      "Funcțional pentru task-uri ușoare. Tastatura are un feedback mediocru.",
      "Satisfăcător, dar concurența oferă display mai bun la același buget.",
    ],
  },

  desktop: {
    5: [
      "Performanțe uimitoare, gata de utilizare din cutie. Raport calitate-preț excelent.",
      "Silențios chiar și la sarcini grele. Design compact și elegant pentru birou.",
      "Totul funcționează perfect, zero probleme după trei luni de utilizare intensă.",
      "Mult mai rapid decât laptopul precedent. Upgrade spectaculos pentru prețul plătit.",
      "PC complet configurat, pornit în câteva minute. Excelent pentru gaming și lucru.",
    ],
    4: [
      "Bun pentru uz general și gaming moderat. RAM-ul ar putea fi mai mare implicit.",
      "Performanțe solide, livrare rapidă. Ar fi apreciat mai mult spațiu de stocare.",
      "PC decent, funcționează silențios. Upgrade-urile sunt ușor de realizat ulterior.",
      "Raport bun calitate-preț. SSD-ul e rapid, HDD-ul secundar e o alegere înțeleaptă.",
      "Funcționează excelent în rețeaua de acasă. Design discret care se potrivește biroului.",
    ],
    3: [
      "Satisfăcător pentru uz de birou. Nu recomand pentru gaming la setări ridicate.",
      "Decent, dar RAM-ul de bază e insuficient pentru multitasking intens.",
      "Ok pentru browsing și documente. Grafica integrată nu face față la jocuri moderne.",
      "Funcțional, dar prețul e puțin ridicat față de configurația oferită.",
      "Se descurcă la sarcinile zilnice. Am adăugat RAM suplimentar pentru confort.",
    ],
  },

  phone: {
    5: [
      "Ecran AMOLED superb, baterie de două zile. Cel mai bun telefon pe care l-am avut.",
      "Cameră foto excepțională chiar și noaptea. Design premium, sticlă pe ambele fețe.",
      "Rapid, fluid, fără lag indiferent de aplicații. Actualizări regulate, securitate top.",
      "Baterie uriașă, încărcare rapidă. Autonomie uimitoare față de telefoanele anterioare.",
      "Afișaj cu 120Hz fluid, procesator rapid. Experiența de utilizare e pur și simplu excelentă.",
    ],
    4: [
      "Telefon bun, cameră foto bună ziua. Noaptea mai poate fi îmbunătățit prin software.",
      "Performanțe solide, autonomie bună. Designul e puțin alunecos fără husă.",
      "Ecran frumos, sunet bun. Memoria de bază e insuficientă pentru cine face multe poze.",
      "Rapid și responsiv. Ar fi apreciat o mufă jack audio, lipsește la această variantă.",
      "Bun raport calitate-preț. Software-ul are câteva aplicații preinstalate inutile.",
    ],
    3: [
      "Decent pentru prețul plătit. Camera frontală lasă de dorit față de competiție.",
      "Autonomie medie, cam 6 ore ecran pornit. Așteptam mai mult de la bateria de 4500 mAh.",
      "Ok pentru apeluri și social media. Gaming mai solicitant îl face să se încălzească.",
      "Funcțional, dar ecranul LCD e net inferior față de AMOLED la același preț.",
      "Satisfăcător ca telefon de buget. Actualizările software sunt rare.",
    ],
  },

  tablet: {
    5: [
      "Ecran mare și precis la touch, ideal pentru desenat și citit. Baterie excelentă.",
      "Performanțe de laptop în format compact. Aplicațiile se deschid instantaneu.",
      "Afișaj 2K cu luminozitate mare, vizibil în soare. Excelentă pentru conținut media.",
      "Creion inclus precis și natural. Cea mai bună tabletă pentru studenți și artiști.",
      "Construcție premium, boxe stereo puternice. O investiție care merită din plin.",
    ],
    4: [
      "Tabletă bună pentru divertisment și lucru. Bateria scade repede la luminozitate maximă.",
      "Ecran frumos, procesor rapid. Îmi doresc mai mult stocare la varianta de bază.",
      "Solidă, build de calitate. Software-ul are câteva aplicații care nu pot fi dezinstalate.",
      "Bună pentru citit, film și browsing. Gaming intensiv o face să se încălzească.",
      "Display excelent, boxe bune. Prețul accesorizelor originale e ridicat.",
    ],
    3: [
      "Decentă pentru conținut media. Performanțele la multitasking lasă de dorit.",
      "Ok pentru citit și browsing. Nu recomand pentru editare foto sau video.",
      "Satisfăcătoare, dar concurența oferă mai mult stocare la același preț.",
      "Funcțională zilnic. Autonomia e medie, vreo 8 ore la utilizare moderată.",
      "Se descurcă pentru uz casual. Afișajul are reflexii supărătoare la lumină puternică.",
    ],
  },
};

// Fallback for unknown category/subcategory
const FALLBACK_REVIEWS = {
  5: [
    "Produs excelent, calitate premium. Depășește așteptările la toate capitolele.",
    "Cel mai bun raport calitate-preț din categorie. Recomand fără rezerve.",
    "Funcționează impecabil, livrare rapidă. Exact ce căutam pentru setup-ul meu.",
  ],
  4: [
    "Produs bun, funcționează conform descrierii. Câteva mici îmbunătățiri ar fi utile.",
    "Mulțumit de achiziție. Construcție solidă, performanțe constante.",
    "Bun raport calitate-preț. Recomand pentru uz general.",
  ],
  3: [
    "Decent pentru prețul plătit. Nu excelează, dar face treaba.",
    "Satisfăcător, fără surprize. Există alternative mai bune la același buget.",
    "Funcțional, utilizabil zilnic. Nu m-a impresionat în mod deosebit.",
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function sampleN(arr, n) {
  return shuffle(arr).slice(0, n);
}

function pickReview(category, subcategory) {
  // For components, use the subcategory key; otherwise use category key
  const key =
    category === "components" && subcategory ? subcategory : category;

  const pool = REVIEWS[key] ?? FALLBACK_REVIEWS;

  // Weighted rating: 50% → 5★, 30% → 4★, 20% → 3★
  const roll   = Math.random();
  const rating = roll < 0.5 ? 5 : roll < 0.8 ? 4 : 3;
  const bucket = pool[rating] ?? FALLBACK_REVIEWS[rating];
  const comment = bucket[Math.floor(Math.random() * bucket.length)];
  return { rating, comment };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  let client;
  try {
    client = await pool.connect();

    // ── 1. Load mock users ─────────────────────────────────────────────────
    console.log("\n[seedReviews] Loading mock users…");
    const { rows: users } = await client.query(
      `SELECT id, name FROM users
       WHERE email LIKE '%@gmail.com'
       ORDER BY created_at DESC
       LIMIT 20`
    );

    if (users.length === 0) {
      console.error("[seedReviews] No mock users found. Run seedUsers.js first.");
      process.exit(1);
    }
    console.log(`[seedReviews]   Found ${users.length} mock user(s).`);

    // ── 2. Delete previous mock reviews ───────────────────────────────────
    console.log("[seedReviews] Deleting previous mock reviews…");
    const userIds = users.map((u) => u.id);
    const del = await client.query(
      `DELETE FROM reviews WHERE user_id = ANY($1::uuid[]) RETURNING id`,
      [userIds]
    );
    console.log(`[seedReviews]   Deleted ${del.rowCount} review(s).`);

    // ── 3. Load products with category + subcategory ───────────────────────
    console.log("[seedReviews] Loading products…");
    const { rows: products } = await client.query(
      `SELECT id, name, category, subcategory FROM products ORDER BY name`
    );

    if (products.length < 5) {
      console.error("[seedReviews] Need at least 5 products in the database.");
      process.exit(1);
    }
    console.log(`[seedReviews]   Found ${products.length} product(s).`);

    // ── 4. Insert 5 category-aware reviews per mock user ──────────────────
    console.log(`\n[seedReviews] Inserting reviews…\n`);

    let totalInserted = 0;
    let totalSkipped  = 0;

    for (const user of users) {
      const pickedProducts = sampleN(products, 5);
      let userInserted = 0;

      for (const product of pickedProducts) {
        const { rating, comment } = pickReview(product.category, product.subcategory);

        const result = await client.query(
          `INSERT INTO reviews (user_id, product_id, rating, comment)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, product_id) DO NOTHING
           RETURNING id`,
          [user.id, product.id, rating, comment]
        );

        if (result.rows.length > 0) {
          userInserted++;
          totalInserted++;
        } else {
          totalSkipped++;
        }
      }

      const detail = pickedProducts
        .map((p) => `${(p.subcategory ?? p.category).padEnd(12)}`)
        .join("  ");

      console.log(
        `  ✓  ${user.name.padEnd(30)} → ${userInserted}/5  [${detail}]` +
          (userInserted < 5 ? `  (${5 - userInserted} skipped)` : "")
      );
    }

    console.log(
      `\n[seedReviews] ✅  Done. ${totalInserted} inserted, ${totalSkipped} skipped.\n`
    );
  } catch (err) {
    console.error("\n[seedReviews] ❌  Error:", err.message);
    process.exit(1);
  } finally {
    if (client) client.release();
    await pool.end();
  }
}

main();
