console.log('script.js iniciado');

const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

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

  const timeSelect = document.getElementById('time');
  if (!timeSelect) {
    console.error('Elemento #time não encontrado');
    showError('Erro interno: elemento de filtro não encontrado.');
    return;
  }
  const mandantes = data.slice(1).map(row => row[4]?.trim()).filter(v => v);
  const visitantes = data.slice(1).map(row => row[7]?.trim()).filter(v => v);
  const times = [...new Set([...mandantes, ...visitantes])].sort();
  times.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    timeSelect.appendChild(option);
  });

  filters.forEach(filter => {
    const select = document.getElementById(filter.id);
    if (!select) {
      console.error(`Elemento #${filter.id} não encontrado`);
      return;
    }
    const values = [...new Set(data.slice(1).map(row => row[filter.index]?.trim()).filter(v => v))].sort();
    values.forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  });
}

function updateBigNumbers(data) {
  console.log('Atualizando Big Numbers');
  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;

  data.forEach(row => {
    const placar1 = row[5]; // Coluna F
    const considerar = row[16]; // Coluna Q
    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    const isValidConsiderar = considerarValue !== '0';
    const isValidPlacar1 = placar1 && placar1.trim() !== '';

    if (isValidConsiderar && isValidPlacar1) {
      jogos++;
    }
    if (isValidConsiderar) {
      if (row[11] && !isNaN(parseInt(row[11]))) {
        gols += parseInt(row[11]); // Coluna L
      }
      if (row[12] && !isNaN(parseInt(row[12]))) {
        assistencias += parseInt(row[12]); // Coluna M
      }
      vitorias += row[13] ? parseInt(row[13]) : 0; // Coluna N
      derrotas += row[14] ? parseInt(row[14]) : 0; // Coluna O
      empates += row[15] ? parseInt(row[15]) : 0; // Coluna P
    }
  });

  const media = jogos > 0 ? (gols / jogos).toFixed(2) : '0.00';
  const golACada = jogos > 0 && gols > 0 ? (jogos / gols).toFixed(2) : '0.00';

  document.getElementById('bigNumberJogos').textContent = jogos;
  document.getElementById('bigNumberGols').textContent = gols;
  document.getElementById('bigNumberAssistencias').textContent = assistencias;
  document.getElementById('bigNumberVitorias').textContent = vitorias;
  document.getElementById('bigNumberEmpates').textContent = empates;
  document.getElementById('bigNumberDerrotas').textContent = derrotas;
  document.getElementById('bigNumberMedia').textContent = media;
  document.getElementById('bigNumberGolACada').textContent = golACada;

  console.log('Big Numbers atualizados:', { jogos, gols, media, assistencias, golACada, vitorias, empates, derrotas });
}

let sortConfig = { column: null, direction: 'asc' };

function sortData(data, columnIndex, direction) {
  const sortedData = [...data];
  sortedData.sort((a, b) => {
    let valueA = a[columnIndex] || '';
    let valueB = b[columnIndex] || '';

    // Ordenação por data (índice 1 - Data)
    if (columnIndex === 1) {
      valueA = valueA ? new Date(valueA.split('/').reverse().join('-')) : new Date(0);
      valueB = valueB ? new Date(valueB.split('/').reverse().join('-')) : new Date(0);
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }

    // Ordenação por números (índices 11, 12 - Gol, Assistências)
    if (columnIndex === 11 || columnIndex === 12) {
      valueA = parseInt(valueA) || 0;
      valueB = parseInt(valueB) || 0;
      return direction === 'asc' ? valueA - valueB : valueB - valueA;
    }

    // Ordenação por texto (outros campos)
    valueA = valueA.toString().toLowerCase();
    valueB = valueB.toString().toLowerCase();
    return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
  });
  return sortedData;
}

