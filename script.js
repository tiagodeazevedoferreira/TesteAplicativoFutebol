console.log('script.js iniciado');

const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

// Variáveis globais para armazenar dados
let allData = [];
let filteredData = [];
let isPivot = false;
let currentFilters = {};

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
    allData = data.values;
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

function applyFilters(data, filters) {
  console.log('Aplicando filtros:', filters);
  
  return data.slice(1).filter((row, index) => {
    if (!row || row.length < 17) {
      console.log(`Linha ${index + 2} inválida:`, row);
      return false;
    }
    
    const [campeonato, dataStr, horario, ginasio, mandante, placar1, placar2, visitante, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate, considerar] = row;
    const data = dataStr ? new Date(dataStr.split('/').reverse().join('-')) : null;
    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;

    // Normalizar o valor de considerar
    const considerarValue = considerar !== undefined && considerar !== null ? String(considerar).trim() : '';
    const isValidConsiderar = considerarValue !== '0';

    console.log(`Linha ${index + 2}: Placar1=${placar1 || 'vazio'}, Considerar=${considerarValue || 'vazio'}, isValidConsiderar=${isValidConsiderar}, Incluída=${isValidConsiderar}`);

    return (
      isValidConsiderar &&
      (!filters.campeonato || campeonato === filters.campeonato) &&
      (!dataInicio || (data && data >= dataInicio)) &&
      (!dataFim || (data && data <= dataFim)) &&
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

function updateBigNumbers(filteredData) {
  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;
  
  filteredData.forEach(row => {
    const placar1 = row[5];
    const isValidPlacar1 = placar1 && placar1.trim() !== '';
    if (isValidPlacar1) {
      jogos++;
    }
    if (row[11] && !isNaN(parseInt(row[11]))) {
      gols += parseInt(row[11]);
    }
    if (row[12] && !isNaN(parseInt(row[12]))) {
      assistencias += parseInt(row[12]);
    }
    vitorias += row[13] ? parseInt(row[13]) : 0;
    derrotas += row[14] ? parseInt(row[14]) : 0;
    empates += row[15] ? parseInt(row[15]) : 0;
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
}

function displayData(data, filters = {}) {
  console.log('Exibindo dados com filtros:', filters);
  clearError();
  
  // Aplicar filtros
  filteredData = applyFilters(data, filters);
  console.log('Total de linhas filtradas:', filteredData.length);
  
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }
  
  // Atualizar estatísticas
  updateBigNumbers(filteredData);
  
  // Se estiver no modo PIVOT, exibir como PIVOT
  if (isPivot) {
    pivotTable(data[0], filteredData);
    return;
  }
  
  // Caso contrário, exibir como tabela normal
  const tbody = document.getElementById('jogosBody');
  if (!tbody) {
    console.error('Elemento #jogosBody não encontrado');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';

  filteredData.forEach(row => {
    const tr = document.createElement('tr');
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
}

function pivotTable(headers, data) {
  console.log("Transformando tabela para formato PIVOT com", data.length, "linhas filtradas");

  // Selecionar o corpo da tabela
  const tbody = document.getElementById('jogosBody');
  if (!tbody) {
    console.error('Elemento #jogosBody não encontrado');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';

  // Iterar pelas colunas e criar uma linha para cada uma
  headers.forEach((header, colIndex) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = header;
    th.className = 'p-2 border bg-gray-200';
    tr.appendChild(th);

    // Adicionar valores de cada linha correspondente ao cabeçalho
    data.forEach(row => {
      const td = document.createElement('td');
      // Verificar se é uma coluna de vitória/derrota/empate
      if (colIndex === 13 || colIndex === 14 || colIndex === 15) {
        td.textContent = row[colIndex] === '1' ? 'Sim' : '';
      } else {
        td.textContent = row[colIndex] || ''; // Valor ou vazio
      }
      td.className = 'p-2 border';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  console.log("Tabela transformada para formato PIVOT");
}

// Event Listeners
document.getElementById('aplicarFiltros').addEventListener('click', async () => {
  console.log('Aplicando filtros');
  currentFilters = {
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
  
  if (allData.length === 0) {
    const data = await fetchSheetData();
    if (data.length > 0) {
      displayData(data, currentFilters);
    }
  } else {
    displayData(allData, currentFilters);
  }
});

document.getElementById('limparFiltros').addEventListener('click', async () => {
  console.log('Limpando filtros');
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
  
  currentFilters = {};
  
  if (allData.length === 0) {
    const data = await fetchSheetData();
    if (data.length > 0) {
      displayData(data);
    }
  } else {
    displayData(allData);
  }
});

document.getElementById('pivotMode').addEventListener('click', async () => {
  isPivot = !isPivot; // Alternar estado
  
  if (isPivot) {
    document.getElementById('pivotMode').textContent = 'Voltar ao modo Tabela';
    document.getElementById('pivotMode').classList.remove('bg-green-500');
    document.getElementById('pivotMode').classList.add('bg-blue-500');
  } else {
    document.getElementById('pivotMode').textContent = 'Alternar para PIVOT';
    document.getElementById('pivotMode').classList.remove('bg-blue-500');
    document.getElementById('pivotMode').classList.add('bg-green-500');
  }
  
  if (allData.length === 0) {
    const data = await fetchSheetData();
    if (data.length > 0) {
      displayData(data, currentFilters);
    }
  } else {
    displayData(allData, currentFilters);
  }
});

// Inicialização
async function init() {
  console.log('Inicializando aplicação');
  const data = await fetchSheetData();
  if (data.length === 0) {
    console.error('Nenhum dado retornado');
    showError('Nenhum dado disponível. Verifique a conexão, chave API ou planilha.');
    return;
  }
  populateFilters(data);
  displayData(data);
}

init();