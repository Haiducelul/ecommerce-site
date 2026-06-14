import jsPDF from "jspdf";

export function generateTestPDF(orderId: string) {
  const doc = new jsPDF();
  
  doc.text("Chitanta Test Comanda #" + orderId, 10, 10);
  
  doc.save("test.pdf");
}
