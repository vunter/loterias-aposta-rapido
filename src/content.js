// Content script - Executado nas páginas do portal Loterias Caixa

console.log('[Aposta Rápido] Content script carregado');

// Listener para mensagens do popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ success: true, message: 'Content script ativo' });
    return true;
  }
});
