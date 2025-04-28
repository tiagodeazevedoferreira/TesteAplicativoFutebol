const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';
let allData = [];
let filteredDataTab1 = [];
let filteredDataTab2 = [];
let filteredDataTab3 = [];
let isPivotMode = { tab1: false, tab2: false };
let sortDirection = { tab1: {}, tab2: {} };

async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:R1000?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Erro ao carregar dados: ${response.statusText}`);
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Erro ao buscar dados da planilha:', error);
    document.getElementById('errorMessage').textContent = 'Erro ao carregar os dados da planilha. Verifique o console para detalhes.';
    document.getElementById('errorMessage').style.display = 'block';
    return [];
  }
}

function formatTime(time) {
  if (!time || typeof time !== 'string') return time || '';
  const [hours, minutes] = time.split(':');
  return `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
}

function applyFilters(data, tabId) {
  let filteredData = data.slice(1);
  const filters = [
    'campeonato', 'dataInicio', 'dataFim', 'ginasio', 'time', 'local',
    'rodada', 'diaSemana', 'gol', 'assistencias', 'resultado'
  ];

  console.log(`[applyFilters] Iniciando aplicação de filtros para tabId ${tabId}`);
  console.log(`[applyFilters] Dados originais (sem cabeçalho):`, filteredData);

  filters.forEach(filter => {
    const element = document.getElementById(`${filter}-${tabId}`);
    if (element && element.value) {
      console.log(`[applyFilters] Aplicando filtro ${filter} com valor: ${element.value}`);
      if (filter === 'dataInicio') {
        filteredData = filteredData.filter(row => {
          const date = new Date(row[1].split('/').reverse().join('-'));
          const filterDate = new Date(element.value);
          const result = date >= filterDate;
          console.log(`[applyFilters] Comparando dataInicio: ${row[1]} >= ${element.value} -> ${result}`);
          return result;
        });
      } else if (filter === 'dataFim') {
        filteredData = filteredData.filter(row => {
          const date = new Date(row[1].split('/').reverse().join('-'));
          const filterDate = new Date(element.value);
          const result = date <= filterDate;
          console.log(`[applyFilters] Comparando dataFim: ${row[1]} <= ${element.value} -> ${result}`);
          return result;
        });
      } else if (filter === 'time') {
        filteredData = filteredData.filter(row => {
          const result = row[4] === element.value || row[7] === element.value;
          console.log(`[applyFilters] Comparando time: ${row[4]} ou ${row[7]} === ${element.value} -> ${result}`);
          return result;
        });
      } else if (filter === 'gol') {
        filteredData = filteredData.filter(row => {
          const golValue = parseInt(row[11] || 0);
          const filterValue = parseInt(element.value);
          const result = golValue >= filterValue;
          console.log(`[applyFilters] Comparando gol: ${golValue} >= ${filterValue} -> ${result}`);
          return result;
        });
      } else if (filter === 'assistencias') {
        filteredData = filteredData.filter(row => {
          const assistValue = parseInt(row[12] || 0);
          const filterValue = parseInt(element.value);
          const result = assistValue >= filterValue;
          console.log(`[applyFilters] Comparando assistencias: ${assistValue} >= ${filterValue} -> ${result}`);
          return result;
        });
      } else if (filter === 'resultado') {
        filteredData = filteredData.filter(row => {
          const vitoria = element.value === 'Vitória' ? '1' : '0';
          const derrota = element.value === 'Derrota' ? '1' : '0';
          const empate = element.value === 'Empate' ? '1' : '0';
          const result = row[13] === vitoria || row[14] === derrota || row[15] === empate;
          console.log(`[applyFilters] Comparando resultado: V=${row[13]}, D=${row[14]}, E=${row[15]} com filtro ${element.value} -> ${result}`);
          return result;
        });
      } else {
        const columnIndices = {
          campeonato: 0,
          ginasio: 3,
          local: 8,
          rodada: 9,
          diaSemana: 10
        };
        const columnIndex = columnIndices[filter];
        if (columnIndex !== undefined) {
          filteredData = filteredData.filter(row => {
            const result = row[columnIndex] === element.value;
            console.log(`[applyFilters] Comparando ${filter} (índice ${columnIndex}): ${row[columnIndex]} === ${element.value} -> ${result}`);
            return result;
          });
        }
      }
    }
  });

  console.log(`[applyFilters] Dados filtrados para tabId ${tabId}:`, filteredData);
  return filteredData;
}

