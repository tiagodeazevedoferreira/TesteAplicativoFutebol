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

function displayData(data, filters = {}) {
  console.log('Exibindo dados com filtros:', filters);
  clearError();
  const tbody = document.getElementById('jogosBody');
  if (!tbody) {
    console.error('Elemento #jogosBody não encontrado');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';

  const filteredData = filterData(data, filters);
  console.log('Total de linhas filtradas:', filteredData.length);
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }

  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    row.slice(0, 16).forEach((cell, index) => {
      const td = document.createElement('td');
      td.textContent = cell || '';
      td.className = 'p-2 border';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function pivotTable(data) {
  console.log("Transformando tabela para formato PIVOT");

  const tbody = document.getElementById('jogosBody');
  if (!tbody) {
    console.error('Elemento #jogosBody não encontrado');
    showError('Erro interno: tabela não encontrada.');
    return;
  }
  tbody.innerHTML = '';

  const headers = data[0];
  headers.forEach((header, colIndex) => {
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.textContent = header;
    th.className = 'p-2 border bg-gray-200';
    tr.appendChild(th);

    data.slice(1).forEach(row => {
      const td = document.createElement('td');
      td.textContent = row[colIndex] || '';
      td.className = 'p-2 border';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  console.log("Tabela transformada para formato PIVOT");
}

function filterData(data, filters) {
  console.log('Aplicando filtros:', filters);

  return data.slice(1).filter(row => {
    const [
      campeonato, dataStr, , ginasio, mandante, , , visitante, local, rodada, diaSemana, gol, assistencias, vitoria, , empate
    ] = row;

    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;
    const dataJogo = dataStr ? new Date(dataStr.split('/').reverse().join('-')) : null;

    return (
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
  isPivot = !isPivot;
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
  if (data.length > 0) {
    const filteredData = filterData(data, filters);
    if (isPivot) {
      pivotTable(filteredData);
      document.getElementById('pivotMode').textContent = 'Voltar ao modo Tabela';
    } else {
      displayData(filteredData);
      document.getElementById('pivotMode').textContent = 'Alternar para PIVOT';
    }
  }
});

init();
