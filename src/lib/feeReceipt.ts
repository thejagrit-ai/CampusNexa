import jsPDF from 'jspdf';

export interface FeeReceiptInput {
  payment: any;
  student: any;
  institution?: any;
}

const dateText = (value: any) => {
  if (!value) return '—';
  if (value?.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
};

export function downloadFeeReceipt({ payment, student, institution = {} }: FeeReceiptInput) {
  const config = institution.receiptTemplate || {};
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const accent = config.accentColor || '#111827';
  const name = config.institutionName || institution.collegeName || 'University';
  const receiptNo = payment.receiptNumber || payment.transactionId || payment.paymentTransactionId || payment.id;
  const studentName = student?.fullName || student?.name || 'Student';
  const amount = Number(payment.amount || 0);

  pdf.setDrawColor(accent);
  pdf.setFillColor(accent);
  pdf.rect(0, 0, 210, 12, 'F');
  pdf.setTextColor(17, 24, 39);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(name, 18, 30);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  if (config.address) pdf.text(config.address, 18, 36);
  if (config.email || config.phone) pdf.text([config.email, config.phone].filter(Boolean).join(' · '), 18, 41);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(config.title || 'FEE PAYMENT RECEIPT', 192, 31, { align: 'right' });
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(`Receipt no: ${receiptNo}`, 192, 38, { align: 'right' });
  pdf.text(`Issued: ${dateText(payment.paidDate || payment.updatedAt || new Date())}`, 192, 43, { align: 'right' });
  pdf.setDrawColor(accent);
  pdf.line(18, 49, 192, 49);

  let y = 62;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('STUDENT DETAILS', 18, y);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  y += 9;
  const details = [
    ['Name', studentName],
    ['Student ID', payment.studentId || student?.enrollmentNumber || '—'],
    ['Email', student?.email || '—'],
    ['Department', student?.department || '—'],
  ];
  details.forEach(([label, value], index) => {
    const x = index % 2 === 0 ? 18 : 108;
    const rowY = y + Math.floor(index / 2) * 12;
    pdf.setFont('helvetica', 'bold'); pdf.text(`${label}:`, x, rowY);
    pdf.setFont('helvetica', 'normal'); pdf.text(String(value), x + 25, rowY);
  });
  y += 30;
  pdf.setFont('helvetica', 'bold'); pdf.text('PAYMENT DETAILS', 18, y);
  y += 8;
  pdf.setFillColor(245, 247, 250); pdf.rect(18, y - 5, 174, 10, 'F');
  pdf.setFontSize(9); pdf.text('Description', 22, y + 1); pdf.text('Category', 105, y + 1); pdf.text('Amount', 188, y + 1, { align: 'right' });
  y += 13;
  pdf.setFont('helvetica', 'normal'); pdf.setFontSize(10);
  pdf.text(String(payment.description || 'Fee payment'), 22, y);
  pdf.text(String(payment.category || 'General').replace(/^./, (letter) => letter.toUpperCase()), 105, y);
  pdf.text(`INR ${amount.toLocaleString('en-IN')}`, 188, y, { align: 'right' });
  y += 10; pdf.line(18, y, 192, y); y += 10;
  pdf.setFont('helvetica', 'bold'); pdf.setFontSize(12); pdf.text('Total paid', 135, y); pdf.text(`INR ${amount.toLocaleString('en-IN')}`, 188, y, { align: 'right' });
  y += 16;
  if (config.showPaymentMethod !== false) { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.text(`Payment method: ${payment.paymentMethod || payment.method || 'Recorded payment'}`, 18, y); y += 6; }
  pdf.text(`Payment status: ${(payment.status || 'paid').toString().toUpperCase()}`, 18, y);
  if (config.footer) { pdf.setFontSize(9); pdf.text(config.footer, 105, 275, { align: 'center', maxWidth: 170 }); }
  pdf.setFontSize(8); pdf.setTextColor(100, 116, 139); pdf.text('This is a computer-generated receipt and does not require a signature.', 105, 285, { align: 'center' });
  pdf.save(`fee-receipt-${receiptNo}.pdf`);
}
