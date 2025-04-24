const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:R1000?key=${API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.values || [];
  } catch (error) {
    console.error('Erro ao buscar dados:', error);
    return [];
  }
}

function populateFilters(data) {
  const filters = [
    { id: 'campeonato', index: 0 },
    { id: 'ginasio', index: 3 },
    { id: 'local', index: 8 },
    { id: 'rodada', index: 9 },
    { id: 'diaSemana', index: 10 },
    { id: 'gol', index: 11 },
    { id: 'assistencias', index: 12 }
  ];

  // Filtro Time (combina Mandante e Visitante)
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

  // Outros filtros
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
  const tbody = document.getElementById('jogosBody');
  tbody.innerHTML = '';

  const filteredData = data.slice(1).filter(row => {
    const [campeonato, dataStr, horario, ginasio, mandante, placar1, placar2, visitante, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate, considerar, colunaR] = row;
    const data = new Date(dataStr.split('/').reverse().join('-'));
    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;

    // Verificar filtros R e Considerar com condições robustas
    const isValidR = row[17] && row[17].trim() !== '0' && row[17].trim() !== '';
    const isValidConsiderar = row[16] && row[16].trim() !== '0' && row[16].trim() !== '';

    // Log temporário para debugging
    if (isValidR && isValidConsiderar && placar1 && placar1.trim() !== '') {
      console.log(`Linha incluída: Placar1=${placar1}, R=${row[17]}, Considerar=${row[16]}`);
    }

    return (
      isValidR &&
      isValidConsiderar &&
      (!filters.campeonato || campeonato === filters.campeonato) &&
      (!dataInicio || data >= dataInicio) &&
      (!dataFim || data <= dataFim) &&
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

  // Calcular Big Numbers
  let jogos = 0, gols = 0, assistencias = 0, vitorias = 0, empates = 0, derrotas = 0;
  filteredData.forEach(row => {
    if (row[5] && row[5].trim() !== '') {
      jogos++; // Conta jogos onde Placar1 (coluna F) está preenchido
    }
    if (row[11] && !isNaN(parseInt(row[11]))) {
      gols += parseInt(row[11]); // Soma apenas se Gol está preenchido e é numérico
    }
    if (row[12] && !isNaN(parseInt(row[12]))) {
      assistencias += parseInt(row[12]); // Soma apenas se Assistências está preenchido e é numérico
    }
    vitorias += row[13] ? parseInt(row[13]) : 0;
    derrotas += row[14] ? parseInt(row[14]) : 0;
    empates += row[15] ? parseInt(row[15]) : 0;
  });

  // Calcular Média de Gols (Gols / Jogos) e Gol a Cada (Jogos / Gols)
  const media = jogos > 0 ? (gols / jogos).toFixed(2) : '0.00';
  const golACada = jogos > 0 && gols > 0 ? (jogos / gols).toFixed(2) : '0.00';

  // Atualizar Big Numbers na interface
  document.getElementById('bigNumberJogos').textContent = jogos;
  document.getElementById('bigNumberGols').textContent = gols;
  document.getElementById('bigNumberAssistencias').textContent = assistencias;
  document.getElementById('bigNumberVitorias').textContent = vitorias;
  document.getElementById('bigNumberEmpates').textContent = empates;
  document.getElementById('bigNumberDerrotas').textContent = derrotas;
  document.getElementById('bigNumberMedia').textContent = media;
  document.getElementById('bigNumberGolACada').textContent = golACada;

  // Preencher tabela
  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    row.slice(0, 16).forEach((cell, index) => { // Exibir apenas colunas A a P
      const td = document.createElement('td');
      if (index === 13 || index === 14 || index === 15) {
        td.textContent = cell === '1' ? 'Sim' : '';
      } else {
        td.textContent = cell;
      }
      td.className = 'p-2 border';
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

document.getElementById('aplicarFiltros').addEventListener('click', async () => {
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
  displayData(data, filters);
});

document.getElementById('limparFiltros').addEventListener('click', () => {
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
  fetchSheetData().then(data => displayData(data));
});

async function init() {
  const data = await fetchSheetData();
  populateFilters(data);
  displayData(data);
}

init();