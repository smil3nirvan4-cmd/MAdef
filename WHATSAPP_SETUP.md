# 📱 Configuração do WhatsApp - Mãos Amigas

Devido a limitações técnicas do Next.js com WebSockets persistentes, a integração do WhatsApp requer um servidor separado rodando em paralelo.

## 🚀 Como Iniciar

Você precisa de **dois terminais** abertos:

### Terminal 1: Aplicação Web
Roda o site e o painel admin.
```bash
npm run dev
```
Acesse: http://localhost:3000

### Terminal 2: Servidor WhatsApp
Mantém a conexão com o WhatsApp ativa.
```bash
npm run whatsapp
```

## 🔗 Como Conectar
1. Certifique-se que o Terminal 2 está rodando.
2. Acesse o Painel Admin > Conexão WhatsApp (http://localhost:3000/admin/whatsapp).
3. Um QR Code aparecerá na tela.
4. Escaneie com seu celular (WhatsApp > Menu > Aparelhos Conectados > Conectar).

## ⚠️ Solução de Problemas comum

### QR Code não aparece
- Verifique se o `npm run whatsapp` está rodando.
- Se o terminal mostrar "Conexão fechada", ele tentará reconectar automaticamente. Aguarde.

### Erro "Stream Errored (xml-not-well-formed)"
- É uma instabilidade temporária da conexão com o WhatsApp. O sistema reconecta automaticamente em 5 segundos. Não precisa fazer nada.

### Mensagens não chegam
- O sistema agora exige uma conexão com banco de dados para salvar as avaliações. Se o arquivo `dev.db` não existir, rode `npx prisma db push`.
