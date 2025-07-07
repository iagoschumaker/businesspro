import jsPDF from 'jspdf';

export interface OrderPDFData {
  id: number | string;
  date: string;
  dateTime?: string; // Data e hora completa do pedido
  dueDate?: string;
  vendedor?: string;
  customer: {
    id?: number;
    name: string;
    document: string; // CPF/CNPJ
    address: string;
    phone: string;
    email?: string;
    ie?: string;      // Inscrição Estadual ou RG
    city?: string;
    cep?: string;
    zona?: string;    // Rural, urbana, etc
  };
  items: {
    codigo?: string;   // Código do produto
    productName: string;
    quantity: number;
    price?: number;
    unitPrice?: number; // Preço unitário (compat. com código existente)
    total?: number;     // Total do item
    marca?: string;     // Marca do produto
    unidade?: string;   // Unidade de medida (UN, KG, etc)
  }[];
  paymentMethod: string;
  observations?: string;
  discount?: number;    // Valor de desconto
  shipping?: number;    // Valor do frete
  total: number;
  subtotal?: number;    // Adicionado para compatibilidade com o código existente
  notes?: string;
  invoiceNumber?: string; // Número do boleto/fatura
  invoiceNumbers?: string[]; // Array de números de boleto/fatura para pedidos com múltiplos boletos
}

