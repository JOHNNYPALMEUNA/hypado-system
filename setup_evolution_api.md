# Guia de Instalação e Configuração da Evolution API
## Conectando o WhatsApp ao Hypado System

Este guia descreve os passos práticos para instalar a **Evolution API** em um servidor VPS próprio usando Docker, conectar o WhatsApp e configurar o Webhook para enviar mensagens em tempo real para a Inteligência Artificial do Supabase.

---

## Passo 1: Contratar uma VPS (Servidor)
Para que a Evolution API fique rodando 24 horas por dia, você precisa de um servidor virtual (VPS).
*   **Recomendados:** Hetzner, DigitalOcean, Vultr, ou Hostinger.
*   **Configuração mínima:** 1 vCPU, 2GB de RAM (custa cerca de $4 a $6 dólares/mês).
*   **Sistema Operacional:** Ubuntu 22.04 LTS ou Ubuntu 24.04 LTS.

---

## Passo 2: Instalar o Docker no Servidor
Após contratar a VPS e acessar via SSH, execute os seguintes comandos para instalar o Docker:

```bash
# Atualizar o sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Instalar Docker Compose
sudo apt install docker-compose-plugin -y
```

---

## Passo 3: Criar o arquivo de Configuração da Evolution API
Crie uma pasta para a API e configure o Docker Compose:

```bash
mkdir evolution-api
cd evolution-api
nano docker-compose.yml
```

Cole o conteúdo abaixo dentro do arquivo `docker-compose.yml`:

```yaml
version: '3.8'

services:
  evolution_api:
    image: atendare/evolution-api:v2.1.1
    container_name: evolution_api
    restart: always
    ports:
      - "8080:8080"
    environment:
      - SERVER_URL=http://IP_DA_SUA_VPS:8080
      - API_KEY=SUA_CHAVE_DE_APICACAO_AQUI_123 # Crie uma senha segura aqui
      - DELAY_MESSAGES=true
      - AUTHENTICATION_TYPE=apikey
      - WEBSOCKET_ENABLED=false
```

> [!IMPORTANT]
> Substitua `IP_DA_SUA_VPS` pelo IP real da sua VPS e `SUA_CHAVE_DE_APICACAO_AQUI_123` por uma senha forte criada por você.

Salve o arquivo pressionando `Ctrl + O` depois `Enter` e saia com `Ctrl + X`.

---

## Passo 4: Rodar o Serviço
Inicie o container da Evolution API com o comando:

```bash
docker compose up -d
```

Verifique se está rodando acessando no navegador: `http://IP_DA_SUA_VPS:8080`. Se exibir um retorno JSON ou a página da API, está rodando!

---

## Passo 5: Conectar o WhatsApp e Escanear QR Code
A Evolution API possui um gerenciador visual (Evolution Manager) ou você pode criar instâncias via chamadas HTTP (Postman/Insomnia/cURL) ou pelo Manager Oficial.

### Criar Instância pelo Terminal:
Execute este comando na sua máquina local ou servidor para criar uma conexão:

```bash
curl -X POST "http://IP_DA_SUA_VPS:8080/instance/create" \
  -H "apikey: SUA_CHAVE_DE_APICACAO_AQUI_123" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "Vendedor_1",
    "token": "senha_da_instancia_secreta",
    "number": "5562999999999",
    "qrcode": true
  }'
```

Esse comando retornará o **QR Code em formato Base64** ou o link para visualizá-lo. Escaneie pelo WhatsApp do celular em "Aparelhos Conectados".

---

## Passo 6: Configurar o Webhook para o Supabase
Agora, configure o Webhook para que a Evolution API avise seu Supabase sempre que receber uma mensagem de grupo.

### Ativar Webhook via cURL:
```bash
curl -X POST "http://IP_DA_SUA_VPS:8080/webhook/set/Vendedor_1" \
  -H "apikey: SUA_CHAVE_DE_APICACAO_AQUI_123" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://SUA_URL_DO_SUPABASE.supabase.co/functions/v1/whatsapp-webhook",
    "events": [
      "messages.upsert"
    ]
  }'
```

Substitua `https://SUA_URL_DO_SUPABASE.supabase.co` pela URL oficial do seu projeto no Supabase.

---

## Passo 7: Como pegar o JID do Grupo de Obra
Para vincular o grupo à OS no sistema:
1. Abra o grupo de WhatsApp no celular e envie qualquer mensagem.
2. Acesse o log da sua Supabase Edge Function no painel do Supabase.
3. Você verá o log da requisição contendo o campo `remoteJid` (ex: `120363028372648@g.us`).
4. Copie esse ID (`remoteJid`) e cole no campo "Grupo do WhatsApp" da Ordem de Serviço correspondente no Hypado System.
