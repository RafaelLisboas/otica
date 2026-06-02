# Deploy VPS Django

Guia simples para rodar a nova versao Django em uma VPS Ubuntu com Docker, PostgreSQL e Nginx.

## 1. Preparar a VPS

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw
```

## 2. Instalar Docker

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo install -m 0644 /dev/stdin /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Saia da sessao SSH e entre novamente para aplicar o grupo `docker`.

## 3. Configurar firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

## 4. Configurar projeto

```bash
git clone https://github.com/RafaelLisboas/otica.git
cd otica/backend_django
cp .env.example .env
cp nginx/nginx.conf.example nginx/nginx.conf
```

Edite `.env`:

```bash
nano .env
```

Campos obrigatorios:

```text
DJANGO_SECRET_KEY=uma-chave-segura
DJANGO_ALLOWED_HOSTS=seudominio.com.br,www.seudominio.com.br
DJANGO_CSRF_TRUSTED_ORIGINS=https://seudominio.com.br,https://www.seudominio.com.br
POSTGRES_PASSWORD=uma-senha-forte
```

Edite `nginx/nginx.conf` e troque `seudominio.com.br` pelo dominio real.

## 5. Primeiro start sem HTTPS

Para emitir certificado, o Nginx precisa responder em HTTP. Temporariamente, use apenas o bloco HTTP do arquivo `nginx.conf` ou remova o bloco HTTPS ate emitir o certificado.

Suba os containers:

```bash
docker compose up -d --build
```

Verifique:

```bash
docker compose ps
docker compose logs -f web
```

## 6. Criar superusuario Django

```bash
docker compose exec web python manage.py createsuperuser
```

## 7. HTTPS com Certbot

Instale Certbot no host:

```bash
sudo apt install -y certbot
```

Pare o Nginx do compose se a porta 80 estiver ocupada:

```bash
docker compose stop nginx
```

Emita o certificado:

```bash
sudo certbot certonly --standalone -d seudominio.com.br -d www.seudominio.com.br
```

Copie os certificados para a pasta esperada pelo compose:

```bash
mkdir -p certbot/conf
sudo cp -r /etc/letsencrypt/* certbot/conf/
sudo chown -R $USER:$USER certbot
```

Restaure o arquivo `nginx/nginx.conf` completo com HTTPS e suba novamente:

```bash
docker compose up -d
```

## 8. Backup PostgreSQL

Backup manual:

```bash
docker compose exec web sh scripts/backup_postgres.sh
```

Alternativa recomendada: executar pelo host usando o container `db`:

```bash
docker compose exec db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > /backups/manual_$(date +%Y%m%d_%H%M%S).sql.gz'
```

Agendamento simples no host:

```bash
crontab -e
```

Exemplo diario as 02:00:

```text
0 2 * * * cd /caminho/otica/backend_django && docker compose exec -T db sh -c 'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > /backups/otica_$(date +\%Y\%m\%d_\%H\%M\%S).sql.gz'
```

## 9. Migracao dos dados antigos

Depois que o banco novo estiver pronto:

```bash
docker compose exec web python scripts/migrate_sqlite_to_postgres.py
```

Antes disso, coloque o arquivo `otica_regina.sqlite3` na raiz do repositorio na VPS.

## 10. Comandos uteis

```bash
docker compose ps
docker compose logs -f
docker compose restart web
docker compose exec web python manage.py migrate
docker compose exec web python manage.py collectstatic --noinput
```

## Observacoes

- O volume `postgres_data` preserva os dados do PostgreSQL.
- O sistema antigo continua separado na raiz do repositorio.
- Nao apague `otica_regina.sqlite3` antes de validar a migracao.
