# Aposta Rapido - Extensao Chrome

Extensao do Chrome para preencher automaticamente apostas no portal Loterias Online da Caixa com numeros gerados pelo Loterias Analyzer.

## Funcionalidades

- Preenchimento automatico de numeros no portal Loterias Online da Caixa
- Suporte a todas as modalidades de loteria:
  - Mega-Sena
  - Lotofacil
  - Quina
  - Lotomania
  - Timemania (com Time do Coracao)
  - Dupla Sena
  - Dia de Sorte (com Mes da Sorte)
  - Super Sete
  - +Milionaria (com Trevos)
- Importacao direta da API do Loterias Analyzer
- Suporte a multiplos jogos
- Pagina de configuracoes para definir URL da API e preferencias
- Menu de contexto para acoes rapidas

## Instalacao

### Modo Desenvolvedor

1. Abra o Chrome e navegue para `chrome://extensions/`
2. Ative o **Modo do desenvolvedor** (toggle no canto superior direito)
3. Clique em **Carregar sem compactacao**
4. Selecione a pasta `aposta-rapido`
5. A extensao sera instalada e aparecera na barra de ferramentas

## Como Usar

### Metodo 1: Colar numeros manualmente

1. Gere jogos no Loterias Analyzer
2. Copie os numeros gerados
3. Abra o portal [Loterias Online da Caixa](https://www.loteriasonline.caixa.gov.br)
4. Navegue ate a pagina de apostas da loteria desejada
5. Clique no icone da extensao
6. Selecione o tipo de loteria
7. Cole os numeros no campo de texto
8. Clique em **Processar Numeros**
9. Clique em **Preencher no Site**

### Metodo 2: Importar da API

1. Configure a URL da API na pagina de opcoes (padrao: `http://localhost:8081`)
2. Selecione o tipo de loteria
3. Clique em **Buscar Ultimos Jogos**
4. Os numeros serao importados automaticamente
5. Clique em **Preencher no Site**

## Configuracao

Acesse a pagina de opcoes da extensao (botao direito no icone > Opcoes) para definir:

- URL da API do Loterias Analyzer
- Preferencias de preenchimento

## Limitacoes

- Funciona apenas no portal oficial loteriasonline.caixa.gov.br
- Os seletores CSS podem precisar de ajustes se o site da Caixa for atualizado
- E necessario estar logado no portal para realizar apostas
- A extensao nao realiza apostas automaticamente, apenas preenche os numeros

## Formatos de Entrada

```
# Separados por virgula
01, 15, 23, 34, 45, 60

# Separados por espaco
01 15 23 34 45 60

# Multiplos jogos (um por linha)
01, 15, 23, 34, 45, 60
02, 18, 27, 38, 49, 55

# +Milionaria (6 dezenas + 2 trevos)
01, 15, 23, 34, 45, 50, 1, 4
```

## Integracao com o Backend

A extensao consome o endpoint de geracao estrategica do backend:

```
GET /api/estatisticas/{tipo}/gerar-jogos-estrategico?estrategia=NUMEROS_QUENTES&quantidade=1
```

Resposta:
```json
{
  "jogos": [[1, 15, 23, 34, 45, 60]],
  "timeSugerido": "FLAMENGO",
  "mesSugerido": "Marco"
}
```

## Estrutura do Projeto

```
aposta-rapido/
├── manifest.json              # Manifest V3
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── src/
    ├── popup.html             # Interface do popup
    ├── popup.css              # Estilos do popup
    ├── popup.js               # Logica principal do popup
    ├── content.js             # Script injetado na pagina da Caixa
    ├── content.css            # Estilos injetados
    ├── background.js          # Service worker
    ├── options.html           # Pagina de configuracoes
    ├── options.js             # Logica das configuracoes
    └── options.css            # Estilos das configuracoes
```

### Permissoes

- `activeTab` - Acesso a aba ativa
- `tabs` - Gerenciamento de abas
- `storage` - Persistencia de configuracoes
- `scripting` - Injecao de scripts na pagina
- `contextMenus` - Menu de contexto do Chrome
- Host permissions: `*.caixa.gov.br`

## Desenvolvimento

### Testar alteracoes

1. Faca as alteracoes nos arquivos
2. Va para `chrome://extensions/`
3. Clique no botao de recarregar na extensao
4. Teste as alteracoes

### Debug

- **Popup**: Botao direito no icone da extensao > "Inspecionar popup"
- **Content Script**: DevTools da pagina (F12) > Console
- **Background**: `chrome://extensions/` > Clique em "service worker"

## Licenca

Este projeto faz parte do Loterias Analyzer e e para fins educacionais. Nao tem vinculo oficial com a Caixa Economica Federal.