function displayData(data, filteredData) {
  console.log('Exibindo dados (modo tabela normal)');
  clearError();
  const tbody = document.getElementById('jogosBody');
  const thead = document.getElementById('tableHead');
  if (!tbody || !thead) {
    console.error('Elementos #jogosBody ou #tableHead não encontrados');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';
  thead.innerHTML = '';

  // Configurar cabeçalho da tabela normal
  const trHead = document.createElement('tr');
  trHead.className = 'bg-gray-200';
  const headers = ['Campeonato', 'Data', 'Horário', 'Ginásio', 'Mandante', '', '', 'Visitante', 'Local', 'Rodada', 'Dia da Semana', 'Gol', 'Assistências', 'Vitória', 'Derrota', 'Empate'];
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
      sortConfig = { column: index, direction: newDirection };
      const sortedData = sortData(filteredData, index, newDirection);
      displayData(data, sortedData);
      console.log(`Ordenando por coluna ${text} (${index}) em ordem ${newDirection}`);
    });
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  console.log('Total de linhas filtradas (tabela normal):', filteredData.length);
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }

  filteredData.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    // Validação dos dados: Verificar se mais de uma condição é verdadeira
    const vitoria = row[13] === '1';
    const derrota = row[14] === '1';
    const empate = row[15] === '1';
    const conditions = [vitoria, derrota, empate].filter(Boolean).length;
    if (conditions > 1) {
      console.warn(`Inconsistência nos dados da linha ${rowIndex + 2}: Vitória=${row[13]}, Derrota=${row[14]}, Empate=${row[15]}`);
    }

    // Destaque visual baseado em Vitória, Derrota, Empate (condições independentes)
    if (vitoria) {
      tr.classList.add('victory-row');
    }
    if (derrota) {
      tr.classList.add('defeat-row');
    }
    if (empate) {
      tr.classList.add('draw-row');
    }

    row.slice(0, 16).forEach((cell, index) => {
      const td = document.createElement('td');
      if (index === 13 || index === 14 || index === 15) {
        td.textContent = cell === '1' ? 'Sim' : '';
      } else {
        td.textContent = cell || '';
      }
      td.className = 'p-2 border';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  updateBigNumbers(filteredData);
}

function pivotTable(data, filteredData) {
  console.log("Transformando tabela para formato PIVOT");
  clearError();
  const tbody = document.getElementById('jogosBody');
  const thead = document.getElementById('tableHead');
  if (!tbody || !thead) {
    console.error('Elementos #jogosBody ou #tableHead não encontrados');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';
  thead.innerHTML = '';

  // Configurar cabeçalho para PIVOT
  const trHead = document.createElement('tr');
  trHead.className = 'bg-gray-200';
  ['', ''].forEach((_, index) => {
    const th = document.createElement('th');
    th.textContent = index === 0 ? 'Coluna' : 'Valores';
    th.className = 'p-2';
    trHead.appendChild(th);
  });
  thead.appendChild(trHead);

  const headers = data[0].slice(0, 16); // Excluir Considerar (índice 16)
  console.log('Cabeçalho para PIVOT:', headers);

  headers.forEach((header, colIndex) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = header;
    th.className = 'p-2 border bg-gray-200';
    tr.appendChild(th);

    filteredData.forEach(row => {
      const td = document.createElement('td');
      const cellValue = colIndex === 13 || colIndex === 14 || colIndex === 15 ? (row[colIndex] === '1' ? 'Sim' : '') : (row[colIndex] || '');
      td.textContent = cellValue;
      td.className = 'p-2 border';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  console.log("Tabela transformada para formato PIVOT");
  updateBigNumbers(filteredData);
}

function filterData(data, filters) {
  console.log('Aplicando filtros:', filters);

  return data.slice(1).filter((row, index) => {
    if (!row || row.length < 17) {
      console.log(`Linha ${index + 2} inválida:`, row);
      return false;
    }

    const [
      campeonato, dataStr, horario, ginasio, mandante, placar1, placar2, visitante, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate, considerar
    ] = row;

    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    const isValidConsiderar = considerarValue !== '0';
    console.log(`Linha ${index + 2}: Placar1=${placar1 || 'vazio'}, Considerar=${considerarValue || 'vazio'}, isValidConsiderar=${isValidConsiderar}, Incluída=${isValidConsiderar}`);

    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
    const dataJogo = dataStr ? new Date(dataStr.split('/').reverse().join('-')) : null;

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
      (!filters.vitoria || vitoria === filters.vitoria) &&
      (!filters.empate || empate === filters.empate)
    );
  });
}

let isPivot = false;
document.getElementById('pivotMode').addEventListener('click', async () => {
  console.log('Botão PIVOT clicado');
  isPivot = !isPivot;
  try {
    const filters = {
      campeonato: document.getElementById('campeonato').value,
      dataInicio: document.getElementById('dataInicio').value,
      dataFim: document.getElementById('dataFim').value,
      ginasio: document.getElementById('ginasio').value,
      time: document.getElementById('time').value,
      local: document.getElementById('local').value,
      rodada: document.getElementById('rodada').value,
      diaSemana: document.getElementById('diaSemana').value,
      gol: document.getElementById('gol').value,
      assistencias: document.getElementById('assistencias').value,
      vitoria: document.getElementById('vitoria').value,
      empate: document.getElementById('empate').value
    };

    const data = await fetchSheetData();
    if (data.length === 0) {
      showError('Nenhum dado disponível para exibir.');
      return;
    }

    const filteredData = filterData(data, filters);
    if (isPivot) {
      pivotTable(data, filteredData);
      document.getElementById('pivotMode').textContent = 'Voltar ao modo Tabela';
    } else {
      displayData(data, filteredData);
      document.getElementById('pivotMode').textContent = 'Alternar para PIVOT';
    }
  } catch (error) {
    console.error('Erro ao alternar modo:', error.message);
    showError(`Erro ao alternar modo: ${error.message}`);
  }
});

document.getElementById('aplicarFiltros').addEventListener('click', async () => {
  console.log('Aplicando filtros');
  try {
    const filters = {
      campeonato: document.getElementById('campeonato').value,
      dataInicio: document.getElementById('dataInicio').value,
      dataFim: document.getElementById('dataFim').value,
      ginasio: document.getElementById('ginasio').value,
      time: document.getElementById('time').value,
      local: document.getElementById('local').value,
      rodada: document.getElementById('rodada').value,
      diaSemana: document.getElementById('diaSemana').value,
      gol: document.getElementById('gol').value,
      assistencias: document.getElementById('assistencias').value,
      vitoria: document.getElementById('vitoria').value,
      empate: document.getElementById('empate').value
    };

    const data = await fetchSheetData();
    if (data.length === 0) {
      showError('Nenhum dado disponível para exibir.');
      return;
    }

    const filteredData = filterData(data, filters);
    if (isPivot) {
      pivotTable(data, filteredData);
    } else {
      displayData(data, filteredData);
    }
  } catch (error) {
    console.error('Erro ao aplicar filtros:', error.message);
    showError(`Erro ao aplicar filtros: ${error.message}`);
  }
});

document.getElementById('limparFiltros').addEventListener('click', async () => {
  console.log('Limpando filtros');
  try {
    document.getElementById('campeonato').value = '';
    document.getElementById('dataInicio').value = '';
    document.getElementById('dataFim').value = '';
    document.getElementById('ginasio').value = '';
    document.getElementById('time').value = '';
    document.getElementById('local').value = '';
    document.getElementById('rodada').value = '';
    document.getElementById('diaSemana').value = '';
    document.getElementById('gol').value = '';
    document.getElementById('assistencias').value = '';
    document.getElementById('vitoria').value = '';
    document.getElementById('empate').value = '';

    const data = await fetchSheetData();
    if (data.length === 0) {
      showError('Nenhum dado disponível para exibir.');
      return;
    }

    const filteredData = filterData(data, {});
    if (isPivot) {
      pivotTable(data, filteredData);
    } else {
      displayData(data, filteredData);
    }
  } catch (error) {
    console.error('Erro ao limpar filtros:', error.message);
    showError(`Erro ao limpar filtros: ${error.message}`);
  }
});

async function init() {
  console.log('Inicializando aplicação');
  try {
    const data = await fetchSheetData();
    if (data.length === 0) {
      console.error('Nenhum dado retornado');
      showError('Nenhum dado disponível. Verifique a conexão, chave API ou planilha.');
      return;
    }
    populateFilters(data);
    const filteredData = filterData(data, {});
    displayData(data, filteredData);
  } catch (error) {
    console.error('Erro na inicialização:', error.message);
    showError(`Erro na inicialização: ${error.message}`);
  }
}

init();