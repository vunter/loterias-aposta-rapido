# 🎰 Aposta Rápido - Extensão Chrome

Extensão do Chrome para preencher automaticamente apostas no portal Loterias Online da Caixa com números gerados pelo **Loterias Analyzer**.

## ✨ Funcionalidades

- ✅ Preenche automaticamente números no portal Loterias Online da Caixa
- ✅ Suporta todas as modalidades de loteria:
  - Mega-Sena
  - Lotofácil
  - Quina
  - Lotomania
  - Timemania (com Time do Coração)
  - Dupla Sena
  - Dia de Sorte (com Mês da Sorte)
  - Super Sete
  - +Milionária (com Trevos)
- ✅ Importação direta da API do Loterias Analyzer
- ✅ Suporte a múltiplos jogos
- ✅ Interface moderna e intuitiva

## 📦 Instalação

### Modo Desenvolvedor (Recomendado para testes)

1. Abra o Chrome e navegue para `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `aposta-rapido`
5. A extensão será instalada e aparecerá na barra de ferramentas

### Gerar ícones (opcional)

Os ícones placeholder precisam ser substituídos por ícones reais. Você pode usar qualquer ferramenta de design para criar ícones nos tamanhos:
- 16x16 pixels
- 48x48 pixels
- 128x128 pixels

## 🚀 Como Usar

### Método 1: Colar números manualmente

1. Gere jogos no Loterias Analyzer
2. Copie os números gerados
3. Abra o portal [Loterias Online da Caixa](https://www.loteriasonline.caixa.gov.br)
4. Navegue até a página de apostas da loteria desejada
5. Clique no ícone da extensão
6. Selecione o tipo de loteria
7. Cole os números no campo de texto
8. Clique em **Processar Números**
9. Clique em **Preencher no Site**

### Método 2: Importar da API

1. Configure a URL da API (padrão: `http://localhost:8080`)
2. Selecione o tipo de loteria
3. Clique em **Buscar Últimos Jogos**
4. Os números serão importados automaticamente
5. Clique em **Preencher no Site**

## 🔧 Configuração

### URL da API
A extensão pode se conectar diretamente à API do Loterias Analyzer para importar jogos gerados. Configure a URL na seção "Importar do Loterias Analyzer".

**Padrão:** `http://localhost:8080`

## ⚠️ Limitações

- A extensão funciona apenas no portal oficial [loteriasonline.caixa.gov.br](https://www.loteriasonline.caixa.gov.br)
- Os seletores CSS podem precisar de ajustes se o site da Caixa for atualizado
- É necessário estar logado no portal para realizar apostas
- A extensão **não realiza apostas automaticamente** - apenas preenche os números

## 🛠️ Desenvolvimento

### Estrutura do Projeto

```
aposta-rapido/
├── manifest.json          # Configuração da extensão
├── icons/                 # Ícones da extensão
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── popup.html         # Interface do popup
    ├── popup.css          # Estilos do popup
    ├── popup.js           # Lógica do popup
    ├── content.js         # Script injetado na página
    ├── content.css        # Estilos injetados na página
    └── background.js      # Service worker
```

### Testar alterações

1. Faça as alterações nos arquivos
2. Vá para `chrome://extensions/`
3. Clique no botão de recarregar (🔄) na extensão
4. Teste as alterações

### Debug

- **Popup**: Clique com botão direito no ícone da extensão → "Inspecionar popup"
- **Content Script**: DevTools da página (F12) → Console
- **Background**: `chrome://extensions/` → Clique em "service worker"

## 📋 Formatos de entrada aceitos

```
# Separados por vírgula
01, 15, 23, 34, 45, 60

# Separados por espaço
01 15 23 34 45 60

# Múltiplos jogos (um por linha)
01, 15, 23, 34, 45, 60
02, 18, 27, 38, 49, 55
05, 12, 30, 41, 52, 58

# +Milionária (6 dezenas + 2 trevos)
01, 15, 23, 34, 45, 50, 1, 4
```

## 🤝 Integração com Loterias Analyzer

A extensão foi projetada para funcionar perfeitamente com o backend do Loterias Analyzer. O endpoint utilizado:

```
GET /api/estatisticas/{tipo}/gerar-jogos-estrategico?estrategia=NUMEROS_QUENTES&quantidade=1
```

Resposta esperada:
```json
{
  "jogos": [[1, 15, 23, 34, 45, 60]],
  "timeSugerido": "FLAMENGO",
  "mesSugerido": "Março"
}
```

## 📄 Licença

Este projeto faz parte do Loterias Analyzer.

---

**Nota:** Esta extensão é um projeto educacional e não tem vínculo oficial com a Caixa Econômica Federal. Use com responsabilidade.