function populateFilters(data, tabId) {
  const columns = [
    { id: 'campeonato', index: 0 },
    { id: 'ginasio', index: 3, tab: 'tab2' },
    { id: 'time', index: [4, 7], tab: 'tab2' },
    { id: 'local', index: 8, tab: 'tab2' },
    { id: 'rodada', index: 9, tab: 'tab2' },
    { id: 'diaSemana', index: 10, tab: 'tab2' },
    { id: 'gol', index: 11, tab: 'tab2', range: true },
    { id: 'assistencias', index: 12, tab: 'tab2', range: true },
    { id: 'resultado', index: [13, 14, 15], tab: 'tab2', custom: ['Vitória', 'Derrota', 'Empate'] }
  ];

  console.log(`[populateFilters] Preenchendo filtros para tabId ${tabId}`);

  columns.forEach(column => {
    if (column.tab && column.tab !== tabId) return;
    const select = document.getElementById(`${column.id}-${tabId}`);
    if (!select) {
      console.warn(`[populateFilters] Elemento ${column.id}-${tabId} não encontrado`);
      return;
    }

    if (column.custom) {
      column.custom.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    } else if (column.range) {
      const values = [...new Set(data.slice(1).map(row => parseInt(row[column.index] || 0)))].sort((a, b) => a - b);
      values.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    } else {
      const indices = Array.isArray(column.index) ? column.index : [column.index];
      const values = new Set();
      indices.forEach(index => {
        data.slice(1).forEach(row => {
          if (row[index]) values.add(row[index]);
        });
      });
      const sortedValues = [...values].sort();
      sortedValues.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
    }
  });

  console.log(`[populateFilters] Filtros preenchidos para tabId ${tabId}`);
}

function pivotTable(data, tabId) {
  const tbody = document.getElementById(`jogosBody-${tabId}`);
  const thead = document.getElementById(`tableHead-${tabId}`);
  if (!tbody || !thead) {
    console.error(`[pivotTable] Elementos tbody ou thead não encontrados para tabId ${tabId}`);
    return;
  }

  tbody.innerHTML = '';
  thead.innerHTML = '';

  const rowHeader = tabId === 'tab1' ? 'Data' : 'Time';
  const columnHeader = tabId === 'tab1' ? 'Campeonato' : 'Campeonato';
  const rowHeaderIndex = tabId === 'tab1' ? 1 : [4, 7];
  const columnHeaderIndex = 0;

  console.log(`[pivotTable] Gerando tabela PIVOT para tabId ${tabId}`);
  console.log(`[pivotTable] Dados recebidos:`, data);

  const rowValues = new Set();
  if (Array.isArray(rowHeaderIndex)) {
    rowHeaderIndex.forEach(index => {
      data.forEach(row => {
        if (row[index]) rowValues.add(row[index]);
      });
    });
  } else {
    data.forEach(row => {
      if (row[rowHeaderIndex]) rowValues.add(row[rowHeaderIndex]);
    });
  }

  const columnValues = new Set(data.map(row => row[columnHeaderIndex]));
  const sortedRowValues = [...rowValues].sort();
  const sortedColumnValues = [...columnValues].sort();

  console.log(`[pivotTable] Valores de linha (rowValues):`, sortedRowValues);
  console.log(`[pivotTable] Valores de coluna (columnValues):`, sortedColumnValues);

  const headerRow = document.createElement('tr');
  const firstTh = document.createElement('th');
  firstTh.textContent = rowHeader;
  firstTh.classList.add('fixed-column');
  headerRow.appendChild(firstTh);
  sortedColumnValues.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  sortedRowValues.forEach(rowValue => {
    const tr = document.createElement('tr');
    const firstTd = document.createElement('td');
    firstTd.textContent = rowValue;
    firstTd.classList.add('fixed-column');
    tr.appendChild(firstTd);

    sortedColumnValues.forEach(colValue => {
      const td = document.createElement('td');
      const matchingRows = data.filter(row => {
        const rowMatch = Array.isArray(rowHeaderIndex)
          ? row[rowHeaderIndex[0]] === rowValue || row[rowHeaderIndex[1]] === rowValue
          : row[rowHeaderIndex] === rowValue;
        return rowMatch && row[columnHeaderIndex] === colValue;
      });

      if (matchingRows.length > 0) {
        const vitorias = matchingRows.filter(row => row[13] === '1').length;
        const derrotas = matchingRows.filter(row => row[14] === '1').length;
        const empates = matchingRows.filter(row => row[15] === '1').length;
        td.textContent = `V: ${vitorias}, E: ${empates}, D: ${derrotas}`;
      } else {
        td.textContent = '-';
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  console.log(`[pivotTable] Tabela PIVOT renderizada para tabId ${tabId}`);
}

function populateTable(data, tableBodyId, tableHeadId, tabId) {
  const tbody = document.getElementById(tableBodyId);
  const thead = document.getElementById(tableHeadId);
  if (!tbody || !thead) {
    console.error(`[populateTable] Elementos tbody ou thead não encontrados para tabId ${tabId}`);
    return;
  }

  tbody.innerHTML = '';
  thead.innerHTML = '';

  if (data.length === 0) {
    console.warn(`[populateTable] Nenhum dado para renderizar em tabId ${tabId}`);
    return;
  }

  console.log(`[populateTable] Renderizando tabela para tabId ${tabId} com dados:`, data);

  const headers = ['Campeonato', 'Data', 'Horário', 'Ginásio', 'Mandante', 'Placar Mandante', 'Placar Visitante', 'Visitante', 'Local', 'Rodada', 'Dia da Semana', 'Gol', 'Assistências', 'Resultado'];
  const headerRow = document.createElement('tr');
  headers.forEach((header, index) => {
    const th = document.createElement('th');
    th.textContent = header;
    if (index <= 10) {
      th.classList.add('sortable');
      th.dataset.index = index;
    }
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  data.forEach(row => {
    const vitoria = row[13] ? row[13] === '1' : false;
    const derrota = row[14] ? row[14] === '1' : false;
    const empate = row[15] ? row[15] === '1' : false;
    const considerar = row[16];
    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';

    if (considerarValue === '0') return;

    const tr = document.createElement('tr');
    if (vitoria) tr.classList.add('victory-row');
    else if (derrota) tr.classList.add('defeat-row');
    else if (empate) tr.classList.add('draw-row');

    row.slice(0, 13).forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = index === 2 ? formatTime(cell) : (cell || '');
      if (index === 0) td.classList.add('fixed-column');
      tr.appendChild(td);
    });

    const resultadoTd = document.createElement('td');
    if (vitoria) resultadoTd.textContent = 'Vitória';
    else if (derrota) resultadoTd.textContent = 'Derrota';
    else if (empate) resultadoTd.textContent = 'Empate';
    tr.appendChild(resultadoTd);

    tbody.appendChild(tr);
  });

  addSortListeners(tabId);
  console.log(`[populateTable] Tabela renderizada para tabId ${tabId}`);
}

function addSortListeners(tabId) {
  const sortableHeaders = document.querySelectorAll(`#tableHead-${tabId} .sortable`);
  sortableHeaders.forEach(header => {
    header.addEventListener('click', () => {
      const index = parseInt(header.dataset.index);
      const currentDirection = sortDirection[tabId][index] || 'desc';
      const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
      sortDirection[tabId][index] = newDirection;

      sortableHeaders.forEach(h => {
        h.classList.remove('sort-asc', 'sort-desc');
      });
      header.classList.add(newDirection === 'asc' ? 'sort-asc' : 'sort-desc');

      const data = tabId === 'tab1' ? filteredDataTab1 : filteredDataTab2;
      const sortedData = [...data].sort((a, b) => {
        let valA = a[index] || '';
        let valB = b[index] || '';
        if (index === 1) {
          valA = new Date(valA.split('/').reverse().join('-'));
          valB = new Date(valB.split('/').reverse().join('-'));
        } else if ([5, 6, 11, 12].includes(index)) {
          valA = parseInt(valA) || 0;
          valB = parseInt(valB) || 0;
        }
        return newDirection === 'asc' ? (valA > valB ? 1 : -1) : (valA < valB ? 1 : -1);
      });

      if (tabId === 'tab1') filteredDataTab1 = sortedData;
      else filteredDataTab2 = sortedData;

      if (isPivotMode[tabId]) {
        pivotTable(sortedData, tabId);
      } else {
        populateTable(sortedData, `jogosBody-${tabId}`, `tableHead-${tabId}`, tabId);
      }
    });
  });
}

function updateBigNumbers(data, tabId) {
  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;
  data.forEach(row => {
    const considerar = row[16];
    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    if (considerarValue === '0') return;

    jogos++;
    gols += parseInt(row[11] || 0);
    assistencias += parseInt(row[12] || 0);
    vitorias += row[13] ? parseInt(row[13]) : 0;
    derrotas += row[14] ? parseInt(row[14]) : 0;
    empates += row[15] ? parseInt(row[15]) : 0;
  });

  const mediaGols = jogos > 0 ? (gols / jogos).toFixed(2) : '0.00';
  const golACada = gols > 0 ? (jogos / gols).toFixed(2) : '0.00';

  document.getElementById(`bigNumberJogos-${tabId}`).textContent = jogos;
  document.getElementById(`bigNumberGols-${tabId}`).textContent = gols;
  document.getElementById(`bigNumberMedia-${tabId}`).textContent = mediaGols;
  document.getElementById(`bigNumberAssistencias-${tabId}`).textContent = assistencias;
  document.getElementById(`bigNumberGolACada-${tabId}`).textContent = golACada;
  document.getElementById(`bigNumberVitorias-${tabId}`).textContent = vitorias;
  document.getElementById(`bigNumberEmpates-${tabId}`).textContent = empates;
  document.getElementById(`bigNumberDerrotas-${tabId}`).textContent = derrotas;

  console.log(`[updateBigNumbers] Números grandes atualizados para tabId ${tabId}`);
}

function displayTab1() {
  console.log('[displayTab1] Exibindo Tab1, isPivotMode:', isPivotMode.tab1);
  filteredDataTab1 = applyFilters(allData, 'tab1');
  console.log('[displayTab1] Dados filtrados:', filteredDataTab1);
  if (isPivotMode.tab1) {
    pivotTable(filteredDataTab1, 'tab1');
  } else {
    populateTable(filteredDataTab1, 'jogosBody-tab1', 'tableHead-tab1', 'tab1');
  }
  updateBigNumbers(filteredDataTab1, 'tab1');
}

function displayTab2() {
  console.log('[displayTab2] Exibindo Tab2, isPivotMode:', isPivotMode.tab2);
  filteredDataTab2 = applyFilters(allData, 'tab2');
  console.log('[displayTab2] Dados filtrados:', filteredDataTab2);
  if (isPivotMode.tab2) {
    pivotTable(filteredDataTab2, 'tab2');
  } else {
    populateTable(filteredDataTab2, 'jogosBody-tab2', 'tableHead-tab2', 'tab2');
  }
  updateBigNumbers(filteredDataTab2, 'tab2');
}

function displayTab3() {
  filteredDataTab3 = allData.slice(1);
  updateBigNumbers(filteredDataTab3, 'tab3');
  console.log('[displayTab3] Exibindo Tab3');
}

function showTab(tabId) {
  console.log(`[showTab] Trocando para aba ${tabId}`);
  clearFilters();
  const tabs = document.querySelectorAll('.tab-content');
  tabs.forEach(tab => tab.classList.remove('active'));
  const buttons = document.querySelectorAll('.tab-button');
  buttons.forEach(btn => btn.classList.remove('active-tab'));

  const activeTab = document.getElementById(tabId);
  if (activeTab) activeTab.classList.add('active');
  const activeButton = document.getElementById(`${tabId}-btn`);
  if (activeButton) activeButton.classList.add('active-tab');

  if (tabId === 'tab1') displayTab1();
  else if (tabId === 'tab2') displayTab2();
  else if (tabId === 'tab3') displayTab3();
}

function clearFilters() {
  const inputs = document.querySelectorAll('input[type="date"], select');
  inputs.forEach(input => {
    input.value = '';
  });
  console.log('[clearFilters] Filtros limpos');
}

function checkForUpcomingGames(data) {
  const today = new Date();
  const threeDaysFromNow = new Date(today);
  threeDaysFromNow.setDate(today.getDate() + 3);

  const upcomingGames = data.slice(1).filter(row => {
    const gameDate = new Date(row[1].split('/').reverse().join('-'));
    return gameDate >= today && gameDate <= threeDaysFromNow && row[16] !== '0';
  });

  if (upcomingGames.length > 0 && Notification.permission === 'granted') {
    upcomingGames.forEach(game => {
      const gameDate = new Date(game[1].split('/').reverse().join('-'));
      const notificationMessage = `Jogo em ${game[1]} às ${formatTime(game[2])}: ${game[4]} vs ${game[7]} (${game[0]})`;
      new Notification(notificationMessage);
    });
  }

  const notificationsDiv = document.getElementById('notifications');
  const notificationMessage = document.getElementById('notificationMessage');
  if (upcomingGames.length > 0) {
    notificationMessage.textContent = `Você tem ${upcomingGames.length} jogo(s) nos próximos 3 dias!`;
    notificationsDiv.classList.remove('hidden');
  } else {
    notificationsDiv.classList.add('hidden');
  }

  console.log('[checkForUpcomingGames] Verificação de jogos futuros concluída');
}

function updatePivotButtonContent(button, isPivot) {
  // Remove apenas os filhos (ícone e texto), mantendo o elemento button intacto
  while (button.firstChild) {
    button.removeChild(button.firstChild);
  }

  // Adiciona o ícone
  const icon = document.createElement('i');
  icon.className = 'fa-solid fa-table mr-2';
  button.appendChild(icon);

  // Adiciona o texto
  const text = document.createTextNode(isPivot ? 'Normal' : 'Pivot');
  button.appendChild(text);
}

async function init() {
  console.log('[init] Inicializando app, estado inicial de isPivotMode:', isPivotMode);
  allData = await fetchSheetData();
  if (allData.length === 0) {
    console.error('[init] Nenhum dado retornado da API');
    return;
  }
  console.log('[init] Dados carregados da API:', allData);

  populateFilters(allData, 'tab1');
  populateFilters(allData, 'tab2');
  displayTab1();
  displayTab2();
  displayTab3();
  checkForUpcomingGames(allData);

  if (Notification.permission !== 'granted') {
    Notification.requestPermission();
  }

  // Eventos das abas
  const tab1Btn = document.getElementById('tab1-btn');
  const tab2Btn = document.getElementById('tab2-btn');
  const tab3Btn = document.getElementById('tab3-btn');

  if (tab1Btn) {
    tab1Btn.addEventListener('click', () => {
      console.log('[init] Clique no botão tab1-btn');
      showTab('tab1');
    });
  } else {
    console.error('[init] Botão tab1-btn não encontrado');
  }

  if (tab2Btn) {
    tab2Btn.addEventListener('click', () => {
      console.log('[init] Clique no botão tab2-btn');
      showTab('tab2');
    });
  } else {
    console.error('[init] Botão tab2-btn não encontrado');
  }

  if (tab3Btn) {
    tab3Btn.addEventListener('click', () => {
      console.log('[init] Clique no botão tab3-btn');
      showTab('tab3');
    });
  } else {
    console.error('[init] Botão tab3-btn não encontrado');
  }

  // Eventos dos botões de filtros e Pivot
  ['tab1', 'tab2'].forEach(tabId => {
    // Botão Pivot
    const pivotButton = document.getElementById(`pivotMode-${tabId}`);
    if (!pivotButton) {
      console.error(`[init] Botão pivotMode-${tabId} não encontrado`);
      return;
    }

    updatePivotButtonContent(pivotButton, isPivotMode[tabId]);
    console.log(`[init] Botão pivotMode-${tabId} inicializado com texto: ${pivotButton.textContent}`);

    // Botão Aplicar Filtros
    const aplicarFiltrosBtn = document.getElementById(`aplicarFiltros-${tabId}`);
    if (aplicarFiltrosBtn) {
      aplicarFiltrosBtn.addEventListener('click', () => {
        console.log(`[init] Botão Aplicar Filtros clicado para tabId ${tabId}`);
        if (tabId === 'tab1') displayTab1();
        else displayTab2();
      });
      console.log(`[init] Evento de clique adicionado ao botão aplicarFiltros-${tabId}`);
    } else {
      console.error(`[init] Botão aplicarFiltros-${tabId} não encontrado`);
    }

    // Botão Limpar Filtros
    const limparFiltrosBtn = document.getElementById(`limparFiltros-${tabId}`);
    if (limparFiltrosBtn) {
      limparFiltrosBtn.addEventListener('click', () => {
        console.log(`[init] Botão Limpar Filtros clicado para tabId ${tabId}`);
        clearFilters();
        if (tabId === 'tab1') displayTab1();
        else displayTab2();
      });
      console.log(`[init] Evento de clique adicionado ao botão limparFiltros-${tabId}`);
    } else {
      console.error(`[init] Botão limparFiltros-${tabId} não encontrado`);
    }

    // Evento do botão Pivot
    pivotButton.addEventListener('click', () => {
      console.log(`[init] Botão Pivot clicado para tabId ${tabId}, estado atual de isPivotMode: ${isPivotMode[tabId]}`);
      isPivotMode[tabId] = !isPivotMode[tabId];
      console.log(`[init] Novo estado de isPivotMode[${tabId}]: ${isPivotMode[tabId]}`);
      updatePivotButtonContent(pivotButton, isPivotMode[tabId]);
      console.log(`[init] Botão pivotMode-${tabId} atualizado com texto: ${pivotButton.textContent}`);
      if (isPivotMode[tabId]) {
        pivotTable(tabId === 'tab1' ? filteredDataTab1 : filteredDataTab2, tabId);
      } else {
        populateTable(tabId === 'tab1' ? filteredDataTab1 : filteredDataTab2, `jogosBody-${tabId}`, `tableHead-${tabId}`, tabId);
      }
    });
    console.log(`[init] Evento de clique adicionado ao botão pivotMode-${tabId}`);
  });

  console.log('[init] Inicialização concluída');
}

document.addEventListener('DOMContentLoaded', init);