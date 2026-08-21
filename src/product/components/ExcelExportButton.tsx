const PUBLIC_WORKBOOK_FILENAME = 'inteligencia-financeira-pdde-4cre-2026.xlsx';
const PUBLIC_WORKBOOK_PATH = `/data/${PUBLIC_WORKBOOK_FILENAME}`;

export function ExcelExportButton() {
  return (
    <a
      className="button excel-export-button"
      href={PUBLIC_WORKBOOK_PATH}
      download={PUBLIC_WORKBOOK_FILENAME}
      aria-label="Gerar visualização em arquivo Excel"
    >
      <svg
        className="excel-export-button__icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M5 3.75h8.5L19 9.25v11H5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M13.5 3.75v5.5H19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="m8 11.25 3.25 5.5M11.25 11.25 8 16.75" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span>Gerar visualização em arquivo Excel</span>
    </a>
  );
}
