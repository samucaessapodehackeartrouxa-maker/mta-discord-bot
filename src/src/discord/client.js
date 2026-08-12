const { Client, GatewayIntentBits, Partials, REST, Routes } = require('discord.js');
const { registerInteractionHandlers } = require('./interactions');
const { registerNotifyListener } = require('./notify');

function createDiscordClient() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel], // necessário pra conseguir mandar DM
  });

  client.once('ready', async () => {
    console.log(`[discord] logado como ${client.user.tag}`);
    await registerCommands(client);
  });

  registerInteractionHandlers(client);
  registerNotifyListener(client);

  client.login(process.env.DISCORD_BOT_TOKEN);
  return client;
}

async function registerCommands(client) {
  const guildId = process.env.DISCORD_GUILD_ID;
  if (!guildId) {
    console.warn('[discord] DISCORD_GUILD_ID não definido, comandos não registrados');
    return;
  }

  const commands = [
    {
      name: 'painel-verificacao',
      description: 'Posta o painel com o botão de verificar/ativar ID (uso de staff)',
    },
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
    body: commands,
  });
  console.log('[discord] comandos registrados no servidor');
}

module.exports = { createDiscordClient };
