// Variáveis globais (assumindo que já existem)
let gk_isXlsx = false;
let gk_xlsxFileLookup = {};
let gk_fileData = {};
let currentSheetData = {};

function filledCell(cell) {
  return cell !== '' && cell != null;
}

function loadFileData(filename) {
  if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
    try {
      var workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
      var firstSheetName = workbook.SheetNames[0]; // Sheet "Jogos"
      var worksheet = workbook.Sheets[firstSheetName];
      var jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
      var filteredData = jsonData.filter(row => row.some(filledCell));
      var headerRowIndex = filteredData.findIndex((row, index) =>
        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
      );
      if (headerRowIndex === -1 || headerRowIndex > 25) {
        headerRowIndex = 0;
      }
      var csv = XLSX.utils.aoa_to_sheet(filteredData.slice(headerRowIndex));
      csv = XLSX.utils.sheet_to_csv(csv, { header: 1 });
      return csv;
    } catch (e) {
      console.error(e);
      return "";
    }
  }
  return gk_fileData[filename] || "";
}

// Função para carregar e renderizar dados da planilha
function loadAndRenderTable(tabId, tableId, headers) {
  const csvData = loadFileData("jogos.xlsx"); // Assumindo que o arquivo é "jogos.xlsx"
  if (csvData) {
    const rows = csvData.split('\n').filter(row => row.trim() !== '');
    const headerRow = rows[0].split(',');
    const dataRows = rows.slice(1).map(row => row.split(','));

    // Mapear índices das colunas com base nos cabeçalhos fornecidos
    const columnMap = {};
    headers.forEach((header, index) => {
      const colIndex = headerRow.indexOf(header);
      if (colIndex !== -1) columnMap[header] = colIndex;
    });

    const tbody = document.getElementById