export const generateOrderPDF = (orderData: OrderPDFData): void => {
  // Cria um PDF em formato paisagem (landscape) tamanho A4
  const doc = new jsPDF({
    orientation: 'portrait', // Alterado para retrato que é mais comum para pedidos
    unit: 'mm',
    format: 'a4'
  });
  
  // Definir constantes e margens
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const marginLeft = 15;
  const marginRight = 15;
  const marginTop = 15;
  
  // Define cores para uso em todo o documento
  const textColor = [0, 0, 0];
  const borderColor = [180, 180, 180];
  
  // Definições de tamanhos
  const contentWidth = pageWidth - marginLeft - marginRight;
  
  // Posição inicial
  let yPos = marginTop;
  
  // Configuração padrão de cores e fontes
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setTextColor(textColor[0], textColor[1], textColor[2]);
  
  // === CABEÇALHO COM INFORMAÇÕES DA EMPRESA ===
  // Retângulo do cabeçalho com bordas
  doc.setLineWidth(0.5);
  const headerHeight = 25;
  doc.rect(marginLeft, yPos, contentWidth, headerHeight);
  
  // Divisão entre empresa e número do pedido
  const companyWidth = contentWidth * 0.7;
  const orderNumWidth = contentWidth * 0.3;
  doc.line(marginLeft + companyWidth, yPos, marginLeft + companyWidth, yPos + headerHeight);
  
  // Título da empresa (em negrito)
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('BUSINES PRO', marginLeft + 5, yPos + 7);
  
  // Dados da empresa
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Rua Exemplo, 123 - Centro', marginLeft + 5, yPos + 12);
  doc.text('Cidade - Estado CEP 12.345-678', marginLeft + 5, yPos + 16);
  doc.text('Tel: (11) 1234-5678 | CNPJ: 12.345.678/0001-99', marginLeft + 5, yPos + 20);
  
  // Bloco do número do pedido
  const orderNumX = marginLeft + companyWidth;
  // Título "PEDIDO" no bloco
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PEDIDO', orderNumX + (orderNumWidth/2), yPos + 7, { align: 'center' });
  
  // Número do pedido
  doc.setFontSize(14);
  doc.text(orderData.id.toString(), orderNumX + (orderNumWidth/2), yPos + 15, { align: 'center' });
  
  // Data do pedido
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data: ${orderData.date}`, orderNumX + (orderNumWidth/2), yPos + 22, { align: 'center' });
  
  // Avançar posição após o cabeçalho
  yPos += headerHeight + 5;
  
  // === SEÇÃO DE DADOS DO CLIENTE ===
  // Título da seção
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DADOS DO CLIENTE', marginLeft, yPos + 5);
  
  // Caixa para dados do cliente com espaçamento garantido
  const clientBoxHeight = 40;
  doc.setLineWidth(0.5);
  doc.rect(marginLeft, yPos, contentWidth, clientBoxHeight);
  
  // Layout em duas colunas para dados do cliente
  const col1Width = contentWidth * 0.5;
  const colGap = 5;
  
  // Posições X para cada coluna
  const col1X = marginLeft + 5;
  const col2X = marginLeft + col1Width + colGap;
  
  // Posição inicial do texto do cliente
  let yClient = yPos + 12;
  
  // Coluna esquerda - dados principais
  doc.setFontSize(8);
  
  // Nome do cliente
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', col1X, yClient);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.name, col1X + 25, yClient);
  
  // Endereço
  yClient += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Endereço:', col1X, yClient);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.address, col1X + 25, yClient);
  
  // Cidade (se houver)
  yClient += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Cidade:', col1X, yClient);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.city || 'Não informada', col1X + 25, yClient);
  
  // Email (se houver)
  yClient += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Email:', col1X, yClient);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.email || 'E-mail não informado', col1X + 25, yClient);
  
  // Vendedor (se houver)
  yClient += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Vendedor:', col1X, yClient);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.vendedor || 'Não informado', col1X + 25, yClient);
  
  // Coluna direita - dados fiscais
  let yClient2 = yPos + 12;
  
  // CPF/CNPJ
  doc.setFont('helvetica', 'bold');
  doc.text('CPF/CNPJ:', col2X, yClient2);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.document, col2X + 25, yClient2);
  
  // IE/RG
  yClient2 += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('IE/RG:', col2X, yClient2);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.ie || 'Não informado', col2X + 25, yClient2);
  
  // CEP
  yClient2 += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('CEP:', col2X, yClient2);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.cep || 'Não informado', col2X + 25, yClient2);
  
  // Telefone
  yClient2 += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Telefone:', col2X, yClient2);
  doc.setFont('helvetica', 'normal');
  doc.text(orderData.customer.phone, col2X + 25, yClient2);
  
  // Data do pedido na coluna direita
  yClient2 += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Data:', col2X, yClient2);
  doc.setFont('helvetica', 'normal');
  // Usar data e hora completa se disponível, caso contrário só a data
  doc.text(orderData.dateTime || orderData.date, col2X + 25, yClient2);
  
  // Avançar posição
  yPos += clientBoxHeight + 10;
  
  // === TABELA DE PRODUTOS ===
  // Título da tabela
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('PRODUTOS', marginLeft, yPos + 5);
  
  // Avançar posição após o título
  yPos += 10;
  
  // Configuração da tabela
  const tableWidth = contentWidth;
  const rowHeight = 7;
  
  // Definição das larguras das colunas (proporcionais)
  const colWidths = {
    codigo: tableWidth * 0.08,      // 8%
    descricao: tableWidth * 0.35,   // 35%
    marca: tableWidth * 0.12,       // 12%
    unidade: tableWidth * 0.07,     // 7%
    quantidade: tableWidth * 0.10,  // 10%
    valorUnit: tableWidth * 0.14,   // 14%
    total: tableWidth * 0.14        // 14%
  };
  
  // Cálculo das posições X de cada coluna
  const colX = {
    codigo: marginLeft,
    descricao: marginLeft + colWidths.codigo,
    marca: marginLeft + colWidths.codigo + colWidths.descricao,
    unidade: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.marca,
    quantidade: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.marca + colWidths.unidade,
    valorUnit: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.marca + colWidths.unidade + colWidths.quantidade,
    total: marginLeft + colWidths.codigo + colWidths.descricao + colWidths.marca + colWidths.unidade + colWidths.quantidade + colWidths.valorUnit
  };
  
  // Cabeçalho da tabela
  // Fundo do cabeçalho
  doc.setFillColor(230, 230, 230); // Cinza claro
  doc.rect(marginLeft, yPos, tableWidth, rowHeight, 'F');
  
  // Borda do cabeçalho
  doc.setLineWidth(0.2);
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.rect(marginLeft, yPos, tableWidth, rowHeight);
  
  // Separadores verticais
  doc.line(colX.descricao, yPos, colX.descricao, yPos + rowHeight);
  doc.line(colX.marca, yPos, colX.marca, yPos + rowHeight);
  doc.line(colX.unidade, yPos, colX.unidade, yPos + rowHeight);
  doc.line(colX.quantidade, yPos, colX.quantidade, yPos + rowHeight);
  doc.line(colX.valorUnit, yPos, colX.valorUnit, yPos + rowHeight);
  doc.line(colX.total, yPos, colX.total, yPos + rowHeight);
  
  // Títulos das colunas
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Código', colX.codigo + 2, yPos + rowHeight/2 + 2);
  doc.text('Descrição', colX.descricao + 2, yPos + rowHeight/2 + 2);
  doc.text('Marca', colX.marca + 2, yPos + rowHeight/2 + 2);
  doc.text('Unid', colX.unidade + 2, yPos + rowHeight/2 + 2);
  doc.text('Qtd', colX.quantidade + colWidths.quantidade/2, yPos + rowHeight/2 + 2, { align: 'center' });
  doc.text('Valor Unit.', colX.valorUnit + colWidths.valorUnit/2, yPos + rowHeight/2 + 2, { align: 'center' });
  doc.text('Total', colX.total + colWidths.total/2, yPos + rowHeight/2 + 2, { align: 'center' });
  
  // Avançar para a primeira linha de dados
  yPos += rowHeight;
  
  // Itens da tabela
  doc.setFont('helvetica', 'normal');
  let rowCount = 0;
  
  if (orderData.items && orderData.items.length > 0) {
    orderData.items.forEach((item) => {
      // Alternar cores para melhor legibilidade
      if (rowCount % 2 === 0) {
        doc.setFillColor(245, 245, 245); // Cinza muito claro
      } else {
        doc.setFillColor(255, 255, 255); // Branco
      }
      
      // Fundo da linha
      doc.rect(marginLeft, yPos, tableWidth, rowHeight, 'F');
      
      // Borda da linha
      doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      doc.rect(marginLeft, yPos, tableWidth, rowHeight);
      
      // Separadores verticais
      doc.line(colX.descricao, yPos, colX.descricao, yPos + rowHeight);
      doc.line(colX.marca, yPos, colX.marca, yPos + rowHeight);
      doc.line(colX.unidade, yPos, colX.unidade, yPos + rowHeight);
      doc.line(colX.quantidade, yPos, colX.quantidade, yPos + rowHeight);
      doc.line(colX.valorUnit, yPos, colX.valorUnit, yPos + rowHeight);
      doc.line(colX.total, yPos, colX.total, yPos + rowHeight);
      
      // Texto de cada célula
      doc.setFontSize(7);
      
      // Limitar tamanho da descrição para evitar quebra de layout
      const description = item.productName || '';
      const truncatedDesc = description.length > 35 ? description.substring(0, 35) + '...' : description;
      
      // Valor unitário - usar price ou unitPrice conforme disponível
      const unitPrice = item.unitPrice || item.price || 0;
      const totalValue = unitPrice * item.quantity;
      
      // Formatar valores para moeda
      const formattedUnitPrice = `R$ ${unitPrice.toFixed(2)}`;
      const formattedTotal = `R$ ${totalValue.toFixed(2)}`;
      
      // Render cada célula
      doc.text(item.codigo || '-', colX.codigo + 2, yPos + rowHeight/2 + 1.5);
      doc.text(truncatedDesc, colX.descricao + 2, yPos + rowHeight/2 + 1.5);
      doc.text(item.marca || '-', colX.marca + 2, yPos + rowHeight/2 + 1.5);
      doc.text(item.unidade || 'UN', colX.unidade + 2, yPos + rowHeight/2 + 1.5);
      doc.text(item.quantity.toString(), colX.quantidade + colWidths.quantidade/2, yPos + rowHeight/2 + 1.5, { align: 'center' });
      doc.text(formattedUnitPrice, colX.valorUnit + colWidths.valorUnit/2, yPos + rowHeight/2 + 1.5, { align: 'center' });
      doc.text(formattedTotal, colX.total + colWidths.total/2, yPos + rowHeight/2 + 1.5, { align: 'center' });
      
      // Incrementar posição Y e contador
      yPos += rowHeight;
      rowCount++;
    });
  } else {
    // Se não houver itens, exibe uma linha indicando que não há produtos
    doc.setFillColor(255, 255, 255); // Fundo branco
    doc.rect(marginLeft, yPos, tableWidth, rowHeight, 'F');
    doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    doc.rect(marginLeft, yPos, tableWidth, rowHeight);
    doc.text('Nenhum produto adicionado', marginLeft + tableWidth/2, yPos + rowHeight/2 + 1.5, { align: 'center' });
    yPos += rowHeight;
  }
  
  // Adicionar espaço após a tabela
  yPos += 10;
  
  // === RESUMO FINANCEIRO ===
  // Layout em duas colunas: observações e valores
  const obsWidth = contentWidth * 0.6;
  const valuesWidth = contentWidth * 0.4;
  const resumoHeight = 50;
  
  // Coluna de observações
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('OBSERVAÇÕES', marginLeft, yPos + 5);
  
  // Caixa para observações
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.3);
  doc.rect(marginLeft, yPos + 7, obsWidth - 5, resumoHeight);
  
  // Texto de observações com quebra de linha automática
  const obsText = orderData.observations || 'Nenhuma observação.';
  const splitObs = doc.splitTextToSize(obsText, obsWidth - 15);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(splitObs, marginLeft + 5, yPos + 15);
  
  // Coluna de valores
  const valuesX = marginLeft + obsWidth;
  
  // Título da seção de valores
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('VALORES DO PEDIDO', valuesX, yPos + 5);
  
  // Caixa para valores
  doc.setLineWidth(0.3);
  doc.rect(valuesX, yPos + 7, valuesWidth, resumoHeight);
  
  // Calcular valores do pedido
  let subtotal = 0;
  if (orderData.items && orderData.items.length > 0) {
    subtotal = orderData.items.reduce((sum, item) => {
      const price = item.unitPrice || item.price || 0;
      return sum + (price * item.quantity);
    }, 0);
  }
  
  // Valores adicionais
  const discountPercentage = orderData.discount || 0;
  const discountValue = (subtotal * discountPercentage) / 100;
  const shipping = orderData.shipping || 0;
  const total = subtotal - discountValue + shipping;
  
  // Formatação dos valores
  const formattedSubtotal = `R$ ${subtotal.toFixed(2)}`;
  const formattedDiscount = `R$ ${discountValue.toFixed(2)} (${discountPercentage}%)`;
  const formattedShipping = `R$ ${shipping.toFixed(2)}`;
  const formattedTotal = `R$ ${total.toFixed(2)}`;
  
  // Posições X para labels e valores
  const labelX = valuesX + 5;
  const valueX = valuesX + valuesWidth - 5;
  
  // Posição Y inicial para valores
  let valueY = yPos + 17;
  
  // Renderizar valores em duas colunas alinhadas
  doc.setFont('helvetica', 'normal');
  
  // Subtotal
  doc.text('Subtotal:', labelX, valueY);
  doc.text(formattedSubtotal, valueX, valueY, { align: 'right' });
  
  // Desconto
  valueY += 7;
  doc.text('Desconto:', labelX, valueY);
  doc.text(formattedDiscount, valueX, valueY, { align: 'right' });
  
  // Frete
  valueY += 7;
  doc.text('Frete:', labelX, valueY);
  doc.text(formattedShipping, valueX, valueY, { align: 'right' });
  
  // Linha separadora
  valueY += 3;
  doc.line(labelX, valueY, valueX, valueY);
  
  // Total em destaque
  valueY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('TOTAL:', labelX, valueY);
  doc.text(formattedTotal, valueX, valueY, { align: 'right' });
  
  // Forma de pagamento
  valueY += 10;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Forma de pagamento: ${orderData.paymentMethod || 'Não informada'}`, labelX, valueY);
  
  // Avançar posição para a próxima seção
  yPos += resumoHeight + 15;
  
  // === SEÇÃO DE PAGAMENTO ===
  if (orderData.invoiceNumber || (orderData.invoiceNumbers && orderData.invoiceNumbers.length > 0) || orderData.dueDate) {
    // Título da seção
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('INFORMAÇÕES DE PAGAMENTO', marginLeft, yPos);
    
    // Caixa para dados de pagamento
    const paymentHeight = 30;
    doc.setLineWidth(0.3);
    doc.rect(marginLeft, yPos + 2, contentWidth, paymentHeight);
    
    // Dados de pagamento
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    
    let paymentY = yPos + 10;
    
    // Data de emissão
    doc.text(`Data de Emissão: ${orderData.date}`, marginLeft + 5, paymentY);
    
    // Data de vencimento
    if (orderData.dueDate) {
      paymentY += 6;
      doc.text(`Data de Vencimento: ${orderData.dueDate}`, marginLeft + 5, paymentY);
    }
    
    // Número do boleto único
    if (orderData.invoiceNumber) {
      paymentY += 6;
      doc.text(`Número do Boleto: ${orderData.invoiceNumber}`, marginLeft + 5, paymentY);
    }
    
    // Múltiplos boletos
    if (orderData.invoiceNumbers && orderData.invoiceNumbers.length > 0) {
      paymentY += 6;
      doc.text('Boletos:', marginLeft + 5, paymentY);
      
      orderData.invoiceNumbers.forEach((num, index) => {
        paymentY += 5;
        doc.text(`${index + 1}: ${num}`, marginLeft + 15, paymentY);
      });
    }
    
    // Avançar posição
    yPos += paymentHeight + 10;
  }
  
  // === RODAPÉ ===
  // Linha de separação
  doc.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
  doc.setLineWidth(0.2);
  doc.line(marginLeft, yPos, marginLeft + contentWidth, yPos);
  
  // Texto de agradecimento centralizado
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Agradecemos a preferência!', marginLeft + contentWidth/2, yPos + 8, { align: 'center' });
  
  // Salvar o PDF
  doc.save(`pedido_${orderData.id}.pdf`);
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