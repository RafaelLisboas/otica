# Backend Django - Otica

Nova base do sistema da otica, criada em paralelo ao sistema antigo.

## Objetivo

Esta pasta sera a nova aplicacao backend em Django, preparada para PostgreSQL, Docker, Nginx, HTTPS e multi-loja.

O sistema antigo na raiz do repositorio permanece preservado durante a migracao.

## Stack prevista

- Django
- Django REST Framework
- PostgreSQL
- Docker
- Nginx
- Gunicorn
- WhiteNoise para arquivos estaticos simples

## Apps iniciais

- `accounts`: usuarios, perfis e permissoes.
- `stores`: lojas e vinculo operacional multi-loja.
- `clients`: clientes.
- `prescriptions`: receitas opticas.
- `stock`: estoque.
- `sales`: orcamentos e vendas.
- `finance`: parcelas, carnes e recebimentos.
- `lab_orders`: ordens de servico de laboratorio.
- `audit`: auditoria.
- `reports`: consultas agregadas e dashboard.

## Configuracao

Copie `.env.example` para `.env` e ajuste as variaveis conforme o ambiente.

Em desenvolvimento, `DJANGO_DEBUG=True`.

Em producao:

- Definir `DJANGO_DEBUG=False`.
- Configurar `DJANGO_ALLOWED_HOSTS`.
- Configurar `DJANGO_CSRF_TRUSTED_ORIGINS` com HTTPS.
- Usar PostgreSQL externo ou container dedicado.
- Servir a aplicacao via Gunicorn atras do Nginx.

## Proximas etapas

1. Criar models com suporte multi-loja.
2. Criar migrations.
3. Criar endpoints REST.
4. Criar script de migracao do SQLite antigo para PostgreSQL.
5. Validar dados importados antes da troca definitiva.
