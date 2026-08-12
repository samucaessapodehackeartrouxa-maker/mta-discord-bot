require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ensureSchema } = require('./db');
const playersRouter = require('./routes/players');
const { createDiscordClient } = require('./discord/client');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/', (_req, res) => res.send('mta-discord-backend rodando'));
app.use('/api/players', playersRouter);

const PORT = process.env.PORT || 3000;

ensureSchema()
  .then(() => {
    app.listen(PORT, () => console.log(`[server] rodando na porta ${PORT}`));

    if (process.env.DISCORD_BOT_TOKEN) {
      createDiscordClient();
    } else {
      console.warn('[discord] DISCORD_BOT_TOKEN não definido, bot não iniciado');
    }
  })
  .catch((err) => {
    console.error('[db] falha ao garantir schema:', err);
    process.exit(1);
  });
