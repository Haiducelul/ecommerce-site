/**
 * Seed test products: desktop PCs + component subcategories.
 *
 * Run from project root:
 *   node scripts/seed-components.js
 */
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
  }
}

const pool = new Pool({
  host:     process.env.PGHOST     || "localhost",
  port:     Number(process.env.PGPORT) || 5432,
  database: process.env.PGDATABASE || "tech",
  user:     process.env.PGUSER     || "postgres",
  password: process.env.PGPASSWORD || "102030",
});

/** @type {Array<{
 *   name: string;
 *   description: string;
 *   price: number;
 *   category: "desktop" | "components";
 *   subcategory: string | null;
 *   specifications: string;
 * }>} */
const PRODUCTS = [
  // ── CPU (3) ────────────────────────────────────────────────────────────────
  {
    name: "Intel Core i7-14700K",
    description:
      "Procesor desktop Intel din generația Raptor Lake Refresh, ideal pentru gaming și productivitate. Oferă 20 nuclee hibride și frecvențe ridicate pentru sarcini complexe zilnice.",
    price: 2199,
    category: "components",
    subcategory: "cpu",
    specifications:
      "Socket: LGA1700\nNuclee: 20 (8P + 12E)\nFrecvență boost: 5.6 GHz\nTDP: 125 W\nCache L3: 33 MB",
  },
  {
    name: "AMD Ryzen 7 7800X3D",
    description:
      "Procesor AMD cu tehnologie 3D V-Cache, optimizat pentru gaming la rezoluții înalte. Consum redus și performanță excelentă în titluri moderne și aplicații creative ușoare.",
    price: 1899,
    category: "components",
    subcategory: "cpu",
    specifications:
      "Socket: AM5\nNuclee: 8\nFrecvență boost: 5.0 GHz\nTDP: 120 W\nCache L3: 96 MB (3D V-Cache)",
  },
  {
    name: "Intel Core i5-13400F",
    description:
      "Procesor mid-range fără grafică integrată, potrivit pentru sisteme de birou și gaming entry-level. Raport preț-performanță excelent pentru upgrade-uri accesibile.",
    price: 899,
    category: "components",
    subcategory: "cpu",
    specifications:
      "Socket: LGA1700\nNuclee: 10 (6P + 4E)\nFrecvență boost: 4.6 GHz\nTDP: 65 W\nCache L3: 20 MB",
  },

  // ── Placă de bază (3) ──────────────────────────────────────────────────────
  {
    name: "ASUS TUF Gaming B650-PLUS WiFi",
    description:
      "Placă de bază ATX pentru procesoare AMD AM5, cu VRM robust și Wi-Fi 6 integrat. Suportă PCIe 4.0, multiple sloturi M.2 și conectivitate modernă pentru sisteme gaming echilibrate.",
    price: 1099,
    category: "components",
    subcategory: "placa_baza",
    specifications:
      "Socket: AM5\nFormat: ATX\nChipset: B650\nRAM: DDR5, max 128 GB\nM.2: 3 sloturi PCIe 4.0",
  },
  {
    name: "MSI MAG B760 Tomahawk WiFi",
    description:
      "Placă de bază Intel B760 cu alimentare stabilă și design discret. Ideală pentru procesoare din generațiile 12–14, cu porturi USB 3.2 și rețea Gigabit pentru utilizare zilnică.",
    price: 949,
    category: "components",
    subcategory: "placa_baza",
    specifications:
      "Socket: LGA1700\nFormat: ATX\nChipset: B760\nRAM: DDR5, max 192 GB\nM.2: 2 sloturi PCIe 4.0",
  },
  {
    name: "Gigabyte B550M DS3H",
    description:
      "Placă de bază micro-ATX compactă pentru platforma AM4, potrivită pentru PC-uri mici și buget mediu. Oferă suport PCIe 4.0, porturi SATA și upgrade ușor de memorie DDR4.",
    price: 449,
    category: "components",
    subcategory: "placa_baza",
    specifications:
      "Socket: AM4\nFormat: micro-ATX\nChipset: B550\nRAM: DDR4, max 128 GB\nM.2: 1 slot PCIe 4.0",
  },

  // ── GPU (3) ────────────────────────────────────────────────────────────────
  {
    name: "NVIDIA GeForce RTX 4070 SUPER",
    description:
      "Placă video mid-high end bazată pe arhitectura Ada Lovelace, excelentă pentru gaming 1440p și ray tracing. Consum eficient și suport DLSS 3 pentru cadre fluide în titluri recente.",
    price: 3299,
    category: "components",
    subcategory: "gpu",
    specifications:
      "VRAM: 12 GB GDDR6X\nInterfață: PCIe 4.0 x16\nCUDA Cores: 7168\nBoost Clock: ~2475 MHz\nTDP: 220 W",
  },
  {
    name: "AMD Radeon RX 7800 XT",
    description:
      "Placă video AMD cu 16 GB VRAM, potrivită pentru gaming QHD și streaming. Performanță solidă în OpenGL și DirectX 12, cu suport FSR 3 pentru optimizarea fps-ului.",
    price: 2799,
    category: "components",
    subcategory: "gpu",
    specifications:
      "VRAM: 16 GB GDDR6\nInterfață: PCIe 4.0 x16\nStream Processors: 3840\nBoost Clock: ~2430 MHz\nTDP: 263 W",
  },
  {
    name: "NVIDIA GeForce RTX 4060",
    description:
      "Placă video entry-level din seria RTX 40, ideală pentru gaming 1080p și eSports. Compactă, silențioasă și eficientă energetic, cu suport complet pentru DLSS și NVENC.",
    price: 1699,
    category: "components",
    subcategory: "gpu",
    specifications:
      "VRAM: 8 GB GDDR6\nInterfață: PCIe 4.0 x8\nCUDA Cores: 3072\nBoost Clock: ~2460 MHz\nTDP: 115 W",
  },

  // ── RAM (3) ────────────────────────────────────────────────────────────────
  {
    name: "Kingston FURY Beast DDR5 32GB (2x16GB)",
    description:
      "Kit memorie DDR5 dual-channel de 32 GB, optimizat pentru platforme Intel și AMD recente. Latențe reduse și profil heat-spreader pentru stabilitate în gaming și multitasking intens.",
    price: 549,
    category: "components",
    subcategory: "ram",
    specifications:
      "Capacitate: 32 GB (2x16 GB)\nTip: DDR5\nFrecvență: 6000 MHz\nCL: 36\nTensiune: 1.35 V",
  },
  {
    name: "Corsair Vengeance LPX DDR4 16GB (2x8GB)",
    description:
      "Kit RAM DDR4 de 16 GB cu profil low-profile, compatibil cu majoritatea plăcilor de bază AM4 și LGA1700. Soluție accesibilă pentru upgrade rapid și performanță stabilă zilnică.",
    price: 279,
    category: "components",
    subcategory: "ram",
    specifications:
      "Capacitate: 16 GB (2x8 GB)\nTip: DDR4\nFrecvență: 3200 MHz\nCL: 16\nTensiune: 1.35 V",
  },
  {
    name: "G.Skill Trident Z5 RGB DDR5 64GB (2x32GB)",
    description:
      "Kit premium de 64 GB DDR5 cu iluminare RGB, destinat stațiilor de lucru și gaming high-end. Frecvențe ridicate și timings optimizați pentru randare, editare video și streaming simultan.",
    price: 1199,
    category: "components",
    subcategory: "ram",
    specifications:
      "Capacitate: 64 GB (2x32 GB)\nTip: DDR5\nFrecvență: 6400 MHz\nCL: 32\nTensiune: 1.40 V",
  },

  // ── Sursă / PSU (3) ────────────────────────────────────────────────────────
  {
    name: "Corsair RM850e 850W 80+ Gold",
    description:
      "Sursă modulară de 850W certificată 80+ Gold, cu cabluri detașabile și ventilator silențios. Protecții multiple OVP/UVP/SCP și eficiență ridicată pentru sisteme gaming mid-high end.",
    price: 649,
    category: "components",
    subcategory: "sursa",
    specifications:
      "Putere: 850 W\nCertificare: 80+ Gold\nModulară: Da (semi)\nConectori PCIe: 3x 8-pin\nVentilator: 120 mm",
  },
  {
    name: "be quiet! System Power 10 600W",
    description:
      "Sursă fiabilă de 600W pentru configurații office și gaming entry-level. Funcționare silențioasă, eficiență 80+ și componente de calitate pentru alimentare stabilă pe termen lung.",
    price: 349,
    category: "components",
    subcategory: "sursa",
    specifications:
      "Putere: 600 W\nCertificare: 80+\nModulară: Nu\nConectori PCIe: 2x 8-pin\nVentilator: 120 mm",
  },
  {
    name: "Seasonic Focus GX-750 750W 80+ Gold",
    description:
      "Sursă fully modulară Seasonic de 750W, recunoscută pentru durabilitate și ripple redus. Potrivită pentru plăci video RTX 4070 și procesoare mid-range cu headroom pentru upgrade-uri viitoare.",
    price: 579,
    category: "components",
    subcategory: "sursa",
    specifications:
      "Putere: 750 W\nCertificare: 80+ Gold\nModulară: Da (full)\nConectori PCIe: 2x 8-pin\nVentilator: 120 mm FDB",
  },

  // ── Carcasă / Case (3) ─────────────────────────────────────────────────────
  {
    name: "Fractal Design Meshify 2 Compact",
    description:
      "Carcasă mid-tower cu front mesh pentru flux de aer excelent și filtre incluse. Suportă plăci video lungi, multiple SSD-uri și management cabluri simplu pentru build-uri curate.",
    price: 599,
    category: "components",
    subcategory: "carcasa",
    specifications:
      "Format: Mid-Tower\nSuport placa de bază: ATX/mATX/ITX\nVentilatoare incluse: 2x 140 mm\nRadiator max: 360 mm\nSloturi SSD: 4",
  },
  {
    name: "NZXT H5 Flow RGB",
    description:
      "Carcasă compactă cu panou lateral din sticlă și iluminare RGB preinstalată. Airflow optimizat pentru gaming, cu suport GPU lung și spațiu generos pentru cable management modern.",
    price: 499,
    category: "components",
    subcategory: "carcasa",
    specifications:
      "Format: Mid-Tower\nSuport placa de bază: ATX/mATX/ITX\nVentilatoare incluse: 2x 120 mm RGB\nRadiator max: 280 mm\nSloturi SSD: 2",
  },
  {
    name: "Cooler Master MasterBox Q300L",
    description:
      "Carcasă micro-ATX accesibilă, ideală pentru sisteme compacte de birou sau HTPC. Design perforat, suport radiatoare frontale și montare flexibilă a sursei pentru spații reduse.",
    price: 249,
    category: "components",
    subcategory: "carcasa",
    specifications:
      "Format: micro-ATX\nSuport placa de bază: mATX/ITX\nVentilatoare incluse: 1x 120 mm\nRadiator max: 240 mm\nSloturi SSD: 2",
  },

  // ── Stocare / Storage (3) ──────────────────────────────────────────────────
  {
    name: "Samsung 990 PRO 1TB NVMe SSD",
    description:
      "SSD NVMe PCIe 4.0 de 1 TB cu viteze de citire peste 7000 MB/s, ideal pentru sistem de operare și gaming. Controller Samsung V-NAND și fiabilitate ridicată pentru utilizare intensă.",
    price: 549,
    category: "components",
    subcategory: "stocare",
    specifications:
      "Capacitate: 1 TB\nInterfață: M.2 PCIe 4.0 x4\nCitire: 7450 MB/s\nScriere: 6900 MB/s\nTBW: 600 TB",
  },
  {
    name: "WD Black SN850X 2TB NVMe SSD",
    description:
      "Unitate SSD NVMe de 2 TB orientată gaming, cu heatsink opțional și latențe reduse. Performanță constantă la transferuri mari, potrivită pentru biblioteci extinse de jocuri AAA.",
    price: 899,
    category: "components",
    subcategory: "stocare",
    specifications:
      "Capacitate: 2 TB\nInterfață: M.2 PCIe 4.0 x4\nCitire: 7300 MB/s\nScriere: 6600 MB/s\nTBW: 1200 TB",
  },
  {
    name: "Seagate BarraCuda 2TB HDD",
    description:
      "Hard disk mecanic de 2 TB pentru stocare masivă la cost redus. Potrivit pentru arhivă media, backup și fișiere voluminoase, cu RPM 7200 pentru acces rezonabil la date.",
    price: 299,
    category: "components",
    subcategory: "stocare",
    specifications:
      "Capacitate: 2 TB\nInterfață: SATA III\nRPM: 7200\nCache: 256 MB\nFormat: 3.5 inch",
  },

  // ── Calculatoare / Desktops (4) ────────────────────────────────────────────
  {
    name: "PC Gaming BuildTech Elite RTX 4070",
    description:
      "Sistem desktop pre-asamblat pentru gaming 1440p, cu RTX 4070, Ryzen 7 și 32 GB RAM. Carcasă cu airflow optim, SSD NVMe rapid și Windows pregătit pentru instalare imediată.",
    price: 7499,
    category: "desktop",
    subcategory: null,
    specifications:
      "CPU: AMD Ryzen 7 7800X3D\nGPU: RTX 4070 12 GB\nRAM: 32 GB DDR5\nStocare: 1 TB NVMe\nSursă: 750W Gold",
  },
  {
    name: "PC Office BuildTech Pro i5",
    description:
      "Calculator de birou silențios cu Intel Core i5, 16 GB RAM și SSD de 512 GB. Ideal pentru productivitate, browsing și aplicații office, cu consum redus și pornire rapidă.",
    price: 3299,
    category: "desktop",
    subcategory: null,
    specifications:
      "CPU: Intel Core i5-13400\nGPU: Intel UHD integrată\nRAM: 16 GB DDR4\nStocare: 512 GB NVMe\nFormat: SFF",
  },
  {
    name: "PC Workstation BuildTech Creator",
    description:
      "Stație de lucru pentru editare video și randare 3D, echipată cu 64 GB RAM și RTX 4070 Ti. Stocare duală NVMe + HDD și sursă premium pentru sesiuni lungi de lucru.",
    price: 10999,
    category: "desktop",
    subcategory: null,
    specifications:
      "CPU: Intel Core i7-14700K\nGPU: RTX 4070 Ti 12 GB\nRAM: 64 GB DDR5\nStocare: 2 TB NVMe + 4 TB HDD\nSursă: 850W Gold",
  },
  {
    name: "PC Gaming BuildTech Starter GTX",
    description:
      "Sistem entry-level pentru gaming 1080p și eSports, cu RTX 4060 și Ryzen 5. Configurație echilibrată, ușor de upgradat, potrivită pentru primul PC de gaming.",
    price: 4599,
    category: "desktop",
    subcategory: null,
    specifications:
      "CPU: AMD Ryzen 5 7600\nGPU: RTX 4060 8 GB\nRAM: 16 GB DDR5\nStocare: 1 TB NVMe\nSursă: 650W Bronze",
  },
];

(async () => {
  const client = await pool.connect();
  let inserted = 0;
  let skipped = 0;

  try {
    await client.query("BEGIN");

    for (const p of PRODUCTS) {
      const { rows } = await client.query(
        `SELECT id FROM products WHERE name = $1 LIMIT 1`,
        [p.name]
      );
      if (rows.length > 0) {
        skipped++;
        console.log(`  skip  ${p.name} (already exists)`);
        continue;
      }

      await client.query(
        `INSERT INTO products
           (name, description, price, stock, category, subcategory,
            status, image_url, image_gallery, specifications)
         VALUES ($1, $2, $3, $4, $5, $6, 'bestseller', NULL, '[]'::jsonb, $7)`,
        [
          p.name,
          p.description,
          p.price,
          10,
          p.category,
          p.subcategory,
          p.specifications,
        ]
      );
      inserted++;
      console.log(`  add   ${p.name}`);
    }

    await client.query("COMMIT");
    console.log(`\nDone: ${inserted} inserted, ${skipped} skipped (${PRODUCTS.length} total in seed).`);
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
})().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
