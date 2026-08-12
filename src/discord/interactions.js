const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const playerService = require('../services/playerService');

const BTN_ABRIR_MODAL = 'verificar-id-abrir';
const MODAL_ATIVAR = 'verificar-id-modal';
const INPUT_ID = 'id_input';

function registerInteractionHandlers(client) {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isChatInputCommand() && interaction.commandName === 'painel-verificacao') {
        return handlePainelCommand(interaction);
      }

      if (interaction.isButton() && interaction.customId === BTN_ABRIR_MODAL) {
        return handleAbrirModal(interaction);
      }

      if (interaction.isModalSubmit() && interaction.customId === MODAL_ATIVAR) {
        return handleAtivarSubmit(interaction);
      }

      if (interaction.isButton() && interaction.customId.startsWith('verify-')) {
        return handleVerifyResponse(interaction);
      }
    } catch (err) {
      console.error('[discord] erro numa interação:', err);
      if (interaction.isRepliable() && !interaction.replied) {
        await interaction.reply({ content: 'Deu erro por aqui, tenta de novo.', ephemeral: true });
      }
    }
  });
}

async function handlePainelCommand(interaction) {
  const embed = new EmbedBuilder()
    .setTitle('Verificação de ID')
    .setDescription(
      'Recebeu um número de ID no jogo? Clique no botão abaixo e digite ele pra ativar sua conta.'
    )
    .setColor(0x5865f2);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(BTN_ABRIR_MODAL).setLabel('Verificar ID').setStyle(ButtonStyle.Primary)
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleAbrirModal(interaction) {
  const modal = new ModalBuilder().setCustomId(MODAL_ATIVAR).setTitle('Ativar seu ID');

  const input = new TextInputBuilder()
    .setCustomId(INPUT_ID)
    .setLabel('Qual é o seu número de ID?')
    .setStyle(TextInputStyle.Short)
    .setPlaceholder('Ex: 42')
    .setRequired(true);

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

async function handleAtivarSubmit(interaction) {
  const raw = interaction.fields.getTextInputValue(INPUT_ID).trim();
  const id = Number(raw);

  if (!Number.isInteger(id) || id <= 0) {
    return interaction.reply({ content: 'Digite só o número do ID, ex: 42.', ephemeral: true });
  }

  const result = await playerService.activatePlayer(id, interaction.user.id);

  if (result.error === 'not_found') {
    return interaction.reply({ content: `Não existe nenhum ID ${id}.`, ephemeral: true });
  }
  if (result.error === 'already_activated') {
    return interaction.reply({ content: `O ID ${id} já está ativado por alguém.`, ephemeral: true });
  }

  return interaction.reply({
    content: `ID ${id} ativado e vinculado à sua conta! Já pode entrar no servidor.`,
    ephemeral: true,
  });
}

async function handleVerifyResponse(interaction) {
  // customId no formato: verify-yes-<verificationId> ou verify-no-<verificationId>
  const [, decision, verificationId] = interaction.customId.split('-');
  const confirmed = decision === 'yes';

  const result = await playerService.recordVerificationResponse(Number(verificationId), confirmed);
  if (result.error) {
    return interaction.update({ content: 'Essa verificação já não existe mais.', components: [] });
  }

  if (confirmed) {
    return interaction.update({
      content: 'Beleza, confirmado! Login liberado normalmente.',
      components: [],
    });
  }

  // negado: avisa num canal de log de staff, se configurado
  const logChannelId = process.env.DISCORD_LOG_CHANNEL_ID;
  if (logChannelId) {
    const channel = await interaction.client.channels.fetch(logChannelId).catch(() => null);
    if (channel) {
      await channel.send(
        `⚠️ <@${interaction.user.id}> disse que **NÃO** foi ele quem tentou logar com o ID vinculado (verification #${verificationId}). Fica de olho.`
      );
    }
  }

  return interaction.update({
    content: 'Ok, registramos que não foi você. A staff foi avisada.',
    components: [],
  });
}

module.exports = { registerInteractionHandlers };
