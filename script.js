const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:R1000?key=${API_KEY}`;
  console.log('Buscando dados:', url);
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
    }
    const data = await response.json();
    console.log('Dados brutos:', data);
    if (!data.values || data.values.length === 0) {
      throw new Error('Nenhum dado retornado da planilha');
    }
    console.log('Linhas recebidas:', data.values.length);
    return data.values;
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    showError(`Erro ao carregar dados: ${error.message}. Verifique se a planilha está pública, a chave API está correta e o ID da planilha é válido.`);
    return [];
  }
}

function showError(message) {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}

function clearError() {
  const errorDiv = document.getElementById('errorMessage');
  errorDiv.textContent = '';
  errorDiv.style.display = 'none';
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
  tbody.innerHTML = '';

  const filteredData = data.slice(1).filter((row, index) => {
    if (!row || row.length < 17) {
      console.log(`Linha ${index + 2} inválida:`, row);
      return false;
    }
    const [campeonato, dataStr, horario, ginasio, mandante, placar1, placar2, visitante, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate, considerar] = row;
    const data = dataStr ? new Date(dataStr.split('/').reverse().join('-')) : null;
    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;

    const isValidConsiderar = String(considerar) !== '0';
    const isValidPlacar1 = placar1 && placar1.trim() !== '';

    if (isValidConsiderar && isValidPlacar1) {
      console.log(`Linha ${index + 2} incluída: Placar1=${placar1}, Considerar=${considerar || 'nulo'}`);
    } else {
      console.log(`Linha ${index + 2} excluída: Placar1=${placar1}, Considerar=${considerar || 'nulo'}`);
    }

    return (
      isValidConsiderar &&
      isValidPlacar1 &&
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

  console.log('Linhas filtradas:', filteredData.length);
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }

  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;
  filteredData.forEach(row => {
    if (row[5] && row[5].trim() !== '') {
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
      tr.appendChild(tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

document.getElementById('aplicarFiltros').addEventListener('click', async () => {
  console.log('Aplicando filtros');
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
    displayData(data, filters);
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
  const data = await fetchSheetData();
  if (data.length > 0) {
    displayData(data);
  }
});

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