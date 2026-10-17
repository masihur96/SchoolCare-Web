// Helper to dynamically load jsPDF and jspdf-autotable only when needed on the client,
// preventing massive memory footprint and SSR bundling overhead.

export async function getPdfTools() {
  if (typeof window === 'undefined') {
    throw new Error('PDF export can only be run in the browser.');
  }

  const [jspdfModule, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const jsPDF = jspdfModule.jsPDF || jspdfModule.default;
  const autoTable = autoTableModule.default || autoTableModule;

  return { jsPDF, autoTable };
}
