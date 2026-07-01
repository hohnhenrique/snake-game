# Snake — cobra de terminal

Implementação do clássico Snake em **JavaScript puro**, renderizado em `<canvas>`, sem frameworks ou dependências externas. Tema visual inspirado em terminais de detecção retrô — o mesmo estilo usado no projeto Campo Minado.

## Funcionalidades

- Três velocidades: lenta, normal e rápida (ajustáveis a qualquer momento)
- Controles por teclado (setas ou WASD), por toque (botões em tela) ou por gesto de deslizar no tabuleiro
- Pausa e retomada (botão central ou tecla espaço)
- Recorde (high score) salvo automaticamente no `localStorage` do navegador
- Manual de instruções com objetivo, controles e regras
- Responsivo, com suporte a `prefers-reduced-motion`

## Tecnologias

- HTML5 (`<canvas>`)
- CSS3 (variáveis CSS, grid layout)
- JavaScript (ES6+, sem bibliotecas)

## Como rodar localmente

Não há etapa de build. Basta abrir o arquivo `index.html` no navegador, ou rodar um servidor local simples:

```bash
# Python
python3 -m http.server 8000

# Node
npx serve .
```

Depois acesse `http://localhost:8000`.

## Estrutura do projeto

```
snake/
├── index.html      # estrutura da página
├── style.css        # estilos e tema visual
├── script.js         # lógica do jogo
└── README.md
```

## Lógica do jogo

A lógica principal está em `script.js` e cobre:

- **Loop de jogo**: `setInterval` cuja velocidade depende da opção selecionada (lenta/normal/rápida)
- **Movimento**: a direção pendente só é aplicada no próximo "tick", evitando reversões instantâneas que causariam colisão imediata com o próprio corpo
- **Colisões**: com as paredes do tabuleiro e com o próprio corpo da cobra
- **Comida**: posicionada aleatoriamente em uma célula livre a cada vez que é comida
- **Recorde**: comparado e salvo no `localStorage` sempre que uma partida termina com pontuação maior que a anterior

## Possíveis melhorias futuras

- Obstáculos no tabuleiro
- Modo "sem paredes" (a cobra atravessa para o lado oposto)
- Histórico de partidas e estatísticas, como no Campo Minado
- Efeitos sonoros retrô

## Licença

Livre para uso e modificação.
# snake-game
