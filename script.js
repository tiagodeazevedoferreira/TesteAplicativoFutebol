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

  // Logar todas as linhas recebidas para depuração
  console.log('Processando linhas recebidas:', data.slice(1).length);
  data.slice(1).forEach((row, index) => {
    const considerar = row[16];
    const placar1 = row[5];
    console.log(`Linha ${index + 2} (bruta): Placar1=${placar1 || 'vazio'}, Considerar=${considerar || 'vazio'}`);
  });

  const filteredData = data.slice(1).filter((row, index) => {
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

  console.log('Total de linhas filtradas:', filteredData.length);
  if (filteredData.length === 0) {
    showError('Nenhum jogo encontrado com os filtros aplicados ou dados não carregados.');
  }

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

// Complemento ao script.js - Sistema de Lembretes Programados

// Função para converter string de data e hora para objeto Date
function converterParaData(dataStr, horaStr) {
    // Formato esperado: "DD/MM/YYYY" para data e "HH:MM" para hora
    const [dia, mes, ano] = dataStr.split('/').map(Number);
    const [hora, minuto] = horaStr.split(':').map(Number);
    
    // Mês em JavaScript é 0-indexed (0 = Janeiro, 11 = Dezembro)
    return new Date(ano, mes - 1, dia, hora, minuto, 0);
}

// Função para calcular diferença de tempo em milissegundos
function calcularDiferencaTempo(dataJogo) {
    const agora = new Date();
    return dataJogo.getTime() - agora.getTime();
}

// Função para agendar lembretes para um jogo
function agendarLembretes(jogoId, timeA, timeB, dataStr, horaStr, opcoes) {
    // Converter strings de data e hora para objeto Date
    const dataJogo = converterParaData(dataStr, horaStr);
    
    // Salvar configurações de lembretes no localStorage
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '{}');
    lembretes[jogoId] = {
        timeA,
        timeB,
        data: dataStr,
        hora: horaStr,
        timestamp: dataJogo.getTime(),
        lembretes: opcoes
    };
    localStorage.setItem('lembretes', JSON.stringify(lembretes));
    
    // Verificar e configurar cada tipo de lembrete selecionado
    opcoes.forEach(opcao => {
        let tempoAntecedencia;
        let mensagem;
        
        switch(opcao) {
            case '24h':
                tempoAntecedencia = 24 * 60 * 60 * 1000; // 24 horas em ms
                mensagem = `O jogo ${timeA} vs ${timeB} acontecerá amanhã às ${horaStr}`;
                break;
            case '1h':
                tempoAntecedencia = 60 * 60 * 1000; // 1 hora em ms
                mensagem = `O jogo ${timeA} vs ${timeB} começará em 1 hora`;
                break;
            case '15min':
                tempoAntecedencia = 15 * 60 * 1000; // 15 minutos em ms
                mensagem = `O jogo ${timeA} vs ${timeB} começará em 15 minutos`;
                break;
        }
        
        // Calcular quando o lembrete deve ser disparado
        const tempoRestante = calcularDiferencaTempo(dataJogo) - tempoAntecedencia;
        
        // Só agendar se o tempo for positivo (no futuro)
        if (tempoRestante > 0) {
            // Para demonstração, usamos setTimeout - em um app real seria um service worker
            console.log(`Agendando lembrete ${opcao} para o jogo ${jogoId} em ${Math.floor(tempoRestante/1000)} segundos`);
            
            // Para fins de demonstração, reduziremos o tempo para ver a notificação mais rapidamente
            // Em um app real, você usaria o tempoRestante real
            const tempoSimulado = Math.min(tempoRestante, 10000) / 1000; // máximo 10 segundos para demo
            
            setTimeout(() => {
                enviarNotificacao(
                    `⚽ Lembrete: ${timeA} vs ${timeB}`,
                    {
                        body: mensagem,
                        icon: "/api/placeholder/60/60",
                        tag: `lembrete-${jogoId}-${opcao}`
                    }
                );
                
                // Registrar que o lembrete foi enviado
                console.log(`Lembrete ${opcao} enviado para o jogo ${jogoId}`);
                
                // Em um app real, você atualizaria o status no backend
            }, tempoSimulado * 1000); // Convertendo para milissegundos
        } else {
            console.log(`Tempo para lembrete ${opcao} já passou para o jogo ${jogoId}`);
        }
    });
}

// Função para cancelar lembretes
function cancelarLembretes(jogoId) {
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '{}');
    
    if (lembretes[jogoId]) {
        delete lembretes[jogoId];
        localStorage.setItem('lembretes', JSON.stringify(lembretes));
        console.log(`Lembretes cancelados para o jogo ${jogoId}`);
        return true;
    }
    return false;
}

// Função para abrir modal de configuração de lembretes
function abrirModalLembretes(jogoId, timeA, timeB, data, hora) {
    // Verificar primeiro se as notificações são permitidas
    if (verificarSuporteNotificacoes()) {
        if (Notification.permission !== "granted") {
            solicitarPermissaoNotificacao();
            return;
        }
    } else {
        return;
    }
    
    // Criar o modal
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'modal-lembretes';
    
    // Obter configurações atuais se existirem
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '{}');
    const lembreteAtual = lembretes[jogoId] || { lembretes: [] };
    
    // Conteúdo do modal
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>Lembretes para ${timeA} vs ${timeB}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <p>Selecione quando você deseja receber notificações:</p>
                
                <div class="opcoes-lembretes">
                    <label class="opcao-lembrete">
                        <input type="checkbox" name="lembrete" value="24h" ${lembreteAtual.lembretes.includes('24h') ? 'checked' : ''}>
                        <span class="lembrete-texto">24 horas antes</span>
                    </label>
                    
                    <label class="opcao-lembrete">
                        <input type="checkbox" name="lembrete" value="1h" ${lembreteAtual.lembretes.includes('1h') ? 'checked' : ''}>
                        <span class="lembrete-texto">1 hora antes</span>
                    </label>
                    
                    <label class="opcao-lembrete">
                        <input type="checkbox" name="lembrete" value="15min" ${lembreteAtual.lembretes.includes('15min') ? 'checked' : ''}>
                        <span class="lembrete-texto">15 minutos antes</span>
                    </label>
                </div>
                
                <div class="modal-info">
                    <p><i class="fas fa-calendar"></i> ${data} às ${hora}</p>
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-cancelar">Cancelar</button>
                <button class="btn btn-salvar">Salvar</button>
            </div>
        </div>
    `;
    
    // Adicionar o modal ao body
    document.body.appendChild(modal);
    
    // Mostrar o modal com animação
    setTimeout(() => {
        modal.classList.add('ativo');
    }, 10);
    
    // Eventos do modal
    const btnFechar = modal.querySelector('.modal-close');
    const btnCancelar = modal.querySelector('.btn-cancelar');
    const btnSalvar = modal.querySelector('.btn-salvar');
    
    // Função para fechar o modal
    function fecharModal() {
        modal.classList.remove('ativo');
        setTimeout(() => {
            document.body.removeChild(modal);
        }, 300);
    }
    
    // Eventos para fechar o modal
    btnFechar.addEventListener('click', fecharModal);
    btnCancelar.addEventListener('click', fecharModal);
    
    // Evento para salvar as configurações
    btnSalvar.addEventListener('click', () => {
        // Coletar opções selecionadas
        const checkboxes = modal.querySelectorAll('input[name="lembrete"]:checked');
        const opcoesSelecionadas = Array.from(checkboxes).map(cb => cb.value);
        
        if (opcoesSelecionadas.length > 0) {
            // Agendar os lembretes
            agendarLembretes(jogoId, timeA, timeB, data, hora, opcoesSelecionadas);
            
            // Atualizar o botão de lembrete
            const botaoLembrete = document.querySelector(`.btn-lembrete[data-id="${jogoId}"]`);
            if (botaoLembrete) {
                botaoLembrete.classList.add('ativo');
                botaoLembrete.innerHTML = '<i class="fas fa-clock"></i> Lembretes configurados';
            }
            
            // Mostrar confirmação
            alert(`Lembretes configurados para o jogo ${timeA} vs ${timeB}`);
        } else {
            // Se nenhuma opção selecionada, cancelar os lembretes
            if (cancelarLembretes(jogoId)) {
                // Atualizar o botão de lembrete
                const botaoLembrete = document.querySelector(`.btn-lembrete[data-id="${jogoId}"]`);
                if (botaoLembrete) {
                    botaoLembrete.classList.remove('ativo');
                    botaoLembrete.innerHTML = '<i class="far fa-clock"></i> Configurar lembretes';
                }
                
                alert(`Lembretes cancelados para o jogo ${timeA} vs ${timeB}`);
            }
        }
        
        fecharModal();
    });
    
    // Fechar modal ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            fecharModal();
        }
    });
}

// Função para verificar e atualizar todos os lembretes ao carregar a página
function verificarLembretesAgendados() {
    const lembretes = JSON.parse(localStorage.getItem('lembretes') || '{}');
    
    // Percorrer todos os lembretes salvos
    Object.keys(lembretes).forEach(jogoId => {
        const jogo = lembretes[jogoId];
        
        // Verificar se o jogo já aconteceu
        const dataJogo = converterParaData(jogo.data, jogo.hora);
        const agora = new Date();
        
        if (dataJogo < agora) {
            // Jogo já aconteceu, remover dos lembretes
            delete lembretes[jogoId];
            console.log(`Jogo ${jogoId} já aconteceu. Removendo dos lembretes.`);
        } else {
            // Atualizar botão visual se existir
            const botaoLembrete = document.querySelector(`.btn-lembrete[data-id="${jogoId}"]`);
            if (botaoLembrete) {
                botaoLembrete.classList.add('ativo');
                botaoLembrete.innerHTML = '<i class="fas fa-clock"></i> Lembretes configurados';
            }
            
            // Em um app real, você reconfiguraria os lembretes aqui
            console.log(`Lembretes para jogo ${jogoId} ainda válidos.`);
        }
    });
    
    // Salvar lembretes atualizados
    localStorage.setItem('lembretes', JSON.stringify(lembretes));
}

// Adicionar botões de lembrete aos cards de jogos
document.addEventListener('DOMContentLoaded', function() {
    // Esta função deve ser chamada depois que a função original de DOMContentLoaded for executada
    
    // Adicionar botões de lembretes aos cards de jogos
    const jogosCards = document.querySelectorAll('.jogo-card');
    
    jogosCards.forEach(card => {
        const jogoId = card.querySelector('.btn-detalhes').getAttribute('data-id');
        const timeA = card.querySelector('.time:first-child span').textContent;
        const timeB = card.querySelector('.time:last-child span').textContent;
        const dataHora = card.querySelector('.jogo-data').textContent;
        
        // Extrair data e hora
        const partes = dataHora.split(' - ');
        const data = partes[0];
        const hora = partes[1];
        
        // Criar botão de lembretes
        const botaoLembrete = document.createElement('button');
        botaoLembrete.className = 'btn-lembrete';
        botaoLembrete.setAttribute('data-id', jogoId);
        botaoLembrete.innerHTML = '<i class="far fa-clock"></i> Configurar lembretes';
        
        // Adicionar evento de clique
        botaoLembrete.addEventListener('click', function() {
            abrirModalLembretes(jogoId, timeA, timeB, data, hora);
        });
        
        // Inserir o botão antes do botão de notificações
        const btnNotificacao = card.querySelector('.btn-notificacao') || card.querySelector('.btn-detalhes');
        card.insertBefore(botaoLembrete, btnNotificacao);
    });
    
    // Verificar lembretes já agendados
    verificarLembretesAgendados();
});

init();