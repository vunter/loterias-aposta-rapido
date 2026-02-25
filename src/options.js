// Options page for Aposta Rápido

const DEFAULT_OPTIONS = {
  apiUrl: 'http://localhost:8080',
  apiTimeout: 30,
  fillDelay: 30,
  gameDelay: 200,
  pageLoadWait: 4,
  confirmBeforeFill: true,
  jddTabDelay: 3
};

const OPTION_KEYS = Object.keys(DEFAULT_OPTIONS);

const fields = {
  apiUrl: document.getElementById('apiUrl'),
  apiTimeout: document.getElementById('apiTimeout'),
  fillDelay: document.getElementById('fillDelay'),
  gameDelay: document.getElementById('gameDelay'),
  pageLoadWait: document.getElementById('pageLoadWait'),
  confirmBeforeFill: document.getElementById('confirmBeforeFill'),
  jddTabDelay: document.getElementById('jddTabDelay')
};

const statusSection = document.getElementById('statusSection');
const statusMessage = document.getElementById('statusMessage');

document.addEventListener('DOMContentLoaded', loadOptions);
document.getElementById('saveBtn').addEventListener('click', saveOptions);
document.getElementById('exportBtn').addEventListener('click', exportAll);
document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
document.getElementById('importFile').addEventListener('change', importAll);
document.getElementById('resetBtn').addEventListener('click', resetOptions);

function loadOptions() {
  chrome.storage.local.get(OPTION_KEYS, (result) => {
    for (const key of OPTION_KEYS) {
      const val = result[key] !== undefined ? result[key] : DEFAULT_OPTIONS[key];
      if (fields[key].type === 'checkbox') {
        fields[key].checked = val;
      } else {
        fields[key].value = val;
      }
    }
  });
}

function saveOptions() {
  const opts = {};
  for (const key of OPTION_KEYS) {
    if (fields[key].type === 'checkbox') {
      opts[key] = fields[key].checked;
    } else if (fields[key].type === 'number') {
      opts[key] = parseInt(fields[key].value, 10) || DEFAULT_OPTIONS[key];
    } else {
      opts[key] = fields[key].value.trim() || DEFAULT_OPTIONS[key];
    }
  }
  chrome.storage.local.set(opts, () => {
    showStatus('Configurações salvas!', 'success');
  });
}

function exportAll() {
  chrome.storage.local.get(null, (data) => {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aposta-rapido-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showStatus('Configurações exportadas!', 'success');
  });
}

function importAll(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (typeof data !== 'object' || data === null || Array.isArray(data)) {
        throw new Error('Formato inválido');
      }
      // Only import known keys — ignore unknown entries
      const ALLOWED_KEYS = new Set([...OPTION_KEYS, 'templates', 'savedGames']);
      const sanitized = {};
      for (const key of Object.keys(data)) {
        if (ALLOWED_KEYS.has(key)) {
          sanitized[key] = data[key];
        }
      }
      if (Object.keys(sanitized).length === 0) {
        throw new Error('Nenhuma chave válida encontrada');
      }
      chrome.storage.local.set(sanitized, () => {
        loadOptions();
        showStatus('Configurações importadas com sucesso!', 'success');
      });
    } catch (err) {
      showStatus('Erro ao importar: arquivo inválido', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function resetOptions() {
  if (!confirm('Restaurar todas as configurações para os valores padrão? Isto apagará todas as preferências salvas.')) {
    return;
  }
  chrome.storage.local.clear(() => {
    chrome.storage.local.set(DEFAULT_OPTIONS, () => {
      loadOptions();
      showStatus('Configurações restauradas para os padrões!', 'info');
    });
  });
}

function showStatus(message, type) {
  statusMessage.textContent = message;
  statusSection.className = `status ${type}`;
  statusSection.style.display = 'block';
  if (type !== 'error') {
    setTimeout(() => { statusSection.style.display = 'none'; }, 4000);
  }
}
