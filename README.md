# Ótica Regina - Gestão Interna

Aplicação web simples para gestão de clientes, receitas, estoque e ordens de serviço de laboratório.

## Como executar

1. Use Python 3.10+.
2. No terminal, execute:

```bash
python3 server.py
```

3. Acesse `http://localhost:8000`.

## Login padrão

- Usuário: `admin`
- Senha: `admin123`

## Testes

- O script de teste automático é `test_auth.sh`.
- Ele valida login, alteração de senha e login com a senha atualizada.
- A integração de CI roda no GitHub Actions via `.github/workflows/ci.yml`.

## Melhorias aplicadas

- Autenticação baseada em sessão via cookie em vez de `sessionStorage`.
- Senha armazenada em hash seguro (PBKDF2 + SHA-256).
- Rotas protegidas no servidor para dados e APIs protegidas.
- Validação de entrada no backend para clientes, receitas e estoque.
- Arquivo `requirements.txt` para organização de dependências.
- `.gitignore` para excluir cache e banco de dados local.

## Notas

- Esta aplicação ainda é um protótipo leve com backend em Python padrão (`http.server`).
- Para produção, recomenda-se migrar para um framework web como Flask ou FastAPI e adicionar HTTPS.
