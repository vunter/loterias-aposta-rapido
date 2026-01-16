// Content script - Executado nas páginas do portal Loterias Caixa
// VERSÃO SIMPLIFICADA - apenas logging e ping

console.log('[Aposta Rápido] Content script carregado (versão simplificada)');

// Listener para mensagens do popup (apenas ping)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script ativo' });
    return true;
  }
});

// Não adicionar nenhum elemento ao DOM para evitar interferência com AngularJS
