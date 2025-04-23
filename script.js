const API_KEY = 'AIzaSyB7mXFld0FYeZzr_0zNptLKxu2Sn3CEH2w';
const SPREADSHEET_ID = '1XAI5jFEFeXic73aFvOXYMs70SixhKlVhEriJup2G2FA';

async function fetchSheetData() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/Sheet1!A1:P1000?key=${API_KEY}`;
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
    { id: 'mandante', index: 4 },
    { id: 'visitante', index: 6 },
    { id: 'local', index: 8 },
    { id: 'rodada', index: 9 },
    { id: 'diaSemana', index: 10 }
  ];

  filters.forEach(filter => {
    const select = document.getElementById(filter.id);
    const values = [...new Set(data.slice(1).map(row => row[filter.index]))].filter(v => v);
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
    const [campeonato, dataStr, horario, ginasio, mandante, placar1, visitante, placar2, local, rodada, diaSemana, gol, assistencias, vitoria, derrota, empate] = row;
    const data = new Date(dataStr.split('/').reverse().join('-'));
    const dataInicio = filters.dataInicio ? new Date(filters.dataInicio) : null;
    const dataFim = filters.dataFim ? new Date(filters.dataFim) : null;

    return (
      (!filters.campeonato || campeonato === filters.campeonato) &&
      (!dataInicio || data >= dataInicio) &&
      (!dataFim || data <= dataFim) &&
      (!filters.horario || horario.includes(filters.horario)) &&
      (!filters.ginasio || ginasio.includes(filters.ginasio)) &&
      (!filters.mandante || mandante === filters.mandante) &&
      (!filters.visitante || visitante === filters.visitante) &&
      (!filters.local || local === filters.local) &&
      (!filters.rodada || rodada === filters.rodada) &&
      (!filters.diaSemana || diaSemana === filters.diaSemana) &&
      (!filters.gol || gol === filters.gol) &&
      (!filters.assistencias || assistencias === filters.assistencias) &&
      (!filters.vitoria || vitoria === filters.vitoria) &&
      (!filters.empate || empate === filters.empate)
    );
  });

  filteredData.forEach(row => {
    const tr = document.createElement('tr');
    row.forEach(cell => {
      const td = document.createElement('td');
      td.textContent = cell;
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
    horario: document.getElementById('horario').value,
    ginasio: document.getElementById('ginasio').value,
    mandante: document.getElementById('mandante').value,
    visitante: document.getElementById('visitante').value,
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

async function init() {
  const data = await fetchSheetData();
  populateFilters(data);
  displayData(data);
}

init();