console.log('script.js iniciado');

const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

let allData = [];
let filteredDataTab1 = []; // Jogos
let filteredDataTab2 = []; // Tabela
let filteredDataTab3 = []; // Resumo
let isPivotTab1 = false; // Estado do PIVOT para Aba 1 (Jogos)
let isPivotTab2 = false; // Estado do PIVOT para Aba 2 (Tabela)

async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:R1000?key=${API_KEY}`;
  console.log('Iniciando requisição à API:', url);
  try {
    const response = await fetch(url, { mode: 'cors' });
    console.log('Resposta recebida:', response.status, response.statusText);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Detalhes do erro:', errorText);
      if (response.status === 403) {
        throw new Error('Acesso negado (403). Verifique se a planilha está pública e se a chave API tem permissão.');
      } else if (response.status === 404) {
        throw new Error('Planilha não encontrada (404). Verifique o ID da planilha ou a aba Sheet1.');
      } else if (response.status === 429) {
        throw new Error('Limite de requisições excedido (429). Tente novamente mais tarde.');
      } else {
        throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
      }
    }
    const data = await response.json();
    console.log('Dados brutos:', data);
    if (!data.values || data.values.length === 0) {
      throw new Error('Nenhum dado retornado. A planilha está vazia ou a aba Sheet1 não existe.');
    }
    console.log('Linhas recebidas:', data.values.length);
    return data.values;
  } catch (error) {
    console.error('Erro ao buscar dados:', error.message);
    showError(`Erro ao carregar dados: ${error.message}`);
    return [];
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    console.log('Erro exibido:', message);
  } else {
    console.error('Elemento #errorMessage não encontrado');
  }
}

function clearError() {
  const errorDiv = document.getElementById('errorMessage');
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    console.log('Erro limpo');
  }
}

function populateFilters(data) {
  console.log('Populando filtros com', data.length, 'linhas');
  const filters = [
    { id: 'campeonato', index: 0 },
    { id: 'ginasio', index: 3 },
    { id: 'local', index: 8 },
    { id: 'rodada', index: 9 },
    { id: 'diaSemana', index: 10 },
    { id: 'gol', index: 11 },
    { id: 'assistencias', index: 12 }
  ];

  const tabs = ['tab1', 'tab2']; // Removido tab3 (Resumo), pois não tem filtros
  tabs.forEach(tab => {
    const timeSelect = document.getElementById(`time-${tab}`);
    if (timeSelect) {
      const mandantes = data.slice(1).map(row => row[4]?.trim()).filter(v => v);
      const visitantes = data.slice(1).map(row => row[7]?.trim()).filter(v => v);
      const times = [...new Set([...mandantes, ...visitantes])].sort();
      times.forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        timeSelect.appendChild(option);
      });
    }

    filters.forEach(filter => {
      const select = document.getElementById(`${filter.id}-${tab}`);
      if (select) {
        const values = [...new Set(data.slice(1).map(row => row[filter.index]?.trim()).filter(v => v))].sort();
        values.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          select.appendChild(option);
        });
      }
    });

    // Filtro para Resultado (apenas na aba Tabela)
    if (tab === 'tab2') {
      const resultadoSelect = document.getElementById(`resultado-${tab}`);
      if (resultadoSelect) {
        const resultadoOptions = ['Vitória', 'Derrota', 'Empate'];
        resultadoOptions.forEach(value => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value;
          resultadoSelect.appendChild(option);
        });
      }
    }
  });
}

function updateBigNumbers(data, tabId) {
  console.log(`Atualizando Big Numbers para ${tabId}`);
  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;

  data.forEach(row => {
    const placar1 = row[5];
    const considerar = row[16];
    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    const isValidConsiderar = considerarValue !== '0';
    const isValidPlacar1 = placar1 && placar1.trim() !== '';

    if (isValidConsiderar && isValidPlacar1) {
      jogos++;
    }
    if (isValidConsiderar) {
      if (row[11] && !isNaN(parseInt(row[11]))) {
        gols += parseInt(row[11]);
      }
      if (row[12] && !isNaN(parseInt(row[12]))) {
        assistencias += parseInt(row[12]);
      }
      vitorias += row[13] ? parseInt(row[13]) : 0;
      derrotas += row[14] ? parseInt(row[14]) : 0;
      empates += row[15] ? parseInt(row[15]) : 0;
    }
  });

  const media = jogos > 0 ? (gols / jogos).toFixed(2) : '0.00';
  const golACada = jogos > 0 && gols > 0 ? (jogos / gols).toFixed(2) : '0.00';

  document.getElementById(`bigNumberJogos-${tabId}`).textContent = jogos;
  document.getElementById(`bigNumberGols-${tabId}`).textContent = gols;
  document.getElementById(`bigNumberAssistencias-${tabId}`).textContent = assistencias;
  document.getElementById(`bigNumberVitorias-${tabId}`).textContent = vitorias;
  document.getElementById(`bigNumberEmpates-${tabId}`).textContent = empates;
  document.getElementById(`bigNumberDerrotas-${tabId}`).textContent = derrotas;
  document.getElementById(`bigNumberMedia-${tabId}`).textContent = media;
  document.getElementById(`bigNumberGolACada-${tabId}`).textContent = golACada;

  console.log(`Big Numbers atualizados (${tabId}):`, { jogos, gols, media, assistencias, golACada, vitorias, empates, derrotas });
}

let sortConfigTab1 = { column: null, direction: 'asc' };
let sortConfigTab2 = { column: null, direction: 'asc' };

// Função para formatar o horário de HH:MM:SS para HH:MM
function formatTime(time) {
  if (!time || typeof time !== 'string') return '';
  const parts = time.split(':');
  if (parts.length >= 2) {
    return `${parts[0]}:${parts[1]}`; // Retorna apenas HH:MM
  }
  return time; // Retorna o valor original se não estiver no formato esperado
}

function sortData(data, columnIndex, direction) {
  const sortedData = [...data];
  sortedData.sort((a, b) => {
    let valueA = a[columnIndex] || '';
    let valueB = b[columnIndex] || '';

    if (columnIndex === 1) {
      valueA = valueA ? new Date(valueA.split('/').reverse().join('-')) : new Date(0);
      valueB = valueB ? new Date(valueB.split('/').reverse().join('-')) : new Date(0);
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }

    if (columnIndex === 11 || columnIndex === 12) {
      valueA = parseInt(valueA) || 0;
      valueB = parseInt(valueB) || 0;
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }

    valueA = valueA.toString().toLowerCase();
    valueB = valueB.toString().toLowerCase();
    return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });
  return sortedData;
}

function displayData(data, filteredData, tabId) {
  console.log(`Exibindo dados (modo tabela normal) para ${tabId}`);
  clearError();
  const tbody = document.getElementById(`jogosBody-${tabId}`);
  const thead = document.getElementById(`tableHead-${tabId}`);
  if (!tbody || !thead) {
    console.error(`Elementos #jogosBody-${tabId} ou #tableHead-${tabId} não encontrados`);
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';
  thead.innerHTML = '';

  const trHead = document.createElement('tr');
  trHead.className = 'bg-gray-200';
  // Definir cabeçalhos com base na aba
  let headers;
  if (tabId === 'tab1') {
    // Aba 1: Excluir "Gol", "Assistências" e "Resultado"
    headers = ['Campeonato', 'Data', 'Horário', 'Ginásio', 'Mandante', '', '', 'Visitante', 'Local', 'Rodada', 'Dia da Semana'];
  } else {
    // Outras abas: Manter todas as colunas
    headers = ['Campeonato', 'Data', 'Horário', 'Ginásio', 'Mandante', '', '', 'Visitante', 'Local', 'Rodada', 'Dia da Semana', 'Gol', 'Assistências', 'Resultado'];
  }
  const sortConfig = tabId === 'tab1' ? sortConfigTab1 : sortConfigTab2;
  headers.forEach((text, index) => {
    const th = document.createElement('th');
    th.textContent = text;
    th.className = 'p-2 sortable';
    th.dataset.index = index;
    if (sortConfig.column === index) {
      th.classList.add(sortConfig.direction === 'asc' ? 'sort-asc' : 'sort-desc');
    }
    th.addEventListener('click', () => {
      const newDirection = sortConfig.column === index && sortConfig.direction === 'asc' ? 'desc' : 'asc';
      if (tabId === 'tab1') {
        sortConfigTab1 = { column: index, direction: newDirection };
      } else {
        sortConfigTab2 = { column: index, direction: newDirection };
      }
      const sortedData = sortData(filteredData, index, newDirection);
      displayData(data, sortedData, tabId);
      console.log(`Ordenando por coluna ${text} (${index}) em ordem ${newDirection} para ${tabId}`);
    });
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  console.log(`Total de linhas filtradas (tabela normal) para ${tabId}:`, filteredData.length);
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }

  let hasInconsistency = false;
  filteredData.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    const vitoria = row[13] === '1';
    const derrota = row[14] === '1';
    const empate = row[15] === '1';
    const conditions = [vitoria, derrota, empate].filter(Boolean).length;

    let resultado = '';
    if (conditions > 1) {
      console.warn(`Inconsistência nos dados da linha ${rowIndex + 2}: Vitória=${row[13]}, Derrota=${row[14]}, Empate=${row[15]}`);
      hasInconsistency = true;
      // Não aplica destaque para evitar comportamento visual incorreto
    } else if (conditions === 1) {
      if (vitoria) {
        resultado = 'Vitória';
        if (tabId !== 'tab1') tr.classList.add('victory-row'); // Aplicar destaque apenas fora da Aba 1
      } else if (derrota) {
        resultado = 'Derrota';
        if (tabId !== 'tab1') tr.classList.add('defeat-row');
      } else if (empate) {
        resultado = 'Empate';
        if (tabId !== 'tab1') tr.classList.add('draw-row');
      }
    }

    // Exibir colunas com base na aba
    if (tabId === 'tab1') {
      // Aba 1: Exibir apenas até a coluna 10 (Dia da Semana)
      row.slice(0, 11).forEach((cell, index) => {
        const td = document.createElement('td');
        // Formatar a coluna Horário (índice 2)
        if (index === 2) {
          td.textContent = formatTime(cell) || '';
        } else {
          td.textContent = cell || '';
        }
        td.className = 'p-2 border';
        tr.appendChild(td);
      });
    } else {
      // Outras abas: Exibir até a coluna 12 + Resultado
      row.slice(0, 13).forEach((cell, index) => {
        const td = document.createElement('td');
        // Formatar a coluna Horário (índice 2)
        if (index === 2) {
          td.textContent = formatTime(cell) || '';
        } else {
          td.textContent = cell || '';
        }
        td.className = 'p-2 border';
        tr.appendChild(td);
      });

      // Adicionar a coluna Resultado
      const tdResultado = document.createElement('td');
      tdResultado.textContent = resultado;
      tdResultado.className = 'p-2 border';
      tr.appendChild(tdResultado);
    }

    tbody.appendChild(tr);
  });

  if (hasInconsistency) {
    showError('Inconsistência nos dados: Algumas linhas possuem mais de um resultado (Vitória, Derrota, Empate). Corrija a planilha.');
  }
}

function pivotTable(data, filteredData, tabId) {
  console.log(`Transformando tabela para formato PIVOT para ${tabId}`);
  clearError();
  const tbody = document.getElementById(`jogosBody-${tabId}`);
  const thead = document.getElementById(`tableHead-${tabId}`);
  if (!tbody || !thead) {
    console.error(`Elementos #jogosBody-${tabId} ou #tableHead-${tabId} não encontrados`);
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';
  thead.innerHTML = '';

  const trHead = document.createElement('tr');
  trHead.className = 'bg-gray-200';
  ['', ''].forEach((_, index) => {
    const th = document.createElement('th');
    th.textContent = ''; // Removido "Coluna" e "Valores"
    th.className = 'p-2';
    if (index === 0) th.classList.add('fixed-column'); // Adicionar classe para fixar a primeira coluna
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  // Definir cabeçalhos com base na aba
  let headers;
  if (tabId === 'tab1') {
    // Aba 1: Excluir "Gol", "Assistências" e "Resultado"
    headers = data[0].slice(0, 11); // Até "Dia da Semana"
  } else {
    // Outras abas: Incluir até "Resultado"
    headers = data[0].slice(0, 13).concat(['Resultado']);
  }
  console.log(`Cabeçalho para PIVOT (${tabId}):`, headers);

  headers.forEach((header, colIndex) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = header;
    th.className = 'p-2 border bg-gray-200 fixed-column'; // Adicionar classe para fixar a primeira coluna
    tr.appendChild(th);

    filteredData.forEach(row => {
      const td = document.createElement('td');
      if (tabId !== 'tab1' && colIndex === 13) { // Coluna Resultado, apenas fora da Aba 1
        const vitoria = row[13] === '1';
        const derrota = row[14] === '1';
        const empate = row[15] === '1';
        const conditions = [vitoria, derrota, empate].filter(Boolean).length;
        let resultado = '';
        if (conditions === 1) {
          if (vitoria) resultado = 'Vitória';
          else if (derrota) resultado = 'Derrota';
          else if (empate) resultado = 'Empate';
        }
        td.textContent = resultado;
      } else if (colIndex === 2) { // Coluna Horário
        td.textContent = formatTime(row[colIndex]) || '';
      } else {
        td.textContent = row[colIndex] || '';
      }
      td.className = 'p-2 border';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  console.log(`Tabela transformada para formato PIVOT (${tabId})`);
}

function filterData(data, filters, tabId) {
  console.log('Aplicando filtros:', filters, 'para aba:', tabId);

  return data.slice(1).filter((row, index) => {
    if (!row || row.length < 17) {
      console.log(`Linha ${index + 2} inválida:`, row);
      return false;
    }

    const [
      campeonato, dataStr, horario, ginasio, mandante, placar1, placar2, visitante, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate, considerar
    ] = row;

    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    // Para a Aba 1, apenas linhas onde o campo Q (considerar) seja "x" (case-insensitive)
    const isValidConsiderar = tabId === 'tab1'
      ? considerarValue.toLowerCase() === 'x'
      : considerarValue !== '0';
    console.log(`Linha ${index + 2}: Placar1=${placar1 || 'vazio'}, Considerar=${considerarValue || 'vazio'}, isValidConsiderar=${isValidConsiderar}, Incluída=${isValidConsiderar}`);

    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
    const dataJogo = dataStr ? new Date(dataStr.split('/').reverse().join('-')) : null;

    let resultado = '';
    if (vitoria === '1') resultado = 'Vitória';
    else if (derrota === '1') resultado = 'Derrota';
    else if (empate === '1') resultado = 'Empate';

    return (
      isValidConsiderar &&
      (!filters.campeonato || campeonato === filters.campeonato) &&
      (!dataInicio || (dataJogo && dataJogo >= dataInicio)) &&
      (!dataFim || (dataJogo && dataJogo <= dataFim)) &&
      (!filters.ginasio || ginasio === filters.ginasio) &&
      (!filters.time || mandante === filters.time || visitante === filters.time) &&
      (!filters.local || local === filters.local) &&
      (!filters.rodada || rodada === filters.rodada) &&
      (!filters.diaSemana || diaSemana === filters.diaSemana) &&
      (!filters.gol || gol === filters.gol) &&
      (!filters.assistencias || assistencias === filters.assistencias) &&
      (!filters.resultado || resultado === filters.resultado)
    );
  });
}

function displayTab1() { // Jogos
  const filters = {
    campeonato: document.getElementById('campeonato-tab1').value,
    dataInicio: document.getElementById('dataInicio-tab1').value,
    dataFim: document.getElementById('dataFim-tab1').value
  };
  filteredDataTab1 = filterData(allData, filters, 'tab1');
  if (isPivotTab1) {
    pivotTable(allData, filteredDataTab1, 'tab1');
    document.getElementById('pivotMode-tab1').textContent = 'Tabela';
  } else {
    displayData(allData, filteredDataTab1, 'tab1');
    document.getElementById('pivotMode-tab1').textContent = 'Pivot';
  }
}

function displayTab2() { // Tabela
  const filters = {
    campeonato: document.getElementById('campeonato-tab2').value,
    dataInicio: document.getElementById('dataInicio-tab2').value,
    dataFim: document.getElementById('dataFim-tab2').value,
    ginasio: document.getElementById('ginasio-tab2').value,
    time: document.getElementById('time-tab2').value,
    local: document.getElementById('local-tab2').value,
    rodada: document.getElementById('rodada-tab2').value,
    diaSemana: document.getElementById('diaSemana-tab2').value,
    gol: document.getElementById('gol-tab2').value,
    assistencias: document.getElementById('assistencias-tab2').value,
    resultado: document.getElementById('resultado-tab2').value
  };
  filteredDataTab2 = filterData(allData, filters, 'tab2');
  if (isPivotTab2) {
    pivotTable(allData, filteredDataTab2, 'tab2');
    document.getElementById('pivotMode-tab2').textContent = 'Tabela';
  } else {
    displayData(allData, filteredDataTab2, 'tab2');
    document.getElementById('pivotMode-tab2').textContent = 'Pivot';
  }
}

function displayTab3() { // Resumo
  filteredDataTab3 = allData.slice(1); // Sem filtros
  updateBigNumbers(filteredDataTab3, 'tab3');
}

function clearFilters() {
  const tabs = ['tab1', 'tab2']; // Removido tab3 (Resumo), pois não tem filtros
  tabs.forEach(tab => {
    document.getElementById(`campeonato-${tab}`).value = '';
    document.getElementById(`dataInicio-${tab}`).value = '';
    document.getElementById(`dataFim-${tab}`).value = '';
    if (tab !== 'tab1') {
      document.getElementById(`ginasio-${tab}`).value = '';
      document.getElementById(`time-${tab}`).value = '';
      document.getElementById(`local-${tab}`).value = '';
      document.getElementById(`rodada-${tab}`).value = '';
      document.getElementById(`diaSemana-${tab}`).value = '';
      document.getElementById(`gol-${tab}`).value = '';
      document.getElementById(`assistencias-${tab}`).value = '';
      document.getElementById(`resultado-${tab}`).value = '';
    }
  });
  isPivotTab1 = false;
  isPivotTab2 = false;
}

function showTab(tabId) {
  console.log(`Trocando para aba ${tabId}`);
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

// Aba 1: Jogos
document.getElementById('aplicarFiltros-tab1').addEventListener('click', () => {
  console.log('Aplicando filtros (Tab 1)');
  displayTab1();
});

document.getElementById('limparFiltros-tab1').addEventListener('click', () => {
  console.log('Limpando filtros (Tab 1)');
  document.getElementById('campeonato-tab1').value = '';
  document.getElementById('dataInicio-tab1').value = '';
  document.getElementById('dataFim-tab1').value = '';
  isPivotTab1 = false;
  displayTab1();
});

document.getElementById('pivotMode-tab1').addEventListener('click', () => {
  console.log('Botão Pivot clicado (Tab 1)');
  isPivotTab1 = !isPivotTab1;
  displayTab1();
});

// Aba 2: Tabela
document.getElementById('aplicarFiltros-tab2').addEventListener('click', () => {
  console.log('Aplicando filtros (Tab 2)');
  displayTab2();
});

document.getElementById('limparFiltros-tab2').addEventListener('click', () => {
  console.log('Limpando filtros (Tab 2)');
  document.getElementById('campeonato-tab2').value = '';
  document.getElementById('dataInicio-tab2').value = '';
  document.getElementById('dataFim-tab2').value = '';
  document.getElementById('ginasio-tab2').value = '';
  document.getElementById('time-tab2').value = '';
  document.getElementById('local-tab2').value = '';
  document.getElementById('rodada-tab2').value = '';
  document.getElementById('diaSemana-tab2').value = '';
  document.getElementById('gol-tab2').value = '';
  document.getElementById('assistencias-tab2').value = '';
  document.getElementById('resultado-tab2').value = '';
  isPivotTab2 = false;
  displayTab2();
});

document.getElementById('pivotMode-tab2').addEventListener('click', () => {
  console.log('Botão Pivot clicado (Tab 2)');
  isPivotTab2 = !isPivotTab2;
  displayTab2();
});

async function init() {
  console.log('Inicializando aplicação');
  try {
    allData = await fetchSheetData();
    if (allData.length === 0) {
      console.error('Nenhum dado retornado');
      showError('Nenhum dado disponível. Verifique a conexão, chave API ou planilha.');
      return;
    }
    populateFilters(allData);

    const tab1Btn = document.getElementById('tab1-btn');
    const tab2Btn = document.getElementById('tab2-btn');
    const tab3Btn = document.getElementById('tab3-btn');

    if (!tab1Btn || !tab2Btn || !tab3Btn) {
      console.error('Botões de navegação não encontrados:', { tab1Btn, tab2Btn, tab3Btn });
      showError('Erro interno: botões de navegação não encontrados.');
      return;
    }

    tab1Btn.addEventListener('click', () => {
      console.log('Clique no botão da Aba 1');
      showTab('tab1');
    });
    tab2Btn.addEventListener('click', () => {
      console.log('Clique no botão da Aba 2');
      showTab('tab2');
    });
    tab3Btn.addEventListener('click', () => {
      console.log('Clique no botão da Aba 3');
      showTab('tab3');
    });

    showTab('tab1');
  } catch (error) {
    console.error('Erro na inicialização:', error.message);
    showError(`Erro na inicialização: ${error.message}`);
  }
}

init();