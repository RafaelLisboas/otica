# Historico de mudancas - Sistema Otica Regina

Documento criado para registrar o que foi conversado, diagnosticado e implementado no sistema ate aqui.

Data do registro: 01/06/2026

## Contexto geral

O sistema e uma aplicacao local para gestao da Otica Regina, com:

- Frontend em `index.html`, `app.js` e `styles.css`.
- Backend em Python no arquivo `server.py`.
- Banco local SQLite em `otica_regina.sqlite3`.
- Teste de autenticacao em `test_auth.sh`.

O servidor roda localmente em:

```text
http://127.0.0.1:8000
```

Em alguns momentos tambem foi usado:

```text
OTICA_HOST=0.0.0.0 python3 server.py
```

## Problemas iniciais tratados

### Acesso por localhost e IP

Foi verificado que o sistema abre em `localhost`, mas nao abriu pelo IP informado `10.98.1.159`.

O servidor foi ajustado para permitir bind por variaveis:

- `OTICA_HOST`
- `OTICA_PORT`

Uso atual recomendado para disponibilizar na rede local:

```bash
OTICA_HOST=0.0.0.0 python3 server.py
```

Observacao: se nao abrir pelo IP, normalmente depende de firewall, rede, roteador ou ambiente onde o servidor esta rodando.

## Melhorias de seguranca e backend

Foram implementadas melhorias no `server.py`:

- Servidor passa a servir apenas arquivos publicos esperados.
- Bloqueio de arquivos sensiveis como banco, dotfiles e caminhos indevidos.
- Headers de seguranca:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
- Tratamento de JSON invalido.
- Cookie de sessao com `HttpOnly`, `SameSite=Lax` e suporte opcional a `Secure`.
- Autenticacao revisada.
- Logout corrigido para `POST`.
- Teste `test_auth.sh` corrigido e validado.

Rotas relevantes adicionadas ou melhoradas:

- `/api/quotes`
- `/api/quotes/convert`
- `/api/installments/pay`
- `/api/installments/reopen`
- `/api/backup`
- `/api/lab-orders`

## Backup

Foi criada a funcionalidade de backup em `Config.`.

O backup gera uma copia do banco em:

```text
/home/otica/backups/
```

Formato do arquivo:

```text
otica_regina_YYYYMMDD_HHMMSS.sqlite3
```

## Login e imagem

Foi corrigida a imagem/logo do login, que nao estava aparecendo.

Arquivo usado:

```text
assets/vetor.png
```

Tambem foi ajustado o CSS para a imagem aparecer de forma direta, sem depender de comportamento de carregamento fragil.

## Clientes

### Historico financeiro no cliente

Na ficha do cliente foi adicionada a saude financeira:

- perfil financeiro;
- valor em aberto;
- valor vencido;
- valor pago;
- quantidade de compras;
- ultimas vendas/orcamentos;
- indicacao de bom cliente, cliente em acompanhamento ou cliente com atraso.

Essa melhoria ajuda a avaliar se o cliente tem bom historico para novas vendas parceladas.

### Busca de cliente

Na parte de vendas, o campo de cliente passou a buscar diretamente no banco de clientes por:

- nome;
- CPF;
- telefone.

O usuario digita e seleciona o cliente encontrado.

## Receitas e O.S.

### Vinculo entre venda, receita e O.S.

Foi diagnosticado que uma venda nao tinha como indicar qual O.S. ou receita estava vinculada.

Foi implementado:

- Campo `Receita / O.S. vinculada` na tela de Vendas.
- Apos selecionar cliente, o sistema lista as receitas e O.S. daquele cliente.
- Venda/orcamento passa a salvar:
  - `prescription_id`
  - `lab_order_id`
- Recibo, orcamento, financeiro e historico passam a mostrar o vinculo quando existir.

### Botao "Vender com esta receita"

Na tela de detalhes da receita foi adicionado o botao:

```text
Vender com esta receita
```

Ele abre a tela de vendas ja com cliente e receita/O.S. preenchidos.

## Vendas

A tela de vendas recebeu varias melhorias.

### Campos adicionados

Foram adicionados:

- codigo da armacao;
- valor da armacao preenchido automaticamente;
- valor da lente;
- valor da consulta;
- regra da consulta;
- pagamento combinado;
- vinculo com receita/O.S.;
- observacoes;
- botao para gerar orcamento;
- botao para fechar venda;
- botao para imprimir orcamento;
- possibilidade de editar venda.

### Codigo da armacao e estoque

Ao digitar o codigo da armacao:

- o sistema busca no estoque;
- mostra nome, quantidade e preco;
- preenche o campo `Valor da armacao`;
- soma automaticamente no valor total.

Se o codigo nao for encontrado, aparece aviso e o valor da armacao fica vazio.

### Regra da consulta

A consulta segue a regra conversada:

- Cliente comprou oculos: cliente paga 50% da consulta.
- Cliente nao comprou oculos: cliente paga integral.
- Cliente trouxe receita: consulta fica isenta.

### Pagamento combinado

Foi implementada a possibilidade de usar duas formas de pagamento:

- forma principal;
- segunda forma de pagamento;
- valores separados.

O sistema valida que a soma das formas de pagamento bate com o total.

### Carnê

Quando a forma de pagamento e `Carnê`:

- o sistema gera parcelas;
- calcula entrada;
- calcula quantidade de parcelas;
- permite gerar PDF do carne.

O modelo do carne foi ajustado conforme referencia enviada:

- 4 vias por folha A4;
- cada via com `16,5cm x 6cm`;
- parte destacada com `11cm x 6cm`;
- parte presa com `5,5cm x 6cm`.

### Orcamento

Foi criada a aba `Orçamentos`.

Nela e possivel:

- listar orcamentos pendentes;
- editar orcamento;
- converter em venda;
- imprimir orcamento.

Ao imprimir orcamento:

- mostra dados do cliente;
- itens;
- pagamento;
- total;
- validade;
- observacoes;
- resumo das parcelas quando houver carnê.

### Organizacao visual da pagina de vendas

A pagina de vendas foi reorganizada em blocos:

- Cliente e vinculo;
- Itens e valores;
- Pagamento;
- Observacoes.

Depois foi ajustada para:

- formulario em cima;
- lista de vendas fechadas abaixo;
- cards de vendas em formato horizontal.

## Financeiro

A tela financeira foi reconstruida para ficar mais intuitiva.

### Antes

Mostrava parcelas soltas, dificultando entender a vida financeira do cliente.

### Depois

Agora a tela mostra clientes com resumo financeiro.

Ao clicar em um cliente, aparece:

- vida financeira;
- total em aberto;
- total vencido;
- total pago;
- parcelas pagas/total;
- vendas vinculadas;
- parcelas de cada venda;
- botao `Dar baixa`;
- botao `Reabrir`.

### Atualizacao em tempo real

Foi corrigido o problema em que `Dar baixa` ou `Reabrir` so atualizava apos recarregar a pagina.

Agora:

- o botao reage imediatamente;
- os dados sao atualizados localmente;
- depois o sistema recarrega os dados do banco.

### Erro corrigido

Foi corrigido o erro:

```text
renderSalesClientOptions is not defined
```

Esse erro travava a tela e deixava botoes presos em `Baixando...` ou `Reabrindo...`.

## Estoque

### Categorias

O estoque foi reorganizado por categorias:

- Armacoes;
- Oculos esporte;
- Acessorios.

Itens antigos em categoria `lenses` foram tratados como `Oculos esporte` para nao sumirem.

### Lista por categoria

Ao clicar em uma categoria, aparece a lista de itens cadastrados com colunas:

- Produto;
- Marca;
- Codigo;
- Material;
- Referencia de cor;
- Quantidade;
- Estoque minimo;
- Preco de venda;
- Acoes.

### Exportacao

Foram adicionados botoes para exportar estoque:

- CSV;
- PDF/impressao.

## Dashboard

O dashboard foi modernizado com visual mais elegante e dinamico.

Foram adicionados:

- grafico de vendas dos ultimos meses;
- funil comercial;
- taxa de conversao;
- saude financeira em grafico circular;
- proximos recebimentos;
- insights rapidos;
- cards mais modernos;
- alertas de estoque;
- formas de pagamento.

## Relatorios

A aba `Relatórios` mostra:

- vendas no mes;
- valor a receber;
- parcelas vencidas;
- consultas pagas pela otica;
- formas de pagamento;
- estoque baixo.

## Busca global

A busca do topo foi melhorada.

Agora encontra:

- clientes;
- vendas;
- orcamentos;
- O.S.

Os resultados aparecem agrupados, com acoes para abrir o item correspondente.

## Auditoria

Foi criada a tabela `audit_logs` no banco.

A auditoria registra eventos como:

- alteracao de senha;
- salvamento de cliente;
- salvamento de receita;
- criacao de O.S.;
- salvamento de orcamento;
- fechamento de venda;
- conversao de orcamento em venda;
- baixa de parcela;
- reabertura de parcela;
- backup;
- alteracao de estoque.

A tela `Config. > Auditoria` mostra os ultimos registros.

## Notificacoes

Foram removidos `alert()` travantes do app principal.

Foi criado um sistema de notificacoes discretas (`toast`) para:

- erros;
- mensagens de sucesso;
- avisos operacionais.

## Exportacoes

Foram adicionadas exportacoes:

- Estoque em CSV;
- Estoque em PDF/impressao;
- Financeiro em CSV;
- Financeiro em PDF/impressao.

## Melhorias de codigo

### Remocao de onclick no app principal

Os principais `onclick` inline do app foram substituidos por acoes delegadas em JavaScript com `data-app-action`.

Permaneceram `onclick` apenas nas janelas de impressao/PDF, porque elas sao documentos HTML separados abertos em nova aba.

### Estrutura maior ainda em um unico arquivo

O arquivo `app.js` ainda concentra muitas funcionalidades.

Foi identificado como melhoria futura separar em modulos:

- clientes;
- receitas;
- vendas;
- orcamentos;
- financeiro;
- estoque;
- dashboard;
- relatorios;
- configuracoes.

Essa separacao nao foi feita agora para evitar risco alto de quebra, ja que o sistema esta em uso e recebeu muitas mudancas funcionais.

## Testes e validacoes executadas

Durante o trabalho foram executadas diversas validacoes:

```bash
python3 -m py_compile server.py
git diff --check
./test_auth.sh
curl http://127.0.0.1:8000/
```

O teste `test_auth.sh` valida:

- login com senha atual;
- troca de senha;
- logout;
- bloqueio de `/api/data` sem sessao;
- rejeicao da senha antiga;
- login com senha nova;
- retorno para a senha original.

## Servidor

O servidor foi reiniciado varias vezes com:

```bash
OTICA_HOST=0.0.0.0 python3 server.py
```

Ultima validacao HTTP retornou:

```text
200
```

## Arquivos principais alterados

- `index.html`
- `app.js`
- `styles.css`
- `server.py`
- `test_auth.sh`

## Funcionalidades principais atuais

O sistema atualmente possui:

- Login;
- Cadastro de clientes;
- Cadastro de receitas;
- Geracao de O.S.;
- Vendas;
- Orcamentos;
- Impressao de orcamento;
- Recibo de venda;
- Carne em PDF/impressao;
- Estoque categorizado;
- Financeiro por cliente;
- Baixa e reabertura de parcelas;
- Dashboard com graficos;
- Relatorios;
- Backup;
- Auditoria;
- Exportacao CSV/PDF;
- Busca global.

