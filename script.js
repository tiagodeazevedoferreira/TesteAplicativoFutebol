// Variáveis globais
let gk_isXlsx = false;
let gk_xlsxFileLookup = {};
let gk_fileData = {};
let currentSheetData = {};

// Função para verificar células preenchidas
function filledCell(cell) {
  return cell !== '' && cell != null;
}

// Função para carregar dados da planilha
function loadFileData(filename) {
  if (gk_isXlsx && gk_xlsxFileLookup[filename]) {
    try {
      const workbook = XLSX.read(gk_fileData[filename], { type: 'base64' });
      const sheetName = "Jogos"; // Sheet específica
      if (!workbook.SheetNames.includes(sheetName)) {
        console.error(`Sheet "${sheetName}" não encontrada no arquivo.`);
        return "";
      }
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, blankrows: false, defval: '' });
      const filteredData = jsonData.filter(row => row.some(filledCell));
      const headerRowIndex = filteredData.findIndex((row, index) =>
        row.filter(filledCell).length >= filteredData[index + 1]?.filter(filledCell).length
      );
      const finalHeaderIndex = headerRowIndex === -1 || headerRowIndex > 25 ? 0 : headerRowIndex;
      const csv = XLSX.utils.aoa_to_sheet(filteredData.slice(finalHeaderIndex));
      return XLSX.utils.sheet_to_csv(csv, { header: 1 });
    } catch (e) {
      console.error("Erro ao carregar a planilha:", e);
      return "";
    }
  }
  return gk_fileData[filename] || "";
}

// Função para carregar e renderizar tabelas
function loadAndRenderTable(tabId, tableId, headers, filterData = null) {
  const csvData = loadFileData("jogos.xlsx"); // Nome do arquivo da planilha
  if (!csvData) {
    console.error("Nenhum dado carregado da planilha.");
    return;
  }

  // Parsear o CSV
  const rows = csvData.split('\n').filter(row => row.trim() !== '');
  const headerRow = rows[0].split(',');
  const dataRows = rows.slice(1).map(row => row.split(','));

  // Mapear índices das colunas
  const columnMap = {};
  headers.forEach((header, index) => {
    const colIndex = headerRow.indexOf(header);
    if (colIndex !== -1) columnMap[header] = colIndex;
  });

  // Filtrar os dados se houver filtros
  let filteredRows = dataRows;
  if (filterData) {
    const { dataInicio, dataFim, time } = filterData;

    filteredRows = dataRows.filter(row => {
      let pass = true;

      // Filtro de Data Início e Data Fim
      const dataIndex = columnMap["Data"];
      if (dataIndex !== undefined && row[dataIndex]) {
        const rowDate = parseDate(row[dataIndex]);
        if (dataInicio && rowDate < parseDate(dataInicio)) pass = false;
        if (dataFim && rowDate > parseDate(dataFim)) pass = false;
      }

      // Filtro de Time (Mandante ou Visitante)
      const mandanteIndex = columnMap["Mandante"];
      const visitanteIndex = columnMap["Visitante"];
      if (time && mandanteIndex !== undefined && visitanteIndex !== undefined) {
        const mandante = row[mandanteIndex] || '';
        const visitante = row[visitanteIndex] || '';
        if (!mandante.includes(time) && !visitante.includes(time)) pass = false;
      }

      return pass;
    });
  }

  // Renderizar a tabela
  const tbody = document.getElementById(tableId.replace('jogosTable-', 'jogosBody-'));
  if (!tbody) return;

  tbody.innerHTML = '';
  filteredRows.forEach(row => {
    const tr = document.createElement('tr');
    headers.forEach(header => {
      const td = document.createElement('td');
      const colIndex = columnMap[header];
      td.textContent = colIndex !== undefined ? row[colIndex] || '' : '';
      td.className = 'p-2 border';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// Função para parsear datas no formato DD/MM/YYYY
function parseDate(dateStr) {
  const [day, month, year] = dateStr.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Função para carregar opções do filtro "Time"
function loadTimeFilterOptions(tabId, mandanteHeader, visitanteHeader) {
  const csvData = loadFileData("jogos.xlsx");
  if (!csvData) return;

  const rows = csvData.split('\n').filter(row => row.trim() !== '');
  const headerRow = rows[0].split(',');
  const dataRows = rows.slice(1).map(row => row.split(','));

  const mandanteIndex = headerRow.indexOf(mandanteHeader);
  const visitanteIndex = headerRow.indexOf(visitanteHeader);
  if (mandanteIndex === -1 || visitanteIndex === -1) return;

  // Coletar todos os times (Mandante e Visitante)
  const teams = new Set();
  dataRows.forEach(row => {
    if (row[mandanteIndex]) teams.add(row[mandanteIndex].trim());
    if (row[visitanteIndex]) teams.add(row[visitanteIndex].trim());
  });

  // Ordenar alfabeticamente
  const sortedTeams = Array.from(teams).sort();

  // Preencher o select do filtro "Time"
  const timeSelect = document.getElementById(`time-${tabId}`);
  if (!timeSelect) return;

  timeSelect.innerHTML = '<option value="">Todos</option>';
  sortedTeams.forEach(team => {
    const option = document.createElement('option');
    option.value = team;
    option.textContent = team;
    timeSelect.appendChild(option);
  });
}

// Função para inicializar os filtros e eventos
function initializeTab(tabId, tableId, headers) {
  loadAndRenderTable(tabId, tableId, headers);
  if (tabId === 'tab6') {
    loadTimeFilterOptions(tabId, "Mandante", "Visitante");

    const aplicarFiltrosBtn = document.getElementById(`aplicarFiltros-${tabId}`);
    const limparFiltrosBtn = document.getElementById(`limparFiltros-${tabId}`);

    aplicarFiltrosBtn.addEventListener('click', () => {
      const dataInicio = document.getElementById(`dataInicio-${tabId}`).value;
      const dataFim = document.getElementById(`dataFim-${tabId}`).value;
      const time = document.getElementById(`time-${tabId}`).value;

      const filterData = { dataInicio, dataFim, time };
      loadAndRenderTable(tabId, tableId, headers, filterData);
    });

    limparFiltrosBtn.addEventListener('click', () => {
      document.getElementById(`dataInicio-${tabId}`).value = '';
      document.getElementById(`dataFim-${tabId}`).value = '';
      document.getElementById(`time-${tabId}`).value = '';
      loadAndRenderTable(tabId, tableId, headers);
    });
  }
}

// Inicialização das abas
document.addEventListener('DOMContentLoaded', () => {
  // Aba Jogos (tab1)
  const tab1Headers = ["Campeonato", "Data", "Horário", "Ginásio", "Mandante", "Visitante", "Local", "Rodada", "Dia da Semana"];
  initializeTab('tab1', 'jogosTable-tab1', tab1Headers);

  // Aba Tabela (tab2)
  const tab2Headers = ["Campeonato", "Data", "Horário", "Ginásio", "Mandante", "", "", "Visitante", "Local", "Rodada", "Dia da Semana", "Gol", "Assistências", "Vitória", "Derrota", "Empate"];
  initializeTab('tab2', 'jogosTable-tab2', tab2Headers);

  // Aba Placares (tab6)
  const tab6Headers = ["Campeonato", "Mandante", "Visitante", "Data", "Horário", "Ginásio", "Local", "Rodada", "Dia da Semana"];
  initializeTab('tab6', 'jogosTable-tab6', tab6Headers);

  // Outras abas (Resumo, Convocações, Classificação) não foram incluídas aqui para simplificação
});