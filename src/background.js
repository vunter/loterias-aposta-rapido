// Background Service Worker

console.log('[Aposta Rápido] Background service worker iniciado');

// URLs base
const LOTTERY_BASE_URL = 'https://www.loteriasonline.caixa.gov.br/silce-web/#/';

// B1: Retry counter for JDD processing (prevents infinite retry loop)
let jddRetryCount = 0;
const MAX_JDD_RETRIES = 3;
const LOTTERY_URLS = {
  megasena: 'mega-sena',
  lotofacil: 'lotofacil',
  quina: 'quina',
  lotomania: 'lotomania',
  timemania: 'timemania',
  duplasena: 'dupla-sena',
  diadesorte: 'dia-de-sorte',
  supersete: 'super-sete',
  maismilionaria: 'mais-milionaria'
};

// Listener para instalação da extensão
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Aposta Rápido] Extensão instalada:', details.reason);
  
  if (details.reason === 'install') {
    chrome.storage.local.set({
      apiUrl: 'http://localhost:8080',
      lottery: 'megasena'
    });
  }
});

// Listener para mensagens
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[Aposta Rápido] Mensagem no background:', request);
  
  if (request.action === 'openLotteryPortal') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const tabId = tabs[0]?.id;
      if (tabId) {
        chrome.tabs.update(tabId, { url: 'https://www.loteriasonline.caixa.gov.br' }, () => sendResponse({ success: true }));
      } else {
        chrome.tabs.create({ url: 'https://www.loteriasonline.caixa.gov.br' }, () => sendResponse({ success: true }));
      }
    });
    return true;
  }
  
  if (request.action === 'getActiveTab') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      sendResponse({ tab: tabs[0] });
    });
    return true;
  }
  
  if (request.action === 'processarProximaLoteria') {
    processarProximaLoteria();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === 'preenchimentoConcluido') {
    console.log('[Aposta Rápido] Preenchimento concluído para:', request.lottery);
    setTimeout(() => processarProximaLoteria(), 2000);
    sendResponse({ success: true });
    return true;
  }
});

// Processa a próxima loteria da fila
async function processarProximaLoteria() {
  try {
    const result = await chrome.storage.local.get(['jogosDoDiaFila', 'jogosDoDia', 'jogosDoDiaTotal', 'jddTabDelay', 'pageLoadWait']);
    let fila = result.jogosDoDiaFila || [];
    const jogosPorLoteria = result.jogosDoDia || {};
    const jddTabDelay = (result.jddTabDelay || 3) * 1000;
    const pageLoadWait = (result.pageLoadWait || 4) * 1000;
    
    console.log('[Aposta Rápido] Fila atual:', fila);
    console.log('[Aposta Rápido] Loterias disponíveis:', Object.keys(jogosPorLoteria));
    
    if (fila.length === 0) {
      console.log('[Aposta Rápido] Fila vazia - todas as loterias processadas!');
      sendJddMessage({ action: 'jddComplete' });
      await chrome.storage.local.remove(['jogosDoDiaFila', 'jogosDoDia', 'jogosDoDiaTotal']);
      return;
    }
    
    // Pegar e remover primeira loteria da fila
    const lottery = fila[0];
    fila = fila.slice(1); // Nova fila sem o primeiro elemento
    
    const jogosData = jogosPorLoteria[lottery];
    
    console.log('[Aposta Rápido] Processando:', lottery, 'Restantes:', fila.length);
    
    if (!jogosData) {
      console.log('[Aposta Rápido] Sem dados para loteria:', lottery);
      await chrome.storage.local.set({ jogosDoDiaFila: fila });
      // Continuar para próxima
      setTimeout(() => processarProximaLoteria(), 500);
      return;
    }
    
    // Salvar fila atualizada ANTES de processar
    await chrome.storage.local.set({ jogosDoDiaFila: fila });
    
    const lotteryUrl = LOTTERY_BASE_URL + (LOTTERY_URLS[lottery] || lottery);
    console.log('[Aposta Rápido] Navegando para:', lottery, lotteryUrl);
    
    // Reuse active tab instead of opening a new one
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = activeTab || (await chrome.tabs.query({ currentWindow: true }))[0];
    await chrome.tabs.update(tab.id, { url: lotteryUrl });
    
    await waitForTabLoad(tab.id);
    console.log('[Aposta Rápido] Página carregou, aguardando volante...');
    
    // Wait for the lottery number grid to render instead of fixed delay
    await waitForElement(tab.id, 'ul.escolhe-numero a[id^="n"]', pageLoadWait * 2);
    await waitForAngularReady(tab.id, pageLoadWait * 2);
    
    const totalGames = jogosData?.jogos?.length || 0;
    // Build remaining summary: lottery -> game count
    const remainingSummary = {};
    for (const key of fila) {
      remainingSummary[key] = jogosPorLoteria[key]?.jogos?.length || 0;
    }
    sendJddMessage({ action: 'jddFilling', lottery, remaining: fila.length, totalGames, remainingSummary });
    
    await executeFillForTab(tab.id, lottery, jogosData, fila.length, jddTabDelay);
    jddRetryCount = 0; // Reset on success
    
  } catch (error) {
    console.error('[Aposta Rápido] Erro ao processar loteria:', error);
    jddRetryCount++;
    if (jddRetryCount < MAX_JDD_RETRIES) {
      console.log(`[Aposta Rápido] Tentativa ${jddRetryCount}/${MAX_JDD_RETRIES}, reagendando...`);
      setTimeout(() => processarProximaLoteria(), 1000 * jddRetryCount);
    } else {
      console.error(`[Aposta Rápido] Máximo de ${MAX_JDD_RETRIES} tentativas atingido, pulando loteria.`);
      jddRetryCount = 0;
      // Skip to next lottery in queue
      try {
        const result = await chrome.storage.local.get(['jogosDoDiaFila']);
        if (result.jogosDoDiaFila?.length > 0) {
          setTimeout(() => processarProximaLoteria(), 1000);
        }
      } catch (_) {}
    }
  }
}

function waitForTabLoad(tabId) {
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Polls the page until a CSS selector matches at least one element.
 * Resolves true when found, false on timeout (default 15s).
 */
function waitForElement(tabId, selector, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise(resolve => {
    async function poll() {
      if (Date.now() - start > timeoutMs) { resolve(false); return; }
      try {
        const [{ result }] = await chrome.scripting.executeScript({
          target: { tabId },
          func: (sel) => document.querySelectorAll(sel).length,
          args: [selector]
        });
        if (result > 0) { resolve(true); return; }
      } catch (_) { /* page may not be ready yet */ }
      setTimeout(poll, 300);
    }
    poll();
  });
}

/**
 * Polls the page until Angular scopes are bound to number elements.
 * This ensures vm.selecionar() is available before we try to fill.
 * Must use world: 'MAIN' since Angular lives in the page's main world.
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

function sendJddMessage(msg) {
  try { chrome.runtime.sendMessage(msg); } catch (_) {}
}

async function executeFillForTab(tabId, lottery, jogosData, remainingCount, jddTabDelay) {
  const jogos = jogosData?.jogos || [];
  const quantidadeDezenas = jogosData?.quantidadeDezenas || 0;
  const timesSugeridos = jogosData?.timesSugeridos || (jogosData?.timeSugerido ? [jogosData.timeSugerido] : []);
  const mesesSugeridos = jogosData?.mesesSugeridos || (jogosData?.mesSugerido ? [jogosData.mesSugerido] : []);
  
  console.log('[Aposta Rápido] Iniciando preenchimento:', lottery, 'jogos:', jogos?.length);
  
  try {
    let gamesAdded = 0;
    
    for (let gameIdx = 0; gameIdx < jogos.length; gameIdx++) {
      // Send per-game progress directly from background — no relay needed
      sendJddMessage({ action: 'jddGameProgress', lottery, current: gameIdx + 1, total: jogos.length });
      
      const singleGame = [jogos[gameIdx]];
      const timeForGame = timesSugeridos.length > 0 ? [timesSugeridos[gameIdx % timesSugeridos.length]] : [];
      const mesForGame = mesesSugeridos.length > 0 ? [mesesSugeridos[gameIdx % mesesSugeridos.length]] : [];
      
      const results = await chrome.scripting.executeScript({
        target: { tabId },
        world: 'MAIN',
        func: (gamesToFill, lotteryType, timesSugeridos, mesesSugeridos, qtdDezenas, isFirstGame) => {
          function applyAngular() {
            try {
              if (typeof angular !== 'undefined') {
                const rootScope = angular.element(document.body).injector()?.get('$rootScope');
                if (rootScope && !rootScope.$$phase) rootScope.$apply();
              }
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
          }
          
          function sleep(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
          }
          
          async function limparSelecao() {
            try {
              const selectedElements = document.querySelectorAll('ul.escolhe-numero a.selected');
              for (const el of selectedElements) {
                if (typeof angular !== 'undefined') {
                  const scope = angular.element(el).scope();
                  if (scope?.numero && scope?.vm?.selecionar) {
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
          
          async function limparTrevos() {
            try {
              const anyTrevo = document.getElementById('trevo1');
              if (anyTrevo && typeof angular !== 'undefined') {
                const scope = angular.element(anyTrevo).scope();
                if (scope?.vm?.limparTrevo) {
                  scope.vm.limparTrevo();
                  applyAngular();
                  await sleep(100);
                  return;
                }
              }
              for (let t = 1; t <= 6; t++) {
                const el = document.getElementById('trevo' + t);
                if (el && typeof angular !== 'undefined') {
                  const scope = angular.element(el).scope();
                  if (scope?.numero?.selecionado && scope?.vm?.selecionarMaisMilionariaTrevo) {
                    scope.vm.selecionarMaisMilionariaTrevo(scope.numero);
                  }
                }
              }
              applyAngular();
              await sleep(100);
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
          }
          
          async function resetarQuantidadeTrevos() {
            try {
              const btns = document.querySelectorAll('a[ng-click*="modificarQtdNumerosApostaMaisMilionariaTrevo"]');
              for (const btn of btns) {
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
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
          }
          
          async function preencherTrevos(trevos) {
            if (!trevos || trevos.length === 0) return;
            if (trevos.length > 2) {
              const btns = document.querySelectorAll('a[ng-click*="modificarQtdNumerosApostaMaisMilionariaTrevo"]');
              for (const btn of btns) {
                if (btn.textContent.trim() === '+' && typeof angular !== 'undefined') {
                  const scope = angular.element(btn).scope();
                  if (scope?.vm?.modificarQtdNumerosApostaMaisMilionariaTrevo) {
                    for (let i = 0; i < trevos.length - 2; i++) {
                      scope.vm.modificarQtdNumerosApostaMaisMilionariaTrevo(true);
                      await sleep(50);
                    }
                    applyAngular();
                    await sleep(100);
                    break;
                  }
                }
              }
            }
            for (const trevo of trevos) {
              const element = document.getElementById('trevo' + trevo);
              if (element && typeof angular !== 'undefined') {
                try {
                  const scope = angular.element(element).scope();
                  if (scope?.numero && scope?.vm?.selecionarMaisMilionariaTrevo) {
                    scope.vm.selecionarMaisMilionariaTrevo(scope.numero);
                    await sleep(50);
                    continue;
                  }
                } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
              }
              if (element) element.click();
              await sleep(50);
            }
            applyAngular();
          }
          
          async function lerQuantidadeAtual() {
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const diminuirBtn = document.getElementById('diminuirnumero');
                if (diminuirBtn && typeof angular !== 'undefined') {
                  const scope = angular.element(diminuirBtn).scope();
                  if (scope?.vm?.qtdNumerosAposta) return scope.vm.qtdNumerosAposta;
                }
              } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
              if (attempt < 2) await sleep(200);
            }
            return null;
          }

          async function ajustarQuantidade(qtdDesejada) {
            try {
              const qtdAtual = await lerQuantidadeAtual();
              if (qtdAtual === null || qtdAtual === qtdDesejada) return;
              const aumentar = qtdDesejada > qtdAtual;
              const diff = Math.abs(qtdDesejada - qtdAtual);
              const btn = document.getElementById(aumentar ? 'aumentarnumero' : 'diminuirnumero');
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
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
          }
          
          async function preencherJogo(numbers) {
            let filled = 0;
            if (lotteryType === 'supersete') {
              const numColumns = 7;
              for (let i = 0; i < numbers.length; i++) {
                const column = (i % numColumns) + 1;
                const digit = numbers[i];
                const elementId = `n${7 * digit + column}`;
                const element = document.getElementById(elementId);
                if (element && typeof angular !== 'undefined') {
                  try {
                    const scope = angular.element(element).scope();
                    if (scope?.numero && scope?.vm?.selecionar) {
                      scope.vm.selecionar(scope.numero);
                      filled++;
                      await sleep(30);
                      continue;
                    }
                  } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
                }
                if (element) { element.click(); filled++; }
                await sleep(30);
              }
            } else if (lotteryType === 'maismilionaria') {
              const splitAt = qtdDezenas > 0 ? qtdDezenas : 6;
              const dezenas = numbers.slice(0, splitAt);
              const trevos = numbers.slice(splitAt);
              for (const num of dezenas) {
                let element = document.getElementById('n' + String(num).padStart(2, '0'));
                if (!element) element = document.getElementById('n' + num);
                if (element && typeof angular !== 'undefined') {
                  try {
                    const scope = angular.element(element).scope();
                    if (scope?.numero && scope?.vm?.selecionar) {
                      scope.vm.selecionar(scope.numero);
                      filled++;
                      await sleep(30);
                      continue;
                    }
                  } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
                }
                if (element) { element.click(); filled++; }
                await sleep(30);
              }
              applyAngular();
              await sleep(100);
              if (trevos.length > 0) await preencherTrevos(trevos);
            } else {
              for (const num of numbers) {
                const paddedNum = String(num).padStart(2, '0');
                let element = document.getElementById('n' + paddedNum);
                if (!element) element = document.getElementById('n' + num);
                if (element && typeof angular !== 'undefined') {
                  try {
                    const scope = angular.element(element).scope();
                    if (scope?.numero && scope?.vm?.selecionar) {
                      scope.vm.selecionar(scope.numero);
                      filled++;
                      await sleep(30);
                      continue;
                    }
                  } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
                }
                if (element) { element.click(); filled++; }
                await sleep(30);
              }
            }
            applyAngular();
            await sleep(200);
            return filled;
          }
          
          async function adicionarAoCarrinho() {
            const carrinhoBtn = document.getElementById('colocarnocarrinho');
            if (carrinhoBtn && typeof angular !== 'undefined') {
              try {
                const scope = angular.element(carrinhoBtn).scope();
                if (scope?.vm?.incluirAposta) {
                  scope.vm.incluirAposta();
                  applyAngular();
                  await sleep(500);
                  return true;
                }
              } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
              carrinhoBtn.click();
              await sleep(500);
              return true;
            }
            return false;
          }
          
          async function selecionarTime(timeNome) {
            if (!timeNome) return false;
            const timeNomeNorm = timeNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            try {
              const timesLi = document.querySelectorAll('li[ng-repeat*="equipe in listaEquipe"]');
              for (const li of timesLi) {
                if (typeof angular !== 'undefined') {
                  const scope = angular.element(li).scope();
                  if (scope?.equipe) {
                    const equipeNome = (scope.equipe.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    if (equipeNome.includes(timeNomeNorm) || timeNomeNorm.includes(equipeNome)) {
                      if (typeof scope.configurarTime === 'function') {
                        scope.configurarTime(scope.equipe);
                        applyAngular();
                        await sleep(100);
                        return true;
                      }
                    }
                  }
                }
              }
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
            return false;
          }
          
          async function selecionarMes(mesNome) {
            if (!mesNome) return false;
            const mesNomeNorm = mesNome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
            try {
              const mesesLi = document.querySelectorAll('li[ng-repeat*="mes in listaMeses"]');
              for (const li of mesesLi) {
                if (typeof angular !== 'undefined') {
                  const scope = angular.element(li).scope();
                  if (scope?.mes) {
                    const nomeMes = (scope.mes.nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                    if (nomeMes === mesNomeNorm || nomeMes.startsWith(mesNomeNorm.slice(0, 3))) {
                      if (typeof scope.configurarMes === 'function') {
                        scope.configurarMes(scope.mes);
                        applyAngular();
                        await sleep(100);
                        return true;
                      }
                    }
                  }
                }
              }
            } catch (e) { console.debug("[Aposta Rápido] catch:", e.message); }
            return false;
          }
          
          async function execute() {
            const elements = document.querySelectorAll('ul.escolhe-numero a[id^="n"]');
            if (elements.length === 0) {
              return { success: false, message: 'Elementos não encontrados' };
            }
            
            await limparSelecao();
            if (lotteryType === 'maismilionaria') {
              await limparTrevos();
              await resetarQuantidadeTrevos();
            }
            if (!isFirstGame) await sleep(300);
            
            const numbers = gamesToFill[0];
            if (lotteryType === 'maismilionaria') {
              const splitAt = qtdDezenas > 0 ? qtdDezenas : 6;
              await ajustarQuantidade(splitAt);
            } else {
              await ajustarQuantidade(numbers.length);
            }
            
            const filled = await preencherJogo(numbers);
            let added = false;
            if (filled > 0) {
              if (lotteryType === 'timemania' && timesSugeridos.length > 0) {
                await selecionarTime(timesSugeridos[0]);
              }
              if (lotteryType === 'diadesorte' && mesesSugeridos.length > 0) {
                await selecionarMes(mesesSugeridos[0]);
              }
              await sleep(200);
              added = await adicionarAoCarrinho();
            }
            await sleep(500);
            return { success: added, gamesAdded: added ? 1 : 0 };
          }
          
          return execute();
        },
        args: [singleGame, lottery, timeForGame, mesForGame, quantidadeDezenas, gameIdx === 0]
      });
      
      const fillResult = results[0]?.result;
      if (fillResult?.gamesAdded) gamesAdded++;
    }
    
    console.log('[Aposta Rápido] Resultado final:', lottery, 'gamesAdded:', gamesAdded);
    
    sendJddMessage({ action: 'jddFilled', lottery, remaining: remainingCount, success: gamesAdded > 0, gamesAdded, totalGames: jogos.length });
    
    // Após concluir, processar próxima loteria (não depender da mensagem do script)
    if (remainingCount > 0) {
      console.log('[Aposta Rápido] Aguardando antes de processar próxima loteria...');
      setTimeout(() => processarProximaLoteria(), jddTabDelay || 3000);
    } else {
      console.log('[Aposta Rápido] Última loteria processada!');
      sendJddMessage({ action: 'jddComplete' });
      chrome.storage.local.remove(['jogosDoDiaFila', 'jogosDoDia', 'jogosDoDiaTotal']);
    }
    
  } catch (error) {
    console.error('[Aposta Rápido] Erro ao executar script:', error);
    sendJddMessage({ action: 'jddFilled', lottery, remaining: remainingCount, success: false });
    // Mesmo com erro, tentar próxima
    if (remainingCount > 0) {
      setTimeout(() => processarProximaLoteria(), jddTabDelay || 2000);
    } else {
      sendJddMessage({ action: 'jddComplete' });
      chrome.storage.local.remove(['jogosDoDiaFila', 'jogosDoDia', 'jogosDoDiaTotal']);
    }
  }
}

// Listener para quando uma aba é atualizada
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('loteriasonline.caixa.gov.br')) {
    console.log('[Aposta Rápido] Portal Loterias Caixa detectado:', tab.url);
  }
});

// Context menu
if (chrome.contextMenus) {
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: 'aposta-rapido-fill',
        title: 'Preencher com Aposta Rápido',
        contexts: ['page'],
        documentUrlPatterns: ['https://www.loteriasonline.caixa.gov.br/*', 'https://loteriasonline.caixa.gov.br/*']
      });
    });
  });

  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId === 'aposta-rapido-fill') {
      try {
        const result = await chrome.storage.local.get(['jogosDoDiaFila', 'jogosDoDia']);
        if (result.jogosDoDiaFila && result.jogosDoDiaFila.length > 0) {
          console.log('[Aposta Rápido] Context menu: retomando fila JDD');
          processarProximaLoteria();
        } else {
          console.log('[Aposta Rápido] Context menu: nenhum jogo na fila');
        }
      } catch (e) {
        console.error('[Aposta Rápido] Erro no context menu:', e);
      }
    }
  });
}