## Melhorias futuras recomendadas

As proximas melhorias recomendadas sao:

1. Separar `app.js` em arquivos menores por modulo.
2. Criar filtros avancados em relatorios por periodo.
3. Adicionar permissao por usuario, se houver mais de um operador.
4. Criar numeracao formal de venda, alem do ID tecnico.
5. Melhorar a geracao de O.S. com status de laboratorio.
6. Adicionar controle de entrega do oculos ao cliente.
7. Criar painel de contas do dia, com vencimentos de hoje.
8. Criar rotina de backup automatico.
9. Criar tela de restauracao de backup.
10. Adicionar favicon para evitar erro `favicon.ico 404`.

## Atualização aplicada depois das recomendações

Após a lista de melhorias futuras, foi solicitado executar todas as melhorias recomendadas. Foram aplicadas as seguintes entregas:

### Status da venda e controle de entrega

As vendas agora possuem campos de acompanhamento:

- número formal da venda, no formato `VEN-ANO-0001`;
- status operacional da venda;
- data de entrega;
- observações de entrega.

Fluxo de status disponível:

```text
Vendido -> Em laboratório -> Pronto -> Entregue
```

Na lista de vendas fechadas foram adicionados botões para avançar o status da venda.

Quando a venda chega ao status `Entregue`, fica disponível o comprovante de retirada para impressão/PDF.

### Comprovante de retirada

Foi criado um documento de retirada para o cliente assinar.

O comprovante mostra:

- cliente;
- número da venda;
- produto/serviço;
- data de entrega;
- declaração de recebimento;
- espaço para assinatura.

### Número formal de venda

Além do ID técnico interno, a venda passa a receber um número formal:

```text
VEN-2026-0001
```

Esse número facilita busca, impressão, atendimento e comunicação com o cliente.

### Status de laboratório na O.S.

As O.S. passaram a ter campos de acompanhamento:

- status;
- laboratório;
- previsão;
- retorno;
- observações.

Fluxo de status da O.S.:

```text
Enviada -> Em laboratório -> Pronta -> Retornou -> Entregue
```

Na visualização da receita, a lista de O.S. mostra o status e permite avançar a etapa.

### Filtros por período nos relatórios

A aba `Relatórios` recebeu filtro por:

- data inicial;
- data final;
- botão para voltar ao mês atual.

As métricas de vendas, recebíveis, vencidos, consulta e formas de pagamento passam a respeitar esse período.

### Contas do dia

O dashboard recebeu o bloco `Contas do dia`, com:

- parcelas vencendo hoje;
- parcelas atrasadas;
- parcelas recebidas hoje;
- vendas feitas hoje;
- total de atenção do dia.

### Backup automático

Foi criada rotina de backup automático diário ao iniciar o servidor.

O arquivo segue o formato:

```text
backups/auto_YYYYMMDD.sqlite3
```

No teste executado, foi gerado:

```text
backups/auto_20260601.sqlite3
```

### Usuários e permissões

Foi criada uma base de usuários com permissão.

A tela `Config.` agora possui a seção:

```text
Usuários e permissões
```

Permissões iniciais:

- Admin;
- Operador;
- Financeiro.

O backend salva os usuários sem expor o hash de senha na API de dados.

### Favicon

Foi adicionado `favicon.ico` e liberado no servidor para evitar o erro:

```text
GET /favicon.ico 404
```

### Arquivos impactados nesta atualização

- `server.py`
- `app.js`
- `index.html`
- `styles.css`
- `favicon.ico`
- `HISTORICO_MUDANCAS.md`

### Validações executadas nesta atualização

Foram executadas:

```bash
python3 -m py_compile server.py
python3 -c 'import server; server.init_db(); print("ok")'
git diff --check
./test_auth.sh
curl http://127.0.0.1:8000/
```

Resultado:

```text
TESTS OK
HTTP 200
```
