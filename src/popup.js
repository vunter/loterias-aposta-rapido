// Configurações das loterias
// Dias: 0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

const ICONS = {
  check: '<svg class="icon" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  rocket: '<svg class="icon" viewBox="0 0 24 24"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>'
};
function icon(name) { return ICONS[name] || ''; }

const LOTTERY_CONFIG = {
  megasena: { name: 'Mega-Sena', min: 6, max: 20, range: [1, 60], url: 'mega-sena', dias: [2, 4, 6] },
  lotofacil: { name: 'Lotofácil', min: 15, max: 20, range: [1, 25], url: 'lotofacil', dias: [1, 2, 3, 4, 5, 6] },
  quina: { name: 'Quina', min: 5, max: 15, range: [1, 80], url: 'quina', dias: [1, 2, 3, 4, 5, 6] },
  lotomania: { name: 'Lotomania', min: 50, max: 50, range: [0, 99], url: 'lotomania', dias: [1, 3, 5] },
  timemania: { name: 'Timemania', min: 10, max: 10, range: [1, 80], hasTeam: true, url: 'timemania', dias: [2, 4, 6] },
  duplasena: { name: 'Dupla Sena', min: 6, max: 15, range: [1, 50], url: 'dupla-sena', dias: [1, 3, 5] },
  diadesorte: { name: 'Dia de Sorte', min: 7, max: 15, range: [1, 31], hasMonth: true, url: 'dia-de-sorte', dias: [2, 4, 6] },
  supersete: { name: 'Super Sete', min: 7, max: 21, range: [0, 9], columns: 7, url: 'super-sete', dias: [1, 3, 5] },
  maismilionaria: { name: '+Milionária', min: 6, max: 12, range: [1, 50], hasTrevos: true, trevosRange: [1, 6], url: 'mais-milionaria', dias: [3, 6] }
};

const LOTTERY_BASE_URL = 'https://www.loteriasonline.caixa.gov.br/silce-web/#/';

function updatePlaceholder() {
  const config = LOTTERY_CONFIG[currentLottery];
  if (!numbersInput) return;
  switch (currentLottery) {
    case 'supersete':
      numbersInput.placeholder = 'Ex: 0, 5, 4, 7, 8, 2, 7\n3, 1, 9, 0, 6, 5, 2\nou: 0,5,4,7,8,2,7 ; 3,1,9,0,6,5,2';
      break;
    case 'maismilionaria':
      numbersInput.placeholder = 'Ex: 03, 17, 25, 33, 41, 50, 2, 5\n(6+ dezenas de 01-50 + trevos de 1-6 no final)\nou selecione trevos fixos acima';
      break;
    case 'lotomania':
      numbersInput.placeholder = 'Ex: 00, 05, 12, 18, 23, 31, 40, ... (50 números)\n(cole todos os 50 números de 00 a 99)';
      break;
    default:
      numbersInput.placeholder = `Ex: ${Array.from({length: Math.min(config.min, 6)}, (_, i) => String(config.range[0] + i * Math.floor((config.range[1] - config.range[0]) / config.min)).padStart(2, '0')).join(', ')}\n(${config.min} números de ${String(config.range[0]).padStart(2, '0')} a ${String(config.range[1]).padStart(2, '0')})`;
      break;
  }
}

// Estado da aplicação
let parsedGames = [];
let currentLottery = 'megasena';
let trevosFixos = []; // Trevos que sempre serão usados

// Opções configuráveis (defaults, overridden by options page)
let appOptions = {
  fillDelay: 30,
  gameDelay: 200,
  pageLoadWait: 4,
  confirmBeforeFill: true,
  jddTabDelay: 3,
  apiTimeout: 30
};

// JDD progress modal state
let jddCancelled = false;
let jddTotal = 0;
let jddDetailsHtml = '';

// Elementos DOM
const lotterySelect = document.getElementById('lotteryType');
const numbersInput = document.getElementById('numbersInput');
const parseBtn = document.getElementById('parseBtn');
const fillBtn = document.getElementById('fillBtn');
const gamesList = document.getElementById('gamesList');
const gamesListItems = document.getElementById('gamesListItems');
const statusSection = document.getElementById('statusSection');
const statusMessage = document.getElementById('statusMessage');
const progressSection = document.getElementById('progressSection');
const progressLabel = document.getElementById('progressLabel');
const progressCount = document.getElementById('progressCount');
const progressBarFill = document.getElementById('progressBarFill');
const progressDetails = document.getElementById('progressDetails');
const confirmSection = document.getElementById('confirmSection');
const confirmBody = document.getElementById('confirmBody');
const confirmYes = document.getElementById('confirmYes');
const confirmNo = document.getElementById('confirmNo');
const extraOptions = document.getElementById('extraOptions');
const timeCoracaoSection = document.getElementById('timeCoracaoSection');
const mesSorteSection = document.getElementById('mesSorteSection');
const trevosSection = document.getElementById('trevosSection');
const apiUrlInput = document.getElementById('apiUrl');
const fetchGamesBtn = document.getElementById('fetchGamesBtn');
const quantidadeJogosInput = document.getElementById('quantidadeJogos');
const quantidadeNumerosInput = document.getElementById('quantidadeNumeros');
const quantidadeNumerosValue = document.getElementById('quantidadeNumerosValue');
const quantidadeNumerosRow = document.getElementById('quantidadeNumerosRow');
const estrategiaSelect = document.getElementById('estrategia');

// Inicialização
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadAppOptions();
  loadSavedState();
  setupEventListeners();
  updateExtraOptions();
  updateQuantidadeNumerosRange();
  updatePlaceholder();
  renderTemplates();
  
  // Copyright year
  const yearEl = document.getElementById('copyrightYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  
  // Templates
  const saveTemplateBtn = document.getElementById('saveTemplateBtn');
  if (saveTemplateBtn) saveTemplateBtn.addEventListener('click', saveTemplate);
  
  // Open options page button
  const openOptionsBtn = document.getElementById('openOptionsBtn');
  if (openOptionsBtn) {
    openOptionsBtn.addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
    });
  }
  
  // Progress modal cancel
  const progressCancelBtn = document.getElementById('progressCancelBtn');
  if (progressCancelBtn) {
    progressCancelBtn.addEventListener('click', async () => {
      jddCancelled = true;
      await chrome.storage.local.remove(['jogosDoDiaFila', 'jogosDoDia', 'jogosDoDiaTotal']);
      hideProgressModal();
      showStatus('Jogos do Dia cancelado', 'info');
    });
  }
  
  // Listen for JDD progress from background
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'jddFilling') {
      const name = LOTTERY_CONFIG[request.lottery]?.name || request.lottery;
      jddDetailsHtml += `<div class="progress-step pending" data-lottery="${request.lottery}">⏳ ${name}...</div>`;
      const completed = jddTotal - request.remaining - 1;
      showProgressModal('Preenchendo jogos...', completed, jddTotal, jddDetailsHtml);
    }
    if (request.action === 'jddFilled') {
      const name = LOTTERY_CONFIG[request.lottery]?.name || request.lottery;
      const stepIcon = request.success ? icon('check') : icon('x');
      const cls = request.success ? 'success' : 'error';
      const pendingRegex = new RegExp(
        `<div class="progress-step pending" data-lottery="${request.lottery}">.*?</div>`
      );
      jddDetailsHtml = jddDetailsHtml.replace(
        pendingRegex,
        `<div class="progress-step ${cls}">${stepIcon} ${name}</div>`
      );
      const completed = jddTotal - request.remaining;
      showProgressModal('Preenchendo jogos...', completed, jddTotal, jddDetailsHtml);
    }
    if (request.action === 'jddComplete') {
      showProgressModal('Concluído!', jddTotal, jddTotal, jddDetailsHtml);
      setTimeout(() => {
        hideProgressModal();
        showStatus('Todos os jogos do dia preenchidos!', 'success');
      }, 2500);
    }
  });
  
  // Collapsible sections
  setupCollapsibleSections();
}

function setupCollapsibleSections() {
  document.querySelectorAll('.collapsible-header').forEach(header => {
    header.addEventListener('click', () => {
      const section = header.closest('.collapsible-section');
      const body = section.querySelector('.collapsible-body');
      const icon = header.querySelector('.collapse-icon');
      const isCollapsed = section.classList.toggle('collapsed');
      body.style.display = isCollapsed ? 'none' : 'block';
      icon.textContent = isCollapsed ? '›' : '⌄';
      // Persist collapsed state
      saveCollapsedState();
    });
  });
  // Restore collapsed state
  chrome.storage.local.get(['collapsedSections'], (result) => {
    const saved = result.collapsedSections || {};
    document.querySelectorAll('.collapsible-section').forEach(section => {
      const id = section.id;
      if (id && saved[id] !== undefined) {
        const body = section.querySelector('.collapsible-body');
        const icon = section.querySelector('.collapse-icon');
        if (saved[id]) {
          section.classList.add('collapsed');
          body.style.display = 'none';
          icon.textContent = '›';
        } else {
          section.classList.remove('collapsed');
          body.style.display = 'block';
          icon.textContent = '⌄';
        }
      }
    });
  });
}

function saveCollapsedState() {
  const state = {};
  document.querySelectorAll('.collapsible-section').forEach(section => {
    if (section.id) state[section.id] = section.classList.contains('collapsed');
  });
  chrome.storage.local.set({ collapsedSections: state });
}

function loadAppOptions() {
  chrome.storage.local.get(['fillDelay', 'gameDelay', 'pageLoadWait', 'confirmBeforeFill', 'jddTabDelay', 'apiTimeout', 'apiUrl'], (result) => {
    if (result.fillDelay !== undefined) appOptions.fillDelay = result.fillDelay;
    if (result.gameDelay !== undefined) appOptions.gameDelay = result.gameDelay;
    if (result.pageLoadWait !== undefined) appOptions.pageLoadWait = result.pageLoadWait;
    if (result.confirmBeforeFill !== undefined) appOptions.confirmBeforeFill = result.confirmBeforeFill;
    if (result.jddTabDelay !== undefined) appOptions.jddTabDelay = result.jddTabDelay;
    if (result.apiTimeout !== undefined) appOptions.apiTimeout = result.apiTimeout;
    // Sync API URL from options if popup field is still default
    if (result.apiUrl && apiUrlInput && apiUrlInput.value === 'http://localhost:8080') {
      apiUrlInput.value = result.apiUrl;
    }
  });
}

function setupEventListeners() {
  lotterySelect.addEventListener('change', handleLotteryChange);
  parseBtn.addEventListener('click', handleParse);
  fillBtn.addEventListener('click', handleFill);
  fetchGamesBtn.addEventListener('click', handleFetchGames);
  numbersInput.addEventListener('input', () => {
    fillBtn.disabled = true;
    gamesList.style.display = 'none';
    saveState();
  });
  
  // Auto-save para outros campos
  quantidadeJogosInput.addEventListener('input', saveState);
  estrategiaSelect.addEventListener('change', saveState);
  
  // API URL - open options page to edit
  const editApiUrlBtn = document.getElementById('editApiUrlBtn');
  if (editApiUrlBtn) editApiUrlBtn.addEventListener('click', () => chrome.runtime.openOptionsPage());
  
  // Time e mês
  const timeCoracao = document.getElementById('timeCoracao');
  const mesSorte = document.getElementById('mesSorte');
  if (timeCoracao) timeCoracao.addEventListener('input', saveState);
  if (mesSorte) mesSorte.addEventListener('change', saveState);
  quantidadeNumerosInput.addEventListener('input', () => {
    quantidadeNumerosValue.textContent = quantidadeNumerosInput.value;
    saveState();
  });
  
  // Quantidade de trevos
  const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
  const quantidadeTrevosValue = document.getElementById('quantidadeTrevosValue');
  if (quantidadeTrevosInput) {
    quantidadeTrevosInput.addEventListener('input', () => {
      quantidadeTrevosValue.textContent = quantidadeTrevosInput.value;
      validateTrevosFixos();
      saveState();
    });
  }
  
  // Botões de trevos fixos
  const trevoButtons = document.querySelectorAll('.trevo-btn');
  trevoButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const trevo = parseInt(btn.dataset.trevo, 10);
      toggleTrevoFixo(trevo, btn);
    });
  });
  
  // Checkboxes de time/mês fixo
  const usarTimeFixo = document.getElementById('usarTimeFixo');
  const usarMesFixo = document.getElementById('usarMesFixo');
  if (usarTimeFixo) usarTimeFixo.addEventListener('change', saveState);
  if (usarMesFixo) usarMesFixo.addEventListener('change', saveState);
  
  // Jogos do Dia
  const jogosDoDiaBtn = document.getElementById('jogosDoDiaBtn');
  if (jogosDoDiaBtn) jogosDoDiaBtn.addEventListener('click', handleJogosDoDia);
  
  const selecionarHojeBtn = document.getElementById('selecionarHojeBtn');
  if (selecionarHojeBtn) selecionarHojeBtn.addEventListener('click', () => selecionarLoteriasParaDia());
  
  const jddDiaSemana = document.getElementById('jddDiaSemana');
  if (jddDiaSemana) {
    // Set dropdown to today's weekday (or Monday if Sunday)
    const hoje = new Date().getDay();
    jddDiaSemana.value = hoje >= 1 ? String(hoje) : '1';
    jddDiaSemana.addEventListener('change', () => {
      selecionarLoteriasParaDia(parseInt(jddDiaSemana.value, 10));
    });
  }
  
  const jddQuantidade = document.getElementById('jddQuantidade');
  if (jddQuantidade) jddQuantidade.addEventListener('input', saveState);
  
  // JDD strategy controls
  const jddEstrategia = document.getElementById('jddEstrategia');
  if (jddEstrategia) jddEstrategia.addEventListener('change', saveState);
  
  const jddPerLotteryStrategy = document.getElementById('jddPerLotteryStrategy');
  if (jddPerLotteryStrategy) {
    jddPerLotteryStrategy.addEventListener('change', () => {
      togglePerLotteryStrategies();
      saveState();
    });
  }
  
  // Checkboxes de loterias do dia
  document.querySelectorAll('.lottery-checkbox input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
      updatePerLotteryStrategies();
      saveState();
    });
  });
}

// Seleciona loterias com sorteio em um determinado dia (default: hoje)
function selecionarLoteriasParaDia(dia) {
  const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  if (dia === undefined) dia = new Date().getDay();
  
  // Update dropdown to reflect selected day
  const select = document.getElementById('jddDiaSemana');
  if (select && dia >= 1) select.value = String(dia);
  
  // Uncheck all
  document.querySelectorAll('.lottery-checkbox input[type="checkbox"]').forEach(cb => {
    cb.checked = false;
  });
  
  // Check lotteries for the selected day
  let count = 0;
  for (const [key, config] of Object.entries(LOTTERY_CONFIG)) {
    if (config.dias && config.dias.includes(dia)) {
      const cb = document.getElementById(`jdd_${key}`);
      if (cb) {
        cb.checked = true;
        count++;
      }
    }
  }
  
  const isHoje = dia === new Date().getDay();
  const label = isHoje ? `hoje (${diasSemana[dia]})` : diasSemana[dia];
  showStatus(`${count} loteria(s) com sorteio ${label}`, 'info');
  updatePerLotteryStrategies();
  saveState();
}

const JDD_STRATEGY_OPTIONS = [
  { value: 'NUMEROS_PREMIADOS', label: 'Premiados' },
  { value: 'NUMEROS_QUENTES', label: 'Quentes' },
  { value: 'NUMEROS_FRIOS', label: 'Frios' },
  { value: 'NUMEROS_ATRASADOS', label: 'Atrasados' },
  { value: 'EQUILIBRADO', label: 'Equilibrado' },
  { value: 'COMBINADO', label: 'Combinado' },
  { value: 'PARES_FREQUENTES', label: 'Pares Freq.' },
  { value: 'DISTRIBUICAO_FAIXAS', label: 'Faixas' },
  { value: 'TENDENCIA_RECENTE', label: 'Recente' },
  { value: 'ALEATORIO', label: 'Aleatório' },
];

function togglePerLotteryStrategies() {
  const enabled = document.getElementById('jddPerLotteryStrategy')?.checked;
  const container = document.getElementById('jddPerLotteryStrategies');
  if (container) container.style.display = enabled ? 'block' : 'none';
  if (enabled) updatePerLotteryStrategies();
}

function updatePerLotteryStrategies() {
  const container = document.getElementById('jddPerLotteryStrategies');
  if (!container || !document.getElementById('jddPerLotteryStrategy')?.checked) return;
  
  const globalStrategy = document.getElementById('jddEstrategia')?.value || 'NUMEROS_PREMIADOS';
  const selectedLotteries = [];
  document.querySelectorAll('.lottery-checkbox input[type="checkbox"]:checked').forEach(cb => {
    selectedLotteries.push(cb.value);
  });
  
  if (selectedLotteries.length === 0) {
    container.innerHTML = '<div style="font-size:0.75rem;color:#5a6380;padding:4px;">Selecione loterias acima</div>';
    return;
  }
  
  // Preserve existing selections
  const existing = {};
  container.querySelectorAll('select[data-lottery]').forEach(sel => {
    existing[sel.dataset.lottery] = sel.value;
  });
  
  const optionsHtml = JDD_STRATEGY_OPTIONS.map(o => 
    `<option value="${o.value}">${o.label}</option>`
  ).join('');
  
  container.innerHTML = selectedLotteries.map(key => {
    const config = LOTTERY_CONFIG[key];
    const name = config?.name || key;
    return `<div class="jdd-lottery-strategy">
      <span>${name}</span>
      <select data-lottery="${key}">${optionsHtml}</select>
    </div>`;
  }).join('');
  
  // Restore previous selections or use global default
  container.querySelectorAll('select[data-lottery]').forEach(sel => {
    sel.value = existing[sel.dataset.lottery] || globalStrategy;
    sel.addEventListener('change', saveState);
  });
}

function toggleTrevoFixo(trevo, btn) {
  const quantidadeTrevos = parseInt(document.getElementById('quantidadeTrevos')?.value || '2', 10);
  
  if (trevosFixos.includes(trevo)) {
    trevosFixos = trevosFixos.filter(t => t !== trevo);
    btn.classList.remove('selected');
  } else {
    if (trevosFixos.length >= quantidadeTrevos) {
      showStatus(`Máximo de ${quantidadeTrevos} trevos. Aumente a quantidade ou desmarque outro.`, 'error');
      return;
    }
    trevosFixos.push(trevo);
    trevosFixos.sort((a, b) => a - b);
    btn.classList.add('selected');
  }
  
  updateTrevosDisplay();
  saveState();
}

function validateTrevosFixos() {
  const quantidadeTrevos = parseInt(document.getElementById('quantidadeTrevos')?.value || '2', 10);
  
  // Se temos mais trevos fixos que a quantidade permitida, remover os últimos
  while (trevosFixos.length > quantidadeTrevos) {
    const removido = trevosFixos.pop();
    const btn = document.querySelector(`.trevo-btn[data-trevo="${removido}"]`);
    if (btn) btn.classList.remove('selected');
  }
  
  updateTrevosDisplay();
}

function updateTrevosDisplay() {
  const trevosInput = document.getElementById('trevos');
  if (trevosInput && trevosFixos.length > 0) {
    trevosInput.value = `Fixos: ${trevosFixos.join(', ')}`;
  } else if (trevosInput) {
    trevosInput.value = '';
  }
}

function handleLotteryChange() {
  currentLottery = lotterySelect.value;
  updateExtraOptions();
  updateQuantidadeNumerosRange();
  updatePlaceholder();
  saveState();
  parsedGames = [];
  fillBtn.disabled = true;
  gamesList.style.display = 'none';
  
  // Resetar trevos fixos
  trevosFixos = [];
  document.querySelectorAll('.trevo-btn').forEach(btn => btn.classList.remove('selected'));
  
  // Resetar campo de trevos
  const trevosInput = document.getElementById('trevos');
  if (trevosInput) {
    trevosInput.value = '';
  }
  
  // Resetar quantidade de trevos
  const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
  const quantidadeTrevosValue = document.getElementById('quantidadeTrevosValue');
  if (quantidadeTrevosInput) {
    quantidadeTrevosInput.value = '2';
    if (quantidadeTrevosValue) quantidadeTrevosValue.textContent = '2';
  }
  
  // Resetar checkboxes
  const usarTimeFixo = document.getElementById('usarTimeFixo');
  const usarMesFixo = document.getElementById('usarMesFixo');
  if (usarTimeFixo) usarTimeFixo.checked = false;
  if (usarMesFixo) usarMesFixo.checked = false;
}

function updateQuantidadeNumerosRange() {
  const config = LOTTERY_CONFIG[currentLottery];
  const rangeMinEl = document.getElementById('rangeMin');
  const rangeMaxEl = document.getElementById('rangeMax');
  
  // Se min == max, não faz sentido mostrar o seletor
  if (config.min === config.max) {
    quantidadeNumerosRow.style.display = 'none';
    quantidadeNumerosInput.value = config.min;
    quantidadeNumerosValue.textContent = config.min;
  } else {
    quantidadeNumerosRow.style.display = 'block';
    quantidadeNumerosInput.min = config.min;
    quantidadeNumerosInput.max = config.max;
    quantidadeNumerosInput.value = config.min;
    quantidadeNumerosValue.textContent = config.min;
    
    // Atualizar labels de min/max
    if (rangeMinEl) rangeMinEl.textContent = config.min;
    if (rangeMaxEl) rangeMaxEl.textContent = config.max;
  }
}

function updateExtraOptions() {
  const config = LOTTERY_CONFIG[currentLottery];
  
  timeCoracaoSection.style.display = config.hasTeam ? 'block' : 'none';
  mesSorteSection.style.display = config.hasMonth ? 'block' : 'none';
  trevosSection.style.display = config.hasTrevos ? 'block' : 'none';
  
  extraOptions.style.display = (config.hasTeam || config.hasMonth || config.hasTrevos) ? 'block' : 'none';
}

function handleParse() {
  const input = numbersInput.value.trim();
  if (!input) {
    showStatus('Digite ou cole os números para processar', 'error');
    return;
  }

  const config = LOTTERY_CONFIG[currentLottery];
  const quantidadeTrevos = parseInt(document.getElementById('quantidadeTrevos')?.value || '2', 10);
  
  // Suportar separação por ; ou quebra de linha
  const rawGames = input.split(/[;\n]/).map(g => g.trim()).filter(g => g);
  
  parsedGames = [];
  
  for (const gameStr of rawGames) {
    const numbers = parseNumbers(gameStr);
    
    // Para +Milionária, precisa de pelo menos 6 dezenas + quantidade de trevos configurada
    const minTrevosNecessarios = trevosFixos.length > 0 ? Math.max(0, quantidadeTrevos - trevosFixos.length) : quantidadeTrevos;
    const minRequired = currentLottery === 'maismilionaria' ? (6 + minTrevosNecessarios) : config.min;
    
    if (numbers.length >= minRequired) {
      // Para +Milionária, separar dezenas e trevos
      if (currentLottery === 'maismilionaria') {
        // Determinar quantos trevos precisamos extrair do input
        const trevosDoInput = numbers.slice(-minTrevosNecessarios);
        const dezenas = minTrevosNecessarios > 0 ? numbers.slice(0, -minTrevosNecessarios) : numbers;
        
        // Combinar trevos fixos com trevos do input
        let trevosFinais = [...trevosFixos];
        for (const t of trevosDoInput) {
          if (t >= 1 && t <= 6 && !trevosFinais.includes(t) && trevosFinais.length < quantidadeTrevos) {
            trevosFinais.push(t);
          }
        }
        trevosFinais.sort((a, b) => a - b);
        
        // Validar que dezenas estão no range correto (1-50) e limitar ao máximo
        const dezenasValidas = dezenas.filter(d => d >= 1 && d <= 50).slice(0, config.max);
        
        if (dezenasValidas.length >= 6 && trevosFinais.length >= 2) {
          parsedGames.push({ dezenas: dezenasValidas, trevos: trevosFinais.slice(0, quantidadeTrevos) });
        }
      } else {
        parsedGames.push({ numbers: numbers.slice(0, config.max) });
      }
    }
  }

  if (parsedGames.length === 0) {
    const msgRequisitos = currentLottery === 'maismilionaria' 
      ? `${config.name} requer 6-12 dezenas (1-50) + ${quantidadeTrevos} trevos (1-6).`
      : `${config.name} requer ${config.min} números.`;
    showStatus(`Nenhum jogo válido encontrado. ${msgRequisitos}`, 'error');
    return;
  }

  displayParsedGames();
  fillBtn.disabled = false;
  showStatus(`${parsedGames.length} jogo(s) processado(s) com sucesso!`, 'success');
}

function parseNumbers(text) {
  // Extrai números do texto, suportando vários formatos
  const matches = text.match(/\d+/g);
  if (!matches) return [];
  
  return matches.map(n => parseInt(n, 10));
}

function displayParsedGames() {
  gamesListItems.innerHTML = '';
  
  parsedGames.forEach((game, index) => {
    const li = document.createElement('li');
    const gameNum = document.createElement('span');
    gameNum.className = 'game-number';
    gameNum.textContent = `#${index + 1}`;
    
    const gameNumbers = document.createElement('span');
    gameNumbers.className = 'game-numbers';
    
    if (currentLottery === 'maismilionaria') {
      gameNumbers.textContent = `${game.dezenas.map(n => String(n).padStart(2, '0')).join(', ')} | Trevos: ${game.trevos.join(', ')}`;
    } else {
      gameNumbers.textContent = game.numbers.map(n => String(n).padStart(2, '0')).join(', ');
    }
    
    li.appendChild(gameNum);
    li.appendChild(gameNumbers);
    gamesListItems.appendChild(li);
  });
  
  gamesList.style.display = 'block';
  
  // Para +Milionária, atualizar o campo de trevos com feedback visual
  if (currentLottery === 'maismilionaria' && parsedGames.length > 0) {
    const trevosInput = document.getElementById('trevos');
    if (trevosInput) {
      const allTrevos = parsedGames.map(g => g.trevos?.join(',') || '');
      const uniqueTrevos = [...new Set(allTrevos)];
      const qtdTrevos = parsedGames[0].trevos?.length || 2;
      
      if (uniqueTrevos.length === 1 && parsedGames[0].trevos?.length > 0) {
        trevosInput.value = `${qtdTrevos} trevos: ${parsedGames[0].trevos.join(', ')}`;
      } else if (uniqueTrevos.length > 1) {
        trevosInput.value = `${parsedGames.length} jogos com ${qtdTrevos} trevos cada`;
      } else {
        trevosInput.value = '';
      }
    }
  }
  
  // Para Timemania, mostrar feedback sobre times
  if (currentLottery === 'timemania') {
    const timeInput = document.getElementById('timeCoracao');
    const usarTimeFixo = document.getElementById('usarTimeFixo');
    
    if (timeInput && usarTimeFixo?.checked && timeInput.value.trim()) {
      timeInput.title = `Time fixo: ${timeInput.value} será usado para todos os jogos`;
    } else if (timeInput && timeInput.value && timeInput.value.includes('|')) {
      timeInput.title = `${parsedGames.length} jogos - cada um usará um time diferente`;
    }
  }
  
  // Para Dia de Sorte, mostrar feedback sobre meses
  if (currentLottery === 'diadesorte') {
    const mesSelect = document.getElementById('mesSorte');
    const usarMesFixo = document.getElementById('usarMesFixo');
    
    if (mesSelect && usarMesFixo?.checked && mesSelect.value) {
      mesSelect.title = `Mês fixo: ${mesSelect.value} será usado para todos os jogos`;
    }
  }
}

async function handleFill() {
  if (parsedGames.length === 0) {
    showStatus('Processe os números primeiro', 'error');
    return;
  }

  // Confirmation step (respects options page setting)
  if (appOptions.confirmBeforeFill) {
    const config = LOTTERY_CONFIG[currentLottery];
    const confirmed = await showConfirm(buildConfirmHtml(parsedGames, config));
    if (!confirmed) {
      showStatus('Preenchimento cancelado', 'info');
      return;
    }
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const config = LOTTERY_CONFIG[currentLottery];
    const expectedUrl = LOTTERY_BASE_URL + config.url;
    
    showProgress('Preparando...', 0, parsedGames.length, '');

    if (!tab.url?.includes('loteriasonline.caixa.gov.br')) {
      showProgress('Navegando para ' + config.name + '...', 0, parsedGames.length, '');
      await chrome.tabs.update(tab.id, { url: expectedUrl });
      await waitForTabComplete(tab.id);
      await waitForVolante(tab.id);
      await waitForAngularReady(tab.id);
      await executeDirectFill();
      return;
    }

    const urlHash = tab.url.split('#/')[1]?.split('?')[0] || '';
    if (urlHash && urlHash !== config.url) {
      showProgress('Navegando para ' + config.name + '...', 0, parsedGames.length, '');
      await chrome.tabs.update(tab.id, { url: expectedUrl });
      await waitForTabComplete(tab.id);
      await waitForVolante(tab.id);
      await waitForAngularReady(tab.id);
    }

    showProgress('Preenchendo números...', 0, parsedGames.length, '');
    await executeDirectFill();
  } catch (error) {
    console.error('Erro ao preencher:', error);
    hideProgress();
    showStatus('Erro: Recarregue a página da Caixa e tente novamente', 'error');
  }
}

function waitForTabComplete(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      resolve();
    }, 30000);
  });
}

/**
 * Polls the page until the lottery number grid (volante) is rendered.
 * Much more reliable than a fixed timeout — resolves as soon as
 * the Angular app finishes rendering the number buttons.
 */
function waitForVolante(tabId, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise(resolve => {
    async function poll() {
      if (Date.now() - start > timeoutMs) {
        console.warn('[Aposta Rápido] Timeout esperando volante, continuando...');
        resolve(false);
        return;
      }
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId },
          func: () => document.querySelectorAll('ul.escolhe-numero a[id^="n"]').length,
        });
        if (result > 0) { resolve(true); return; }
      } catch (_) { /* page may not be ready for scripting yet */ }
      setTimeout(poll, 300);
    }
    poll();
  });
}

/**
 * Polls the page until Angular scopes are bound to number elements.
 * This ensures vm.selecionar() is available before we try to fill.
 */
function waitForAngularReady(tabId, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise(resolve => {
    async function poll() {
      if (Date.now() - start > timeoutMs) {
        console.warn('[Aposta Rápido] Timeout esperando Angular scope, continuando...');
        resolve(false);
        return;
      }
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId },
          world: 'MAIN',
          func: () => {
            if (typeof angular === 'undefined') return false;
            const el = document.querySelector('ul.escolhe-numero a[id^="n"]');
            if (!el) return false;
            try {
              const scope = angular.element(el).scope();
              return !!(scope && scope.numero && scope.vm && typeof scope.vm.selecionar === 'function');
            } catch (e) { return false; }
          }
        });
        if (result) { resolve(true); return; }
      } catch (_) {}
      setTimeout(poll, 500);
    }
    poll();
  });
}

async function executeDirectFill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const config = LOTTERY_CONFIG[currentLottery];
  
  // Preparar todos os jogos para enviar (incluindo trevos se houver)
  const allGames = parsedGames.map(game => ({
    numbers: game.numbers || game.dezenas || [],
    trevos: game.trevos || []
  }));
  
  // Verificar se está usando time/mês fixo
  const usarTimeFixo = document.getElementById('usarTimeFixo')?.checked || false;
  const usarMesFixo = document.getElementById('usarMesFixo')?.checked || false;
  
  // Preparar dados extras
  const timeCoracaoValue = document.getElementById('timeCoracao')?.value?.trim() || '';
  const mesSorteValue = document.getElementById('mesSorte')?.value || '';
  
  // Se usar time fixo, usar apenas o time configurado para todos os jogos
  // Senão, verificar se há múltiplos times separados por |
  let timesArray;
  if (usarTimeFixo && timeCoracaoValue) {
    timesArray = [timeCoracaoValue]; // Mesmo time para todos
  } else {
    timesArray = timeCoracaoValue.includes('|') 
      ? timeCoracaoValue.split('|').map(t => t.trim()).filter(t => t)
      : [timeCoracaoValue];
  }
  
  // Se usar mês fixo, usar apenas o mês configurado para todos os jogos
  let mesesArray;
  if (usarMesFixo && mesSorteValue) {
    mesesArray = [mesSorteValue]; // Mesmo mês para todos
  } else {
    const mesSelect = document.getElementById('mesSorte');
    mesesArray = [mesSorteValue];
    if (mesSelect?.title?.includes('Meses sugeridos:')) {
      const mesesStr = mesSelect.title.replace('Meses sugeridos:', '').trim();
      mesesArray = mesesStr.split(',').map(m => m.trim()).filter(m => m);
    }
  }
  
  const extraData = {
    lottery: currentLottery,
    timeCoracao: timeCoracaoValue,
    timesArray: timesArray,
    usarTimeFixo: usarTimeFixo,
    mesSorte: mesSorteValue,
    mesesArray: mesesArray,
    usarMesFixo: usarMesFixo,
    trevosManual: parseNumbers(document.getElementById('trevos')?.value || '')
  };

  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (gamesToFill, minNumbers, extra) => {
      
      // Função auxiliar para aplicar mudanças no Angular
      function applyAngular() {
        try {
          if (typeof angular !== 'undefined') {
            const rootScope = angular.element(document.body).injector().get('$rootScope');
            if (!rootScope.$$phase) {
              rootScope.$apply();
            }
          }
        } catch (e) {}
      }
      
      // Função auxiliar para delay
      function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      
      // Função para limpar seleção atual
      async function limparSelecao() {
        try {
          // Encontrar botão de limpar/surpresinha ou desmarcar números selecionados
          const selectedElements = document.querySelectorAll('ul.escolhe-numero a.selected');
          for (const el of selectedElements) {
            if (typeof angular !== 'undefined') {
              const scope = angular.element(el).scope();
              if (scope && scope.numero && scope.vm && typeof scope.vm.selecionar === 'function') {
                scope.vm.selecionar(scope.numero);
              }
            }
          }
          applyAngular();
          await sleep(100);
        } catch (e) {
          console.log('[Aposta Rápido] Erro ao limpar seleção:', e);
        }
      }
      
      async function lerQuantidadeAtual() {
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const diminuirBtn = document.getElementById('diminuirnumero');
            if (diminuirBtn && typeof angular !== 'undefined') {
              const scope = angular.element(diminuirBtn).scope();
              if (scope?.vm?.qtdNumerosAposta) return scope.vm.qtdNumerosAposta;
            }
            const qtdEl = document.querySelector('.numero-aposta span, [ng-bind*="qtdNumerosAposta"]');
            if (qtdEl) {
              const val = parseInt(qtdEl.textContent.trim(), 10);
              if (!isNaN(val) && val > 0) return val;
            }
          } catch (e) {}
          if (attempt < 2) await sleep(200);
        }
        console.warn('[Aposta Rápido] Não foi possível ler quantidade atual de números');
        return null;
      }

      async function ajustarQuantidade(qtdDesejada) {
        try {
          const qtdAtual = await lerQuantidadeAtual();
          if (qtdAtual === null) {
            console.warn('[Aposta Rápido] Não foi possível ajustar quantidade: quantidade atual desconhecida');
            return;
          }
          if (qtdAtual === qtdDesejada) return;

          const aumentar = qtdDesejada > qtdAtual;
          const diff = Math.abs(qtdDesejada - qtdAtual);
          const btnId = aumentar ? 'aumentarnumero' : 'diminuirnumero';
          const btn = document.getElementById(btnId);

          if (btn && typeof angular !== 'undefined') {
            const scope = angular.element(btn).scope();
            if (scope?.vm?.modificarQtdNumerosAposta) {
              for (let i = 0; i < diff; i++) {
                try { scope.vm.modificarQtdNumerosAposta(aumentar); } catch (e) { break; }
                await sleep(30);
              }
              applyAngular();
              await sleep(100);
            }
          }
        } catch (e) {}
      }
      
      // Função para limpar seleção de trevos (+Milionária)
      async function limparTrevos() {
        try {
          const selectedTrevos = document.querySelectorAll('img[id^="trevo"].selected, img[id^="trevo"][ng-class*="selected"]');
          for (const el of selectedTrevos) {
            if (typeof angular !== 'undefined') {
              const scope = angular.element(el).scope();
              if (scope?.numero?.selecionado && scope?.vm?.selecionarMaisMilionariaTrevo) {
                scope.vm.selecionarMaisMilionariaTrevo(scope.numero);
              }
            }
          }
          // Also try via vm.limparTrevo if available
          const anyTrevo = document.getElementById('trevo1');
          if (anyTrevo && typeof angular !== 'undefined') {
            const scope = angular.element(anyTrevo).scope();
            if (scope?.vm?.limparTrevo) {
              scope.vm.limparTrevo();
            }
          }
          applyAngular();
          await sleep(100);
        } catch (e) {
          console.log('[Aposta Rápido] Erro ao limpar trevos:', e);
        }
      }
      
      // Função para resetar quantidade de trevos ao mínimo (+Milionária)
      async function resetarQuantidadeTrevos() {
        try {
          const botoesdiminuir = document.querySelectorAll('a[ng-click*="modificarQtdNumerosApostaMaisMilionariaTrevo"]');
          for (const btn of botoesdiminuir) {
            if (btn.textContent.trim() === '-' && typeof angular !== 'undefined') {
              const scope = angular.element(btn).scope();
              if (scope?.vm?.modificarQtdNumerosApostaMaisMilionariaTrevo) {
                for (let i = 0; i < 6; i++) {
                  try { scope.vm.modificarQtdNumerosApostaMaisMilionariaTrevo(false); } catch (e) { break; }
                }
                applyAngular();
                await sleep(100);
                return;
              }
            }
          }
        } catch (e) {}
      }
      
      // Função para preencher trevos (+Milionária)
      async function preencherTrevos(trevos) {
        console.log('[Aposta Rápido] preencherTrevos chamado com:', trevos);
        if (!trevos || trevos.length === 0) {
          console.log('[Aposta Rápido] Nenhum trevo para preencher');
          return;
        }
        
        // Primeiro, ajustar a quantidade de trevos se necessário (mínimo é 2)
        const qtdTrevosDesejada = trevos.length;
        console.log('[Aposta Rápido] Quantidade de trevos desejada:', qtdTrevosDesejada);
        
        if (qtdTrevosDesejada > 2) {
          try {
            // Encontrar o botão de aumentar trevos
            const botoesAumentar = document.querySelectorAll('a[ng-click*="modificarQtdNumerosApostaMaisMilionariaTrevo"]');
            console.log('[Aposta Rápido] Botões de aumentar trevo encontrados:', botoesAumentar.length);
            const btnAumentarTrevo = Array.from(botoesAumentar).find(btn => btn.textContent.trim() === '+');
            
            if (btnAumentarTrevo && typeof angular !== 'undefined') {
              const scope = angular.element(btnAumentarTrevo).scope();
              if (scope && scope.vm && typeof scope.vm.modificarQtdNumerosApostaMaisMilionariaTrevo === 'function') {
                const cliquesNecessarios = qtdTrevosDesejada - 2;
                console.log('[Aposta Rápido] Aumentando quantidade de trevos:', cliquesNecessarios, 'cliques');
                for (let i = 0; i < cliquesNecessarios; i++) {
                  scope.vm.modificarQtdNumerosApostaMaisMilionariaTrevo(true);
                  await sleep(50);
                }
                applyAngular();
                await sleep(100);
              }
            }
          } catch (e) {
            console.log('[Aposta Rápido] Erro ao ajustar quantidade de trevos:', e);
          }
        }
        
        // Agora selecionar os trevos
        for (const trevo of trevos) {
          const elementId = 'trevo' + trevo;
          const element = document.getElementById(elementId);
          console.log(`[Aposta Rápido] Buscando trevo ${trevo}: ID '${elementId}' - Encontrado: ${!!element}`);
          
          if (element && typeof angular !== 'undefined') {
            try {
              const scope = angular.element(element).scope();
              if (scope && scope.numero && scope.vm) {
                if (typeof scope.vm.selecionarMaisMilionariaTrevo === 'function') {
                  scope.vm.selecionarMaisMilionariaTrevo(scope.numero);
                  console.log(`[Aposta Rápido] Trevo ${trevo} selecionado via Angular`);
                }
                if (typeof scope.vm.acessibilidadeSelecionarTrevo === 'function') {
                  scope.vm.acessibilidadeSelecionarTrevo(scope.numero);
                }
              } else {
                console.log(`[Aposta Rápido] Trevo ${trevo}: scope.numero=${!!scope?.numero}, scope.vm=${!!scope?.vm}`);
              }
            } catch (e) {
              console.log(`[Aposta Rápido] Erro ao selecionar trevo ${trevo} via Angular:`, e);
              element.click();
            }
          } else if (element) {
            element.click();
            console.log(`[Aposta Rápido] Trevo ${trevo} selecionado via click`);
          } else {
            console.log(`[Aposta Rápido] Trevo ${trevo} NÃO encontrado no DOM`);
          }
          await sleep(50);
        }
        applyAngular();
      }
      
      // Função para normalizar texto (remover acentos)
      function normalizar(texto) {
        return texto
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();
      }
      
      // Função para limpar seleção do time (Timemania)
      async function limparSelecaoTime() {
        try {
          // Buscar o checkbox de surpresinha ou qualquer elemento com a função limparSelecaoTime
          const checkboxSurpresa = document.querySelector('input[ng-click*="limparSelecaoTime"]');
          if (checkboxSurpresa && typeof angular !== 'undefined') {
            const scope = angular.element(checkboxSurpresa).scope();
            if (scope && typeof scope.limparSelecaoTime === 'function') {
              scope.limparSelecaoTime();
              applyAngular();
              await sleep(50);
              console.log('[Aposta Rápido] Seleção de time limpa');
              return true;
            }
          }
          
          // Alternativa: buscar em qualquer elemento do volante
          const volante = document.querySelector('[ng-repeat*="equipe"]');
          if (volante && typeof angular !== 'undefined') {
            const scope = angular.element(volante).scope();
            if (scope && scope.$parent && typeof scope.$parent.limparSelecaoTime === 'function') {
              scope.$parent.limparSelecaoTime();
              applyAngular();
              await sleep(50);
              console.log('[Aposta Rápido] Seleção de time limpa (via $parent)');
              return true;
            }
          }
        } catch (e) {
          console.log('[Aposta Rápido] Erro ao limpar seleção de time:', e);
        }
        return false;
      }
      
      // Função para selecionar time (Timemania)
      async function selecionarTime(timeNome) {
        if (!timeNome) return false;
        
        console.log('[Aposta Rápido] Selecionando time:', timeNome);
        const timeNomeNormalizado = normalizar(timeNome);
        
        // Extrair nome do time e UF separadamente (ex: "VITÓRIA/BA" -> nome="vitoria", uf="ba")
        const partes = timeNomeNormalizado.split('/');
        const timeNomeSemUF = partes[0];
        const timeUF = partes[1] || '';
        
        // Criar nomeClass esperado (ex: "VITORIA" + "BA" = "vitoriaba")
        const nomeClassEsperado = (timeNomeSemUF + timeUF).replace(/\s+/g, '');
        
        console.log('[Aposta Rápido] Buscando time:', { timeNomeSemUF, timeUF, nomeClassEsperado });
        
        try {
          // Primeiro, limpar qualquer seleção anterior
          await limparSelecaoTime();
          
          // Buscar diretamente na lista de times visíveis
          const timesLi = document.querySelectorAll('li[ng-repeat*="equipe in listaEquipe"]');
          console.log('[Aposta Rápido] Times encontrados na lista:', timesLi.length);
          
          let matchExato = null;
          let matchExatoLi = null;
          let matchNome = null;
          let matchNomeLi = null;
          let matchNomeClass = null;
          let matchNomeClassLi = null;
          
          for (const li of timesLi) {
            // Tentar obter o scope do Angular para verificar equipe.nomeClass
            if (typeof angular !== 'undefined') {
              try {
                const scope = angular.element(li).scope();
                if (scope && scope.equipe) {
                  const equipe = scope.equipe;
                  const equipeNomeClass = normalizar(equipe.nomeClass || '');
                  const equipeNome = normalizar(equipe.nome || '');
                  const equipeUF = normalizar(equipe.uf || '');
                  
                  // Match por nomeClass (mais preciso: "VITORIABA" vs "vitoriaba")
                  if (equipeNomeClass === nomeClassEsperado) {
                    matchNomeClass = `${equipe.nome}/${equipe.uf}`;
                    matchNomeClassLi = li;
                    console.log('[Aposta Rápido] Match por nomeClass:', matchNomeClass);
                    break;
                  }
                  
                  // Match exato por nome + UF
                  if (equipeNome === timeNomeSemUF && equipeUF === timeUF) {
                    matchExato = `${equipe.nome}/${equipe.uf}`;
                    matchExatoLi = li;
                  }
                  
                  // Match apenas por nome (fallback se não houver UF)
                  if (equipeNome === timeNomeSemUF && !matchNome) {
                    matchNome = `${equipe.nome}/${equipe.uf}`;
                    matchNomeLi = li;
                  }
                }
              } catch (e) {}
            }
            
            // Fallback: verificar pelo texto visível
            const nomeTimeEl = li.querySelector('.nomeTime');
            const nomeTime = nomeTimeEl?.textContent?.trim();
            
            if (nomeTime) {
              const nomeTimeNormalizado = normalizar(nomeTime);
              const nomeTimeSemUF = nomeTimeNormalizado.split('/')[0];
              
              if (nomeTimeNormalizado === timeNomeNormalizado && !matchExato) {
                matchExato = nomeTime;
                matchExatoLi = li;
              }
              
              if (nomeTimeSemUF === timeNomeSemUF && !matchNome) {
                matchNome = nomeTime;
                matchNomeLi = li;
              }
            }
          }
          
          // Preferir: nomeClass > match exato > match por nome
          const melhorLi = matchNomeClassLi || matchExatoLi || matchNomeLi;
          const melhorMatch = matchNomeClass || matchExato || matchNome;
          
          if (melhorLi && melhorMatch) {
            console.log('[Aposta Rápido] Time encontrado:', melhorMatch, '(buscando:', timeNome, ')');
            
            if (typeof angular !== 'undefined') {
              const scope = angular.element(melhorLi).scope();
              if (scope && scope.equipe) {
                if (typeof scope.configurarTime === 'function') {
                  scope.configurarTime(scope.equipe);
                  console.log('[Aposta Rápido] Time selecionado via configurarTime');
                }
                if (typeof scope.acessibilidadeSelecionar === 'function') {
                  scope.acessibilidadeSelecionar(scope.equipe);
                }
                applyAngular();
                await sleep(100);
                return true;
              }
            }
            
            // Fallback: clicar na imagem do time
            const imgTime = melhorLi.querySelector('img[name="btnTime"]');
            if (imgTime) {
              imgTime.click();
              console.log('[Aposta Rápido] Time selecionado via click na imagem');
              await sleep(100);
              return true;
            }
            
            melhorLi.click();
            await sleep(100);
            return true;
          }
          
          console.log('[Aposta Rápido] Time NÃO encontrado na lista:', timeNome);
          // Listar alguns times disponíveis para debug
          const timesDisponiveis = [];
          for (const li of Array.from(timesLi).slice(0, 5)) {
            try {
              const scope = angular.element(li).scope();
              if (scope?.equipe) {
                timesDisponiveis.push(`${scope.equipe.nome}/${scope.equipe.uf} (${scope.equipe.nomeClass})`);
              }
            } catch (e) {}
          }
          console.log('[Aposta Rápido] Primeiros times disponíveis:', timesDisponiveis);
          return false;
        } catch (e) {
          console.log('[Aposta Rápido] Erro ao selecionar time:', e);
          return false;
        }
      }
      
      // Função para selecionar mês (Dia de Sorte)
      // Os meses estão em: <li ng-repeat="mes in listaMeses"> com ng-click="configurarMes(mes)"
      async function selecionarMes(mesNome) {
        if (!mesNome) return false;
        
        const mesNomeNormalizado = normalizar(mesNome);
        console.log('[Aposta Rápido] Selecionando mês:', mesNome);
        
        try {
          // Primeiro limpar seleção anterior se houver
          const mesesLi = document.querySelectorAll('li[ng-repeat*="mes in listaMeses"]');
          console.log('[Aposta Rápido] Meses encontrados na lista:', mesesLi.length);
          
          for (const li of mesesLi) {
            if (typeof angular !== 'undefined') {
              try {
                const scope = angular.element(li).scope();
                if (scope && scope.mes) {
                  const mesData = scope.mes;
                  const mesNomeDom = normalizar(mesData.nome || '');
                  const mesAbrev = normalizar(mesData.abreviacao || '');
                  
                  // Match por nome completo ou abreviação
                  if (mesNomeDom === mesNomeNormalizado || 
                      mesNomeDom.startsWith(mesNomeNormalizado) ||
                      mesNomeNormalizado.startsWith(mesNomeDom) ||
                      mesAbrev === mesNomeNormalizado.slice(0, 3)) {
                    
                    if (typeof scope.configurarMes === 'function') {
                      scope.configurarMes(mesData);
                      console.log('[Aposta Rápido] Mês selecionado via configurarMes:', mesData.nome);
                    }
                    if (typeof scope.acessibilidadeSelecionar === 'function') {
                      scope.acessibilidadeSelecionar(mesData);
                    }
                    applyAngular();
                    await sleep(100);
                    return true;
                  }
                }
              } catch (e) {}
            }
            
            // Fallback: verificar pelo texto visível
            const nomeMesEl = li.querySelector('.nomeMes span') || li.querySelector('.nomeMes');
            const nomeMes = nomeMesEl?.textContent?.trim();
            
            if (nomeMes && normalizar(nomeMes).includes(mesNomeNormalizado)) {
              if (typeof angular !== 'undefined') {
                const scope = angular.element(li).scope();
                if (scope && scope.mes && typeof scope.configurarMes === 'function') {
                  scope.configurarMes(scope.mes);
                  applyAngular();
                  console.log('[Aposta Rápido] Mês selecionado via texto:', nomeMes);
                  await sleep(100);
                  return true;
                }
              }
              li.click();
              await sleep(100);
              return true;
            }
          }
          
          console.log('[Aposta Rápido] Mês não encontrado:', mesNome);
          // Listar meses disponíveis para debug
          const mesesDisponiveis = [];
          for (const li of Array.from(mesesLi).slice(0, 3)) {
            try {
              const scope = angular.element(li).scope();
              if (scope?.mes) {
                mesesDisponiveis.push(`${scope.mes.nome} (${scope.mes.abreviacao})`);
              }
            } catch (e) {}
          }
          console.log('[Aposta Rápido] Primeiros meses disponíveis:', mesesDisponiveis);
          return false;
        } catch (e) {
          console.log('[Aposta Rápido] Erro ao selecionar mês:', e);
          return false;
        }
      }
      
      async function preencherJogo(gameData, gameIndex) {
        console.log(`[Aposta Rápido] preencherJogo #${gameIndex + 1} - gameData:`, JSON.stringify(gameData));
        console.log('[Aposta Rápido] preencherJogo - extra:', JSON.stringify(extra));
        
        // +Milionária stores dezenas separately; other lotteries use numbers
        const numbersToFill = gameData.dezenas || gameData.numbers || [];
        const trevos = (gameData.trevos && gameData.trevos.length > 0) ? gameData.trevos : extra.trevosManual;
        
        console.log('[Aposta Rápido] numbersToFill:', numbersToFill);
        console.log('[Aposta Rápido] trevos:', trevos);
        
        const isFirst = gameIndex === 0;
        
        // 1. Ajustar quantidade de números para o desejado
        await ajustarQuantidade(numbersToFill.length);
        
        // 2. Preencher os números
        let filled = 0;
        
        if (extra.lottery === 'supersete') {
          // Super Sete: sequential IDs n1..n70 in a 7-column grid
          // Layout: row=digit(0-9), cols=1-7. Element ID = n(7*digit + column)
          // numbers distributed round-robin across 7 columns
          const numColumns = 7;
          for (let i = 0; i < numbersToFill.length; i++) {
            const column = (i % numColumns) + 1;
            const digit = numbersToFill[i];
            const elementId = `n${7 * digit + column}`;
            const element = document.getElementById(elementId);
            
            console.log(`[Aposta Rápido] Super Sete col ${column} digit ${digit}: ID '${elementId}' - Encontrado: ${!!element}`);
            
            if (element && typeof angular !== 'undefined') {
              try {
                const scope = angular.element(element).scope();
                if (scope?.numero && scope?.vm?.selecionar) {
                  scope.vm.selecionar(scope.numero);
                  filled++;
                  console.log(`[Aposta Rápido] Super Sete col ${column} digit ${digit} selecionado via Angular`);
                  await sleep(30);
                  continue;
                }
              } catch (e) {
                console.log(`[Aposta Rápido] Erro Angular Super Sete col ${column}:`, e);
              }
            }
            
            if (element) {
              element.click();
              filled++;
              console.log(`[Aposta Rápido] Super Sete col ${column} digit ${digit} selecionado via click`);
            } else {
              console.log(`[Aposta Rápido] Super Sete col ${column} digit ${digit} NÃO encontrado`);
            }
            await sleep(30);
          }
        } else {
          // Standard filling for all other lotteries
          for (const num of numbersToFill) {
            // Try with zero-padded (Mega-Sena: n01) and without (+Milionária: n1)
            const paddedNum = String(num).padStart(2, '0');
            let element = document.getElementById('n' + paddedNum);
            const idTentado1 = 'n' + paddedNum;
            let idTentado2 = null;
            
            if (!element) {
              idTentado2 = 'n' + num;
              element = document.getElementById(idTentado2);
            }
            
            console.log(`[Aposta Rápido] Buscando número ${num}: ID tentado '${idTentado1}'${idTentado2 ? ` e '${idTentado2}'` : ''} - Encontrado: ${!!element}`);
            
            if (element && typeof angular !== 'undefined') {
              try {
                const scope = angular.element(element).scope();
                if (scope?.numero && scope?.vm?.selecionar) {
                  scope.vm.selecionar(scope.numero);
                  filled++;
                  console.log(`[Aposta Rápido] Número ${num} selecionado via Angular`);
                  await sleep(30);
                  continue;
                }
              } catch (e) {
                console.log(`[Aposta Rápido] Erro ao selecionar ${num} via Angular:`, e);
              }
            }
            
            if (element) {
              element.click();
              filled++;
              console.log(`[Aposta Rápido] Número ${num} selecionado via click`);
            } else {
              console.log(`[Aposta Rápido] Número ${num} NÃO encontrado no DOM`);
            }
            await sleep(30);
          }
        }
        
        applyAngular();
        await sleep(100);
        
        // 3. Preencher extras baseado no tipo de loteria
        if (extra.lottery === 'maismilionaria' && trevos.length > 0) {
          await preencherTrevos(trevos);
        }
        
        // Para Timemania, selecionar o time correspondente ao jogo
        let timeEncontrado = true;
        if (extra.lottery === 'timemania') {
          const timesArr = extra.timesArray || [extra.timeCoracao];
          const timeParaEsteJogo = timesArr[gameIndex % timesArr.length];
          if (timeParaEsteJogo) {
            console.log(`[Aposta Rápido] Jogo #${gameIndex + 1} - selecionando time: ${timeParaEsteJogo}`);
            timeEncontrado = await selecionarTime(timeParaEsteJogo);
            if (!timeEncontrado) {
              console.log(`[Aposta Rápido] AVISO: Time "${timeParaEsteJogo}" não existe no site da Caixa. Jogo será adicionado sem time correto.`);
            }
          }
        }
        
        // Para Dia de Sorte, selecionar o mês correspondente ao jogo
        if (extra.lottery === 'diadesorte') {
          const mesesArr = extra.mesesArray || [extra.mesSorte];
          const mesParaEsteJogo = mesesArr[gameIndex % mesesArr.length];
          if (mesParaEsteJogo) {
            console.log(`[Aposta Rápido] Jogo #${gameIndex + 1} - selecionando mês: ${mesParaEsteJogo}`);
            await selecionarMes(mesParaEsteJogo);
          }
        }
        
        await sleep(200);
        
        // 4. Clicar no botão "Colocar no Carrinho"
        if (filled > 0) {
          const carrinhoBtn = document.getElementById('colocarnocarrinho');
          if (carrinhoBtn && typeof angular !== 'undefined') {
            try {
              const scope = angular.element(carrinhoBtn).scope();
              if (scope && scope.vm && typeof scope.vm.incluirAposta === 'function') {
                scope.vm.incluirAposta();
                applyAngular();
                await sleep(300);
                return { filled, timeEncontrado };
              }
            } catch (e) {}
            carrinhoBtn.click();
            await sleep(300);
          }
        }
        
        return { filled, timeEncontrado };
      }
      
      async function execute() {
        // Verificar se estamos na página correta
        let elements;
        if (extra.lottery === 'supersete') {
          elements = document.querySelectorAll('ul.escolhe-numero a[id^="n"]');
          if (elements.length === 0) {
            elements = document.querySelectorAll('a[id^="n1"], a[id^="n2"], a[id^="n3"]');
          }
        } else {
          elements = document.querySelectorAll('ul.escolhe-numero a[id^="n"]');
        }
        
        if (elements.length === 0) {
          return { success: false, message: 'Elementos de número não encontrados. Navegue até a página de apostas.', gameResults: [] };
        }
        
        let totalFilled = 0;
        let gamesAdded = 0;
        let timesNaoEncontrados = 0;
        const gameResults = [];
        
        for (let i = 0; i < gamesToFill.length; i++) {
          const gameData = gamesToFill[i];
          
          // Limpar volante antes de cada jogo
          await limparSelecao();
          if (extra.lottery === 'maismilionaria') {
            await limparTrevos();
            await resetarQuantidadeTrevos();
          }
          if (i > 0) await sleep(200);
          
          const result = await preencherJogo(gameData, i);
          const ok = result.filled > 0;
          if (ok) {
            totalFilled += result.filled;
            gamesAdded++;
          }
          if (result.timeEncontrado === false) {
            timesNaoEncontrados++;
          }
          gameResults.push({ index: i + 1, filled: result.filled, ok });
        }
        
        let message = '';
        if (gamesAdded > 0) {
          message = `${gamesAdded} jogo(s) adicionados ao carrinho! (${totalFilled} números)`;
          if (timesNaoEncontrados > 0) {
            message += ` [AVISO] ${timesNaoEncontrados} time(s) não encontrado(s) no site.`;
          }
        } else {
          message = 'Nenhum jogo preenchido. Verifique se está na página de apostas.';
        }
        
        return { 
          success: gamesAdded > 0, 
          message,
          gameResults
        };
      }
      
      return execute();
    },
    args: [allGames, config.min, extraData],
    world: 'MAIN'
  });

  const result = results[0]?.result;
  if (result?.gameResults?.length > 0) {
    const total = result.gameResults.length;
    const ok = result.gameResults.filter(g => g.ok).length;
    let detailsHtml = '';
    for (const gr of result.gameResults) {
      const cls = gr.ok ? 'success' : 'error';
      const stepIcon = gr.ok ? icon('check') : icon('x');
      detailsHtml += `<div class="progress-step ${cls}">${stepIcon} Jogo #${gr.index}: ${gr.filled} número(s)</div>`;
    }
    showProgress('Concluído', ok, total, detailsHtml);
    setTimeout(hideProgress, 8000);
  } else {
    hideProgress();
  }
  if (result?.success) {
    showStatus(`${result.message}`, 'success');
  } else {
    showStatus(result?.message || 'Falha no preenchimento', 'error');
  }
}

async function handleFetchGames() {
  const apiUrl = apiUrlInput.value.trim();
  if (!apiUrl) {
    showStatus('Configure a URL da API', 'error');
    return;
  }

  const quantidade = parseInt(quantidadeJogosInput.value, 10) || 1;
  const estrategia = estrategiaSelect.value;

  const config = LOTTERY_CONFIG[currentLottery];
  const quantidadeNumeros = parseInt(quantidadeNumerosInput.value, 10) || config.min;
  const quantidadeTrevos = parseInt(document.getElementById('quantidadeTrevos')?.value || '2', 10);

  try {
    let statusInfo = '';
    if (config.min !== config.max) {
      statusInfo = ` com ${quantidadeNumeros} números`;
    }
    if (currentLottery === 'maismilionaria' && quantidadeTrevos > 2) {
      statusInfo += ` + ${quantidadeTrevos} trevos`;
    }
    showStatus(`Gerando ${quantidade} jogo(s)${statusInfo} (${estrategia})...`, 'info');
    
    // Mapear tipo de loteria para o endpoint
    const lotteryEndpoint = mapLotteryToEndpoint(currentLottery);
    let url = `${apiUrl}/api/estatisticas/${lotteryEndpoint}/gerar-jogos-estrategico?estrategia=${estrategia}&quantidade=${quantidade}`;
    
    // Adicionar quantidadeNumeros se a loteria permite variação
    if (config.min !== config.max) {
      url += `&quantidadeNumeros=${quantidadeNumeros}`;
    }
    
    // Adicionar quantidadeTrevos para +Milionária
    if (currentLottery === 'maismilionaria') {
      url += `&quantidadeTrevos=${quantidadeTrevos}`;
      
      // Adicionar trevos fixos se houver
      if (trevosFixos.length > 0) {
        url += `&trevosFixos=${trevosFixos.join(',')}`;
      }
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    
    if (!data || !Array.isArray(data.jogos)) {
      showStatus('Resposta inválida da API: formato inesperado', 'error');
      return;
    }

    if (data.jogos.length > 0) {
      // Formatar jogos para o textarea
      const formattedGames = data.jogos.map(jogo => jogo.join(', ')).join('\n');
      numbersInput.value = formattedGames;
      
      // Timemania: times sugeridos (apenas se não tiver time fixo)
      if (currentLottery === 'timemania') {
        const timeInput = document.getElementById('timeCoracao');
        const usarTimeFixo = document.getElementById('usarTimeFixo');
        
        if (timeInput && !(usarTimeFixo?.checked && timeInput.value.trim())) {
          if (data.timesSugeridos && data.timesSugeridos.length > 1) {
            timeInput.value = data.timesSugeridos.join(' | ');
            timeInput.title = `Times sugeridos: ${data.timesSugeridos.join(', ')}`;
          } else if (data.timeSugerido) {
            timeInput.value = data.timeSugerido;
            timeInput.title = '';
          }
        }
      }
      
      // Dia de Sorte: meses sugeridos (apenas se não tiver mês fixo)
      if (currentLottery === 'diadesorte') {
        const mesSelect = document.getElementById('mesSorte');
        const usarMesFixo = document.getElementById('usarMesFixo');
        
        if (mesSelect && !(usarMesFixo?.checked && mesSelect.value)) {
          if (data.mesesSugeridos && data.mesesSugeridos.length > 1) {
            mesSelect.value = data.mesesSugeridos[0];
            mesSelect.title = `Meses sugeridos: ${data.mesesSugeridos.join(', ')}`;
            showStatus(`${data.jogos.length} jogo(s) gerado(s)! Meses: ${data.mesesSugeridos.join(', ')}`, 'success');
          } else if (data.mesSugerido) {
            mesSelect.value = data.mesSugerido;
            mesSelect.title = '';
          }
        }
      }
      
      if (currentLottery !== 'diadesorte' || !data.mesesSugeridos || data.mesesSugeridos.length <= 1) {
        showStatus(`${data.jogos.length} jogo(s) gerado(s) com sucesso!`, 'success');
      }
      
      // Auto-processar
      handleParse();
    } else {
      showStatus('Nenhum jogo retornado pela API', 'error');
    }
  } catch (error) {
    console.error('Erro ao buscar jogos:', error);
    showStatus(`Erro ao conectar com a API: ${error.message}`, 'error');
  }
  
  saveState();
}

function mapLotteryToEndpoint(lottery) {
  const mapping = {
    megasena: 'MEGA_SENA',
    lotofacil: 'LOTOFACIL',
    quina: 'QUINA',
    lotomania: 'LOTOMANIA',
    timemania: 'TIMEMANIA',
    duplasena: 'DUPLA_SENA',
    diadesorte: 'DIA_DE_SORTE',
    supersete: 'SUPER_SETE',
    maismilionaria: 'MAIS_MILIONARIA'
  };
  return mapping[lottery] || lottery.toUpperCase();
}

// Jogos do Dia - Gera jogos para múltiplas loterias e abre as páginas automaticamente
async function handleJogosDoDia() {
  const selectedLotteries = [];
  document.querySelectorAll('.lottery-checkbox input[type="checkbox"]:checked').forEach(cb => {
    selectedLotteries.push(cb.value);
  });
  
  if (selectedLotteries.length === 0) {
    showStatus('Selecione pelo menos uma loteria', 'error');
    return;
  }
  
  const quantidade = parseInt(document.getElementById('jddQuantidade')?.value || '1', 10);
  const apiUrl = apiUrlInput.value.trim() || 'http://localhost:8080';
  
  // Build per-lottery strategy map
  const usePerLottery = document.getElementById('jddPerLotteryStrategy')?.checked;
  const globalJddStrategy = document.getElementById('jddEstrategia')?.value || 'NUMEROS_PREMIADOS';
  const strategyMap = {};
  if (usePerLottery) {
    document.querySelectorAll('#jddPerLotteryStrategies select[data-lottery]').forEach(sel => {
      strategyMap[sel.dataset.lottery] = sel.value;
    });
  }
  function getStrategy(lottery) {
    return (usePerLottery && strategyMap[lottery]) || globalJddStrategy;
  }
  
  // Reset JDD state and show modal
  jddCancelled = false;
  jddTotal = selectedLotteries.length;
  jddDetailsHtml = '';
  showProgressModal('Gerando jogos...', 0, selectedLotteries.length, '');
  
  // Armazenar todos os jogos gerados
  const jogosPorLoteria = {};
  
  try {
    // 1. Gerar todos os jogos primeiro
    let fetchedCount = 0;
    for (const lottery of selectedLotteries) {
      if (jddCancelled) break;
      
      const config = LOTTERY_CONFIG[lottery];
      const endpoint = mapLotteryToEndpoint(lottery);
      
      jddDetailsHtml += `<div class="progress-step pending" data-lottery="${lottery}">⏳ ${config.name}...</div>`;
      showProgressModal('Gerando jogos...', fetchedCount, selectedLotteries.length, jddDetailsHtml);
      
      let url = `${apiUrl}/api/estatisticas/${endpoint}/gerar-jogos-estrategico?estrategia=${getStrategy(lottery)}&quantidade=${quantidade}`;
      
      if (config.min !== config.max) {
        const qtdNumeros = (lottery === currentLottery)
          ? (parseInt(quantidadeNumerosInput.value, 10) || config.min)
          : config.min;
        url += `&quantidadeNumeros=${qtdNumeros}`;
      }
      
      if (lottery === 'maismilionaria') {
        const qtdTrevos = parseInt(document.getElementById('quantidadeTrevos')?.value || '2', 10);
        url += `&quantidadeTrevos=${qtdTrevos}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${config.name}: HTTP ${response.status}`);
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data.jogos)) {
        console.warn(`[Aposta Rápido] Resposta inválida da API para ${config.name}`);
        fetchedCount++;
        jddDetailsHtml = jddDetailsHtml.replace(
          new RegExp(`<div class="progress-step pending" data-lottery="${lottery}">.*?</div>`),
          `<div class="progress-step error">${icon('x')} ${config.name}: resposta inválida</div>`
        );
        showProgressModal('Gerando jogos...', fetchedCount, selectedLotteries.length, jddDetailsHtml);
        continue;
      }

      if (data.jogos.length > 0) {
        jogosPorLoteria[lottery] = {
          jogos: data.jogos,
          quantidadeDezenas: data.quantidadeDezenas || config.min,
          timeSugerido: data.timeSugerido || data.timesSugeridos?.[0] || '',
          mesSugerido: data.mesSugerido || data.mesesSugeridos?.[0] || '',
          timesSugeridos: data.timesSugeridos || (data.timeSugerido ? [data.timeSugerido] : []),
          mesesSugeridos: data.mesesSugeridos || (data.mesSugerido ? [data.mesSugerido] : [])
        };
      }
      fetchedCount++;
      jddDetailsHtml = jddDetailsHtml.replace(
        new RegExp(`<div class="progress-step pending" data-lottery="${lottery}">.*?</div>`),
        `<div class="progress-step success">${icon('check')} ${config.name}: ${data.jogos?.length || 0} jogo(s)</div>`
      );
      showProgressModal('Gerando jogos...', fetchedCount, selectedLotteries.length, jddDetailsHtml);
    }
    
    if (jddCancelled) return;
    
    const lotteriesKeys = Object.keys(jogosPorLoteria);
    if (lotteriesKeys.length === 0) {
      hideProgressModal();
      showStatus('Nenhum jogo gerado pela API', 'error');
      return;
    }
    
    // 2. Salvar fila de loterias a processar
    jddTotal = lotteriesKeys.length;
    jddDetailsHtml = '';
    await chrome.storage.local.set({ 
      jogosDoDiaFila: lotteriesKeys,
      jogosDoDia: jogosPorLoteria,
      jogosDoDiaTotal: lotteriesKeys.length
    });
    
    showProgressModal('Abrindo páginas...', 0, lotteriesKeys.length, '');
    
    // 3. Iniciar processamento da primeira loteria
    chrome.runtime.sendMessage({
      action: 'processarProximaLoteria'
    });
    
  } catch (error) {
    console.error('Erro ao gerar jogos do dia:', error);
    hideProgressModal();
    showStatus(`Erro: ${error.message}`, 'error');
  }
}

// --- Progress & Confirm helpers ---

function showProgress(label, current, total, details) {
  progressSection.style.display = 'block';
  progressLabel.textContent = label;
  progressCount.textContent = `${current}/${total}`;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  progressBarFill.style.width = `${pct}%`;
  if (details) {
    progressDetails.innerHTML = details;
  }
}

function hideProgress() {
  progressSection.style.display = 'none';
  progressBarFill.style.width = '0%';
  progressDetails.innerHTML = '';
}

function showProgressModal(label, current, total, details) {
  const modal = document.getElementById('progressModal');
  const labelEl = document.getElementById('progressModalLabel');
  const countEl = document.getElementById('progressModalCount');
  const barFill = document.getElementById('progressModalBarFill');
  const detailsEl = document.getElementById('progressModalDetails');
  
  if (!modal) return;
  modal.style.display = 'flex';
  if (labelEl) labelEl.textContent = label;
  if (countEl) countEl.textContent = `${current}/${total}`;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  if (barFill) barFill.style.width = `${pct}%`;
  if (details && detailsEl) detailsEl.innerHTML = details;
}

function hideProgressModal() {
  const modal = document.getElementById('progressModal');
  if (modal) modal.style.display = 'none';
  const barFill = document.getElementById('progressModalBarFill');
  if (barFill) barFill.style.width = '0%';
  const detailsEl = document.getElementById('progressModalDetails');
  if (detailsEl) detailsEl.innerHTML = '';
}

function showConfirm(bodyHtml) {
  return new Promise((resolve) => {
    confirmBody.innerHTML = bodyHtml;
    confirmSection.style.display = 'flex';

    function onYes() { cleanup(); resolve(true); }
    function onNo() { cleanup(); resolve(false); }
    function cleanup() {
      confirmYes.removeEventListener('click', onYes);
      confirmNo.removeEventListener('click', onNo);
      confirmSection.style.display = 'none';
    }

    confirmYes.addEventListener('click', onYes);
    confirmNo.addEventListener('click', onNo);
  });
}

function buildConfirmHtml(games, config) {
  let html = `<div class="confirm-summary"><strong>${config.name}</strong> — ${games.length} jogo(s)</div>`;
  html += '<ul class="confirm-game-list">';
  const maxPreview = Math.min(games.length, 5);
  for (let i = 0; i < maxPreview; i++) {
    const g = games[i];
    if (currentLottery === 'maismilionaria' && g.dezenas) {
      html += `<li>#${i + 1}: ${g.dezenas.map(n => String(n).padStart(2, '0')).join(', ')} | T: ${g.trevos.join(', ')}</li>`;
    } else {
      const nums = g.numbers || g;
      html += `<li>#${i + 1}: ${(Array.isArray(nums) ? nums : []).map(n => String(n).padStart(2, '0')).join(', ')}</li>`;
    }
  }
  if (games.length > 5) {
    html += `<li>... e mais ${games.length - 5} jogo(s)</li>`;
  }
  html += '</ul>';
  return html;
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusSection.className = `status ${type}`;
  statusSection.style.display = 'block';
  
  // Auto-hide após 5 segundos para sucesso/info
  if (type !== 'error') {
    setTimeout(() => {
      statusSection.style.display = 'none';
    }, 5000);
  }
}

function saveState() {
  const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
  const usarTimeFixo = document.getElementById('usarTimeFixo');
  const usarMesFixo = document.getElementById('usarMesFixo');
  const timeCoracao = document.getElementById('timeCoracao');
  const mesSorte = document.getElementById('mesSorte');
  
  // Jogos do Dia - loterias selecionadas
  const jddLotteries = [];
  document.querySelectorAll('.lottery-checkbox input[type="checkbox"]:checked').forEach(cb => {
    jddLotteries.push(cb.value);
  });
  const jddQuantidade = document.getElementById('jddQuantidade')?.value || '1';
  const jddEstrategia = document.getElementById('jddEstrategia')?.value || 'NUMEROS_PREMIADOS';
  const jddPerLotteryStrategy = document.getElementById('jddPerLotteryStrategy')?.checked || false;
  
  // Collect per-lottery strategies
  const jddLotteryStrategies = {};
  document.querySelectorAll('#jddPerLotteryStrategies select[data-lottery]').forEach(sel => {
    jddLotteryStrategies[sel.dataset.lottery] = sel.value;
  });
  
  chrome.storage.local.set({
    lottery: currentLottery,
    numbersInput: numbersInput.value,
    apiUrl: apiUrlInput.value,
    quantidade: quantidadeJogosInput.value,
    quantidadeNumeros: quantidadeNumerosInput.value,
    estrategia: estrategiaSelect.value,
    quantidadeTrevos: quantidadeTrevosInput?.value || '2',
    trevosFixos: trevosFixos,
    usarTimeFixo: usarTimeFixo?.checked || false,
    timeCoracaoFixo: timeCoracao?.value || '',
    usarMesFixo: usarMesFixo?.checked || false,
    mesSorteFixo: mesSorte?.value || '',
    jddLotteries: jddLotteries,
    jddQuantidade: jddQuantidade,
    jddEstrategia: jddEstrategia,
    jddPerLotteryStrategy: jddPerLotteryStrategy,
    jddLotteryStrategies: jddLotteryStrategies
  });
}

function loadSavedState() {
  chrome.storage.local.get([
    'lottery', 'numbersInput', 'apiUrl', 'quantidade', 'estrategia', 'quantidadeNumeros',
    'quantidadeTrevos', 'trevosFixos', 'usarTimeFixo', 'timeCoracaoFixo',
    'usarMesFixo', 'mesSorteFixo', 'jddLotteries', 'jddQuantidade',
    'jddEstrategia', 'jddPerLotteryStrategy', 'jddLotteryStrategies'
  ], (result) => {
    if (result.lottery) {
      lotterySelect.value = result.lottery;
      currentLottery = result.lottery;
      updateExtraOptions();
      updateQuantidadeNumerosRange();
    }
    if (result.numbersInput) {
      numbersInput.value = result.numbersInput;
    }
    if (result.apiUrl) {
      apiUrlInput.value = result.apiUrl;
    }
    if (result.quantidade) {
      quantidadeJogosInput.value = result.quantidade;
    }
    if (result.estrategia) {
      estrategiaSelect.value = result.estrategia;
      // Fallback if saved value no longer exists in dropdown
      if (estrategiaSelect.selectedIndex === -1) {
        estrategiaSelect.value = 'NUMEROS_PREMIADOS';
      }
    }
    if (result.quantidadeNumeros) {
      const config = LOTTERY_CONFIG[currentLottery];
      const savedQtd = parseInt(result.quantidadeNumeros, 10);
      if (savedQtd >= config.min && savedQtd <= config.max) {
        quantidadeNumerosInput.value = savedQtd;
        quantidadeNumerosValue.textContent = savedQtd;
      }
    }
    
    // Restaurar quantidade de trevos
    if (result.quantidadeTrevos) {
      const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
      const quantidadeTrevosValue = document.getElementById('quantidadeTrevosValue');
      if (quantidadeTrevosInput) {
        quantidadeTrevosInput.value = result.quantidadeTrevos;
        if (quantidadeTrevosValue) quantidadeTrevosValue.textContent = result.quantidadeTrevos;
      }
    }
    
    // Restaurar trevos fixos
    if (result.trevosFixos && Array.isArray(result.trevosFixos)) {
      trevosFixos = result.trevosFixos;
      trevosFixos.forEach(trevo => {
        const btn = document.querySelector(`.trevo-btn[data-trevo="${trevo}"]`);
        if (btn) btn.classList.add('selected');
      });
      updateTrevosDisplay();
    }
    
    // Restaurar time fixo
    if (result.usarTimeFixo !== undefined) {
      const usarTimeFixo = document.getElementById('usarTimeFixo');
      if (usarTimeFixo) usarTimeFixo.checked = result.usarTimeFixo;
    }
    if (result.timeCoracaoFixo) {
      const timeCoracao = document.getElementById('timeCoracao');
      if (timeCoracao) timeCoracao.value = result.timeCoracaoFixo;
    }
    
    // Restaurar mês fixo
    if (result.usarMesFixo !== undefined) {
      const usarMesFixo = document.getElementById('usarMesFixo');
      if (usarMesFixo) usarMesFixo.checked = result.usarMesFixo;
    }
    if (result.mesSorteFixo) {
      const mesSorte = document.getElementById('mesSorte');
      if (mesSorte) mesSorte.value = result.mesSorteFixo;
    }
    
    // Restaurar Jogos do Dia
    if (result.jddLotteries && Array.isArray(result.jddLotteries)) {
      result.jddLotteries.forEach(lottery => {
        const cb = document.getElementById(`jdd_${lottery}`);
        if (cb) cb.checked = true;
      });
    }
    if (result.jddQuantidade) {
      const jddQuantidade = document.getElementById('jddQuantidade');
      if (jddQuantidade) jddQuantidade.value = result.jddQuantidade;
    }
    
    // Restore JDD strategy settings
    if (result.jddEstrategia) {
      const jddEstrategia = document.getElementById('jddEstrategia');
      if (jddEstrategia) jddEstrategia.value = result.jddEstrategia;
    }
    if (result.jddPerLotteryStrategy) {
      const cb = document.getElementById('jddPerLotteryStrategy');
      if (cb) cb.checked = true;
      togglePerLotteryStrategies();
      // Restore per-lottery strategies after building the UI
      if (result.jddLotteryStrategies) {
        document.querySelectorAll('#jddPerLotteryStrategies select[data-lottery]').forEach(sel => {
          if (result.jddLotteryStrategies[sel.dataset.lottery]) {
            sel.value = result.jddLotteryStrategies[sel.dataset.lottery];
          }
        });
      }
    }
  });
}

// ==================== TEMPLATES ====================

function getCurrentConfig() {
  const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
  return {
    lottery: currentLottery,
    estrategia: estrategiaSelect.value,
    quantidadeJogos: quantidadeJogosInput.value,
    quantidadeNumeros: quantidadeNumerosInput.value,
    quantidadeTrevos: quantidadeTrevosInput?.value || '2',
    trevosFixos: [...trevosFixos],
    usarTimeFixo: document.getElementById('usarTimeFixo')?.checked || false,
    timeCoracaoFixo: document.getElementById('timeCoracao')?.value || '',
    usarMesFixo: document.getElementById('usarMesFixo')?.checked || false,
    mesSorteFixo: document.getElementById('mesSorte')?.value || '',
    jddEstrategia: document.getElementById('jddEstrategia')?.value || 'NUMEROS_PREMIADOS',
    jddPerLotteryStrategy: document.getElementById('jddPerLotteryStrategy')?.checked || false,
    jddLotteryStrategies: (() => {
      const map = {};
      document.querySelectorAll('#jddPerLotteryStrategies select[data-lottery]').forEach(sel => {
        map[sel.dataset.lottery] = sel.value;
      });
      return map;
    })(),
  };
}

function applyTemplate(template) {
  if (template.lottery) {
    lotterySelect.value = template.lottery;
    currentLottery = template.lottery;
    updateExtraOptions();
    updateQuantidadeNumerosRange();
  }
  if (template.estrategia) estrategiaSelect.value = template.estrategia;
  if (template.quantidadeJogos) quantidadeJogosInput.value = template.quantidadeJogos;
  if (template.quantidadeNumeros) {
    quantidadeNumerosInput.value = template.quantidadeNumeros;
    quantidadeNumerosValue.textContent = template.quantidadeNumeros;
  }

  const quantidadeTrevosInput = document.getElementById('quantidadeTrevos');
  const quantidadeTrevosValue = document.getElementById('quantidadeTrevosValue');
  if (template.quantidadeTrevos && quantidadeTrevosInput) {
    quantidadeTrevosInput.value = template.quantidadeTrevos;
    if (quantidadeTrevosValue) quantidadeTrevosValue.textContent = template.quantidadeTrevos;
  }

  // Reset trevos fixos
  trevosFixos = [];
  document.querySelectorAll('.trevo-btn').forEach(btn => btn.classList.remove('selected'));
  if (template.trevosFixos && Array.isArray(template.trevosFixos)) {
    trevosFixos = [...template.trevosFixos];
    trevosFixos.forEach(trevo => {
      const btn = document.querySelector(`.trevo-btn[data-trevo="${trevo}"]`);
      if (btn) btn.classList.add('selected');
    });
    updateTrevosDisplay();
  }

  if (template.usarTimeFixo !== undefined) {
    const el = document.getElementById('usarTimeFixo');
    if (el) el.checked = template.usarTimeFixo;
  }
  if (template.timeCoracaoFixo) {
    const el = document.getElementById('timeCoracao');
    if (el) el.value = template.timeCoracaoFixo;
  }
  if (template.usarMesFixo !== undefined) {
    const el = document.getElementById('usarMesFixo');
    if (el) el.checked = template.usarMesFixo;
  }
  if (template.mesSorteFixo) {
    const el = document.getElementById('mesSorte');
    if (el) el.value = template.mesSorteFixo;
  }

  // Restore JDD strategy settings
  if (template.jddEstrategia) {
    const el = document.getElementById('jddEstrategia');
    if (el) el.value = template.jddEstrategia;
  }
  if (template.jddPerLotteryStrategy !== undefined) {
    const cb = document.getElementById('jddPerLotteryStrategy');
    if (cb) {
      cb.checked = template.jddPerLotteryStrategy;
      togglePerLotteryStrategies();
      if (template.jddLotteryStrategies) {
        document.querySelectorAll('#jddPerLotteryStrategies select[data-lottery]').forEach(sel => {
          if (template.jddLotteryStrategies[sel.dataset.lottery]) {
            sel.value = template.jddLotteryStrategies[sel.dataset.lottery];
          }
        });
      }
    }
  }

  updatePlaceholder();
  saveState();
  showStatus('Template aplicado!', 'success');
}

function saveTemplate() {
  const nameInput = document.getElementById('templateName');
  const name = (nameInput?.value || '').trim();
  if (!name) {
    showStatus('Digite um nome para o template.', 'warning');
    return;
  }

  const config = getCurrentConfig();
  const template = { name, config, savedAt: new Date().toISOString() };

  chrome.storage.local.get(['templates'], (result) => {
    const templates = result.templates || [];
    const idx = templates.findIndex(t => t.name === name);
    if (idx >= 0) {
      templates[idx] = template;
    } else {
      templates.push(template);
    }
    chrome.storage.local.set({ templates }, () => {
      nameInput.value = '';
      renderTemplates();
      showStatus(`Template "${name}" salvo!`, 'success');
    });
  });
}

function deleteTemplate(name) {
  chrome.storage.local.get(['templates'], (result) => {
    const templates = (result.templates || []).filter(t => t.name !== name);
    chrome.storage.local.set({ templates }, () => {
      renderTemplates();
    });
  });
}

function renderTemplates() {
  const container = document.getElementById('templatesList');
  if (!container) return;

  chrome.storage.local.get(['templates'], (result) => {
    const templates = result.templates || [];
    if (templates.length === 0) {
      container.innerHTML = '<div class="template-empty">Nenhum template salvo</div>';
      return;
    }

    container.innerHTML = templates.map(t => {
      const config = t.config;
      const lotName = LOTTERY_CONFIG[config.lottery]?.name || config.lottery;
      const details = `${escapeHtml(lotName)} • ${config.quantidadeJogos} jogo(s) • ${escapeHtml(config.estrategia)}`;
      const safeName = escapeHtml(t.name);
      return `
        <div class="template-item" data-template-name="${safeName}">
          <div class="template-info" title="Clique para aplicar">
            <div class="template-name">${safeName}</div>
            <div class="template-details">${details}</div>
          </div>
          <button class="template-delete" data-delete-name="${safeName}" title="Excluir">${icon('x')}</button>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.template-item').forEach(item => {
      const tName = item.dataset.templateName;
      item.querySelector('.template-info').addEventListener('click', () => {
        const tmpl = templates.find(t => t.name === tName);
        if (tmpl) applyTemplate(tmpl.config);
      });
    });

    container.querySelectorAll('.template-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTemplate(btn.dataset.deleteName);
      });
    });
  });
}
