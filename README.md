# JP Lavagem Automotiva

Aplicação estática para gerar e imprimir orçamentos e recibos. Não exige servidor próprio, etapa de build ou dependências externas. Os documentos do histórico ficam no `localStorage` do navegador e são específicos de cada aparelho.

## Publicação

1. Envie o conteúdo desta pasta para a raiz do repositório GitHub; `index.html` deve ficar na raiz.
2. No repositório, abra **Settings → Pages** e publique a branch principal usando a pasta `/ (root)`.
3. Acesse o endereço HTTPS fornecido pelo GitHub Pages. Use “Adicionar à tela inicial” no navegador para instalar o PWA.

## Arquivos

- `index.html`, `styles.css`, `app.js`: página no estilo do panfleto, campos editáveis e cálculo do recibo/orçamento.
- `manifest.webmanifest`, `sw.js`, `icon.svg`, `panfleto-header.jpg`, `panfleto-footer.jpg`: instalação PWA, cache offline e imagens decorativas extraídas do panfleto.

## Uso

Ao abrir o `index.html`, a página usa a arte do panfleto no cabeçalho e no rodapé, e reconstrói o formulário central com campos reais. Escolha Recibo ou Orçamento, preencha cliente e veículo, marque os serviços feitos, edite seus nomes e valores e selecione a forma de pagamento. “Visualizar e imprimir” imprime a mesma composição em A4, onde também é possível salvar em PDF. “Salvar no histórico” mantém uma cópia local no aparelho atual. O número é emitido no padrão `AAAA/000001`, com sequência por ano, e incrementado após salvar. A data inicia no dia atual e pode ser alterada, inclusive para datas passadas.

Para alterar os serviços iniciais, edite `defaultServices` em `app.js`. Valores aceitam centavos pela digitação (por exemplo, digitar `10000` resulta em `100,00`).
