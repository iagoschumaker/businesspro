import jsPDF from 'jspdf';

export interface OrderPDFData {
  id: string;
  customer: {
    name: string;
    document: string;
    address: string;
    phone: string;
    email: string;
  };
  date: string;
  dueDate?: string;
  paymentMethod: string;
  items: Array<{
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  total: number;
  notes?: string;
}

export const generateOrderPDF = (orderData: OrderPDFData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  // Colors
  const primaryColor = [59, 130, 246]; // Blue
  const textColor = [31, 41, 55]; // Gray-800
  const lightGray = [243, 244, 246]; // Gray-100
  
  // Header
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Company Logo/Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('BusinessPro', 20, 25);
  
  // Order title
  doc.setFontSize(16);
  doc.text(`Pedido ${orderData.id}`, pageWidth - 20, 25, { align: 'right' });
  
  // Reset text color
  doc.setTextColor(...textColor);
  
  // Order info section
  let yPos = 60;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Informações do Pedido', 20, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data: ${new Date(orderData.date).toLocaleDateString('pt-BR')}`, 20, yPos);
  if (orderData.dueDate) {
    doc.text(`Vencimento: ${new Date(orderData.dueDate).toLocaleDateString('pt-BR')}`, 120, yPos);
  }
  
  yPos += 8;
  doc.text(`Forma de Pagamento: ${orderData.paymentMethod}`, 20, yPos);
  
  // Customer info section
  yPos += 20;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Dados do Cliente', 20, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nome: ${orderData.customer.name}`, 20, yPos);
  
  yPos += 8;
  doc.text(`Documento: ${orderData.customer.document}`, 20, yPos);
  doc.text(`Telefone: ${orderData.customer.phone}`, 120, yPos);
  
  yPos += 8;
  doc.text(`E-mail: ${orderData.customer.email}`, 20, yPos);
  
  yPos += 8;
  doc.text(`Endereço: ${orderData.customer.address}`, 20, yPos);
  
  // Items table
  yPos += 25;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Itens do Pedido', 20, yPos);
  
  // Table header
  yPos += 15;
  const tableHeaders = ['Produto', 'Qtd', 'Valor Unit.', 'Total'];
  const colWidths = [80, 25, 30, 30];
  const startX = 20;
  
  // Header background
  doc.setFillColor(...lightGray);
  doc.rect(startX, yPos - 8, colWidths.reduce((a, b) => a + b, 0), 12, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  let xPos = startX;
  
  tableHeaders.forEach((header, index) => {
    doc.text(header, xPos + 5, yPos);
    xPos += colWidths[index];
  });
  
  // Table rows
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  
  orderData.items.forEach((item, index) => {
    if (yPos > pageHeight - 40) {
      doc.addPage();
      yPos = 40;
    }
    
    // Alternate row colors
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 251);
      doc.rect(startX, yPos - 6, colWidths.reduce((a, b) => a + b, 0), 10, 'F');
    }
    
    xPos = startX;
    const rowData = [
      item.productName,
      item.quantity.toString(),
      `R$ ${item.unitPrice.toFixed(2)}`,
      `R$ ${item.total.toFixed(2)}`
    ];
    
    rowData.forEach((data, colIndex) => {
      const textAlign = colIndex === 0 ? 'left' : 'center';
      const textX = textAlign === 'center' ? xPos + colWidths[colIndex] / 2 : xPos + 5;
      
      doc.text(data, textX, yPos, { align: textAlign });
      xPos += colWidths[colIndex];
    });
    
    yPos += 10;
  });
  
  // Totals section
  yPos += 15;
  const totalsX = pageWidth - 80;
  
  doc.setFont('helvetica', 'normal');
  doc.text(`Subtotal: R$ ${orderData.subtotal.toFixed(2)}`, totalsX, yPos);
  
  if (orderData.discount && orderData.discount > 0) {
    yPos += 8;
    doc.text(`Desconto: R$ ${orderData.discount.toFixed(2)}`, totalsX, yPos);
  }
  
  yPos += 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Total: R$ ${orderData.total.toFixed(2)}`, totalsX, yPos);
  
  // Notes section
  if (orderData.notes) {
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Observações:', 20, yPos);
    
    yPos += 8;
    doc.setFont('helvetica', 'normal');
    const splitNotes = doc.splitTextToSize(orderData.notes, pageWidth - 40);
    doc.text(splitNotes, 20, yPos);
  }
  
  // Footer
  const footerY = pageHeight - 30;
  doc.setFontSize(8);
  doc.setTextColor(107, 114, 128);
  doc.text('Este documento foi gerado automaticamente pelo sistema BusinessPro', pageWidth / 2, footerY, { align: 'center' });
  doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, pageWidth / 2, footerY + 8, { align: 'center' });
  
  // Save the PDF
  doc.save(`Pedido_${orderData.id}.pdf`);
};

export interface BilletPDFData {
  id: string;
  customer: {
    name: string;
    document: string;
    address: string;
  };
  amount: number;
  dueDate: string;
  issueDate: string;
  barcode: string;
  instructions?: string;
  interest?: number;
  fine?: number;
}

export const generateBilletPDF = (billetData: BilletPDFData): void => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  
  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('BusinessPro - Boleto Bancário', 20, 20);
  
  // Reset colors
  doc.setTextColor(31, 41, 55);
  
  // Billet info
  let yPos = 50;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`Boleto ${billetData.id}`, 20, yPos);
  
  yPos += 15;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Data de Emissão: ${new Date(billetData.issueDate).toLocaleDateString('pt-BR')}`, 20, yPos);
  doc.text(`Vencimento: ${new Date(billetData.dueDate).toLocaleDateString('pt-BR')}`, 120, yPos);
  
  // Customer data
  yPos += 20;
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Pagador:', 20, yPos);
  
  yPos += 10;
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${billetData.customer.name}`, 20, yPos);
  
  yPos += 8;
  doc.text(`CPF/CNPJ: ${billetData.customer.document}`, 20, yPos);
  
  yPos += 8;
  doc.text(`Endereço: ${billetData.customer.address}`, 20, yPos);
  
  // Amount section
  yPos += 25;
  doc.setFillColor(243, 244, 246);
  doc.rect(20, yPos - 10, pageWidth - 40, 25, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(`Valor: R$ ${billetData.amount.toFixed(2)}`, pageWidth / 2, yPos, { align: 'center' });
  
  // Barcode section
  yPos += 30;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Código de Barras:', 20, yPos);
  
  yPos += 10;
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);
  doc.text(billetData.barcode, 20, yPos);
  
  // Instructions
  if (billetData.instructions) {
    yPos += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Instruções:', 20, yPos);
    
    yPos += 10;
    doc.setFont('helvetica', 'normal');
    const splitInstructions = doc.splitTextToSize(billetData.instructions, pageWidth - 40);
    doc.text(splitInstructions, 20, yPos);
  }
  
  // Save the PDF
  doc.save(`Boleto_${billetData.id}.pdf`);
};