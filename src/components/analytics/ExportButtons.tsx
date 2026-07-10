import { memo, useCallback } from 'react';
import { FileText, FileSpreadsheet, Printer } from 'lucide-react';
import { showToast } from '../ui/Toast';

interface ExportButtonsProps {
  onExportPdf?: () => void;
  onExportExcel?: () => void;
  onPrint?: () => void;
}

function ExportButtonsInner({ onExportPdf, onExportExcel, onPrint }: ExportButtonsProps) {
  const handlePrint = useCallback(() => {
    window.print();
    onPrint?.();
  }, [onPrint]);

  const handlePdf = useCallback(async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      const doc = new jsPDF();
      doc.text('EMF Group - Analytics Report', 14, 20);
      doc.text(`Generated: ${new Date().toLocaleDateString('ar-EG')}`, 14, 28);
      doc.save('emf-analytics-report.pdf');
      showToast('تم تصدير التقرير بنجاح', 'success');
      onExportPdf?.();
    } catch {
      showToast('فشل تصدير PDF', 'error');
    }
  }, [onExportPdf]);

  const handleExcel = useCallback(async () => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet([['EMF Group - Analytics Report'], [`Generated: ${new Date().toLocaleDateString('ar-EG')}`], []]);
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, 'emf-analytics-report.xlsx');
      showToast('تم تصدير ملف Excel بنجاح', 'success');
      onExportExcel?.();
    } catch {
      showToast('فشل تصدير Excel', 'error');
    }
  }, [onExportExcel]);

  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
      <button onClick={handlePdf} className="btn btn-secondary btn-sm">
        <FileText size={14} /> PDF
      </button>
      <button onClick={handleExcel} className="btn btn-secondary btn-sm">
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button onClick={handlePrint} className="btn btn-secondary btn-sm">
        <Printer size={14} /> طباعة
      </button>
    </div>
  );
}

export default memo(ExportButtonsInner);
