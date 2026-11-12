# Battle Islands

Jogo 2D de artilharia por turnos com elementos de RPG, feito em HTML5 Canvas e JavaScript puro.
Personagens, mapas e arte são originais e desenhados por código.

## Como rodar

Requer [Node.js](https://nodejs.org) 20 ou superior (sem dependências externas).

```bash
npm start      # abre em http://localhost:5173
npm test       # testes automatizados
```

Atalhos de desenvolvimento pela URL:

- `?scene=battle&map=volcano&seed=42`: abre direto uma batalha (`tropical`, `volcano`, `mystic`, `desert`, `frozen`)
- `?screen=character`: abre direto uma tela do menu
- `?test`: desliga animações de interface (para capturas automáticas)

## Progresso

| Etapa | Conteúdo | Status |
|---|---|---|
| 1 | Estrutura, tela inicial, personagem básico, mapas e motor de renderização | ✅ Concluída |
| 2 | Física, mira, vento, disparos e explosões | ✅ Concluída |
| 3 | Terreno destrutível, movimentação, colisões e turnos | ⏳ Pendente |
| 4 | Criação e personalização completa de personagens | ⏳ Pendente |
| 5 | Armas, classes, habilidades e atributos | ⏳ Pendente |
| 6 | Inventário, equipamentos, loja, missões e progressão | ⏳ Pendente |
| 7 | Mais mapas, IA, modos de jogo e chefes | ⏳ Pendente |
| 8 | Multiplayer online, contas e servidor | ⏳ Pendente |
| 9 | Polimento visual, áudio, otimização e testes | ⏳ Pendente |

### O que funciona na Etapa 1

- **Motor:** loop com passo fixo (60 Hz), gerenciador de cenas, câmera com zoom, limites e tremor, entrada por teclado, mouse e toque (arrastar e pinça).
- **Terreno:** máscara de pixels pronta para destruição (`carveCircle`), gerada proceduralmente como ilhas flutuantes (mesma semente = mesmo mapa).
- **5 mapas:** Ilha Tropical, Vale Vulcânico, Floresta Mística, Deserto Perdido e Montanhas Congeladas, cada um com paleta, fundo em parallax, decoração, fluido animado e clima próprios.
- **Personagem por camadas:** 10 camadas independentes (cabelo de trás, corpo, rosto, cabelo da frente, chapéu, braço com arma...), com animações de espera, piscar, vitória e derrota.
- **Telas:** menu/lobby, seleção de mapa, personagem (prévia ao vivo, corpo masculino ou feminino, 11 opções de aparência com saias e penteados, nome) e configurações. As telas ainda não construídas mostram claramente em qual etapa entram.
- **Salvamento:** camada assíncrona com adaptador de LocalStorage, versão e migração do save, recuperação de save corrompido. Pronta para trocar por um servidor.
- **Áudio:** efeitos de interface sintetizados (Web Audio), com volume configurável.

### O que funciona na Etapa 2 (Campo de treino)

- **Controles:** `↑`/`↓` ângulo (`Shift` para ajuste fino), `←`/`→` virar, `Espaço` segurar para carregar e soltar para atirar, `T` alterna prévia completa/curta. No celular aparecem botões de toque.
- **Física:** trajetória parabólica com gravidade, vento e peso da arma; colisão contínua com terreno e personagens. A prévia pontilhada usa exatamente o mesmo cálculo do tiro real.
- **Vento:** muda a cada rodada, dentro da faixa de cada mapa; seta e número no topo da tela.
- **Explosões:** cratera no terreno, dano com queda por distância (bônus em acerto direto), clarão, onda de choque, fogo, fumaça, pedaços de terreno, tremor de câmera e números de dano.
- **Queda:** quem perde o chão cai; quem cai no mar/lava é eliminado. No treino, o boneco e o jogador voltam depois de um instante.
- **HUD:** vento, ângulo, potência (com marca do último tiro), arma, vida sobre os personagens e estatísticas do treino.
- **Dano preparado para a Etapa 5:** a fórmula já aceita ataque, defesa e multiplicadores, com retorno decrescente para o PvP não ficar injusto.

## Estrutura

```
src/
  core/         motor: Game, Renderer, Camera, Input, EventBus, Storage, partículas, math
  terrain/      Terrain (máscara), gerador procedural, renderizador
  maps/         definições dos mapas, fundo, decoração, clima, MapInstance
  characters/   aparência, renderização por camadas, entidade Character
  scenes/       cenas do canvas (menu, batalha)
  ui/           gerenciador de telas e telas (DOM)
  audio/        AudioManager
  physics/ combat/ weapons/ skills/ inventory/ progression/ ai/ multiplayer/
                reservados para as próximas etapas
assets/         pastas para arte e sons futuros
tests/          testes (node --test)
tools/          servidor de desenvolvimento
```
