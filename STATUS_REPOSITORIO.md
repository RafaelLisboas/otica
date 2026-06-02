# Status do repositorio - Sistema Otica Regina

Atualizado em: 02/06/2026 11:21:50 -03

## Repositorio

- Remoto: `https://github.com/RafaelLisboas/otica.git`
- Branch principal: `master`
- Ultimo commit sincronizado antes deste documento: `342b299 Implementa melhorias completas do sistema da otica`

## Estado atual

O sistema principal da Otica Regina esta versionado no GitHub com as melhorias recentes:

- vendas e orcamentos;
- financeiro por cliente;
- estoque por categorias;
- dashboard modernizado;
- relatorios;
- auditoria;
- backup;
- vinculo de venda com receita/O.S.;
- carne e impressao de orcamento;
- usuarios e permissoes base;
- melhorias de seguranca no backend.

## Como rodar localmente

Para acessar pela rede usando o IP do servidor:

```bash
cd /home/otica
OTICA_HOST=0.0.0.0 OTICA_PORT=8000 python3 server.py
```

Enderecos esperados:

```text
http://10.98.1.159:8000/
http://192.168.100.60:8000/
```

O segundo endereco funciona apenas se o IP `192.168.100.60` estiver configurado na maquina.

## Validacao rapida

```bash
ss -ltnp | grep ':8000'
curl -I http://127.0.0.1:8000/
curl -I http://10.98.1.159:8000/
```

## Observacao sobre Nginx

O Nginx esta ativo na porta `80`, mas no diagnostico mais recente ele estava servindo a pagina padrao de `/var/www/html`.

Para abrir o sistema sem informar `:8000`, sera necessario configurar o Nginx para encaminhar as requisicoes para o backend Python.
