import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface OrderItem {
  name: string;
  quantity: number;
  unit_price?: number | string;
  price?: number | string;
  product?: { price?: number | string };
}

interface Order {
  id: string;
  full_name: string | null;
  user_email: string | null;
  phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  total_amount: string;
  created_at: string;
  payment_method?: string | null;
  items: OrderItem[];
}

function normalizeRomanianDiacritics(text: string): string {
  return text
    .replace(/ă/g, "a")
    .replace(/Ă/g, "A")
    .replace(/â/g, "a")
    .replace(/Â/g, "A")
    .replace(/î/g, "i")
    .replace(/Î/g, "I")
    .replace(/ș/g, "s")
    .replace(/Ș/g, "S")
    .replace(/ț/g, "t")
    .replace(/Ț/g, "T")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "S")
    .replace(/ţ/g, "t")
    .replace(/Ţ/g, "T");
}

function getItemUnitPrice(item: OrderItem): number {
  const raw = item.unit_price ?? item.price ?? item.product?.price;
  if (raw == null || raw === "") return 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

export function generatePDF(order: Order) {
  const doc = new jsPDF();
  const primaryColor = "#22624a";

  // Invoice Header
  doc.setFontSize(24);
  doc.setTextColor(primaryColor);
  doc.text("BuildTech", 10, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(normalizeRomanianDiacritics(`Comanda #${order.id}`), 10, 30);
  doc.text(
    normalizeRomanianDiacritics(
      `Data: ${new Date(order.created_at).toLocaleDateString("ro-RO")}`
    ),
    10,
    36
  );
  doc.text(
    normalizeRomanianDiacritics(
      `Metoda de plata: ${order.payment_method || "Ramburs la curier"}`
    ),
    10,
    42
  );

  // Customer & Delivery Info
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(normalizeRomanianDiacritics("Informatii Client"), 10, 55);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(
    normalizeRomanianDiacritics(`Nume: ${order.full_name || "Necunoscut"}`),
    10,
    62
  );
  doc.text(
    normalizeRomanianDiacritics(`Email: ${order.user_email || "Indisponibil"}`),
    10,
    68
  );
  doc.text(
    normalizeRomanianDiacritics(`Telefon: ${order.phone || "Indisponibil"}`),
    10,
    74
  );

  const address = [order.shipping_address, order.shipping_city].filter(Boolean).join(", ");
  doc.text(
    normalizeRomanianDiacritics(`Adresa livrare: ${address || "Indisponibila"}`),
    10,
    80
  );

  // Products Table
  const tableData = order.items.map((item) => {
    const unitPrice = getItemUnitPrice(item);
    return [
      normalizeRomanianDiacritics(item.name),
      item.quantity.toString(),
      `${unitPrice.toFixed(2)} lei`,
      `${(item.quantity * unitPrice).toFixed(2)} lei`,
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [[
      normalizeRomanianDiacritics("Produs"),
      normalizeRomanianDiacritics("Cantitate"),
      normalizeRomanianDiacritics("Pret Unitar"),
      "Subtotal",
    ]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [34, 98, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
  });

  // Total Section
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(
    normalizeRomanianDiacritics(
      `Total de plata: ${Number(order.total_amount).toFixed(2)} lei`
    ),
    10,
    finalY
  );

  // Dynamic filename
  doc.save(`Chitanta_Comanda_${order.id}.pdf`);
}
