const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const bus = require('./bus');

function registerNotifyListener(client) {
  bus.on('serial-mismatch', async ({ verification, player }) => {
    try {
      if (!player.discord_id) return; // segurança: sem discord_id vinculado, não tem pra quem mandar

      const user = await client.users.fetch(player.discord_id).catch(() => null);
      if (!user) return;

      const embed = new EmbedBuilder()
        .setTitle('Confirmação de login')
        .setDescription(
          `Detectamos um login com o seu ID **${player.id}** vindo de um dispositivo diferente do último salvo. Foi você?`
        )
        .setColor(0xf1c40f);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`verify-yes-${verification.id}`)
          .setLabel('Sim, fui eu')
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`verify-no-${verification.id}`)
          .setLabel('Não fui eu')
          .setStyle(ButtonStyle.Danger)
      );

      await user.send({ embeds: [embed], components: [row] });
    } catch (err) {
      console.error('[discord] falha ao mandar DM de verificação:', err);
    }
  });
}

module.exports = { registerNotifyListener };
