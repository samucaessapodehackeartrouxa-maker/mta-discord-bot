const express = require('express');
const { requireMtaKey } = require('./mtaAuth');
const playerService = require('../services/playerService');

const router = express.Router();

/**
 * Chamado pelo RESOURCE do MTA quando um jogador conecta.
 * Body: { serial, ip, id? }
 *
 * - Se vier "id" -> jogador já sabe o ID dele, verifica login normal (checkLogin)
 * - Se NÃO vier "id" -> serial novo, sem ID ainda -> cria um ID novo (getOrCreateBySerial)
 */
router.post('/login', requireMtaKey, async (req, res) => {
  const { serial, ip, id } = req.body;
  if (!serial) return res.status(400).json({ error: 'serial é obrigatório' });

  if (id) {
    const result = await playerService.checkLogin(id, serial, ip);
    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'id não existe' });
    }
    return res.json(result);
  }

  const player = await playerService.getOrCreateBySerial(serial, ip);
  if (!player.activated) {
    return res.json({ status: 'not_activated', id: player.id });
  }
  return res.json({ status: 'ok', id: player.id });
});

/**
 * Chamado pelo BOT quando alguém confirma o ID pelo modal "Verificar ID".
 * Body: { id, discord_id }
 */
router.post('/activate', async (req, res) => {
  const { id, discord_id } = req.body;
  if (!id || !discord_id) {
    return res.status(400).json({ error: 'id e discord_id são obrigatórios' });
  }

  const result = await playerService.activatePlayer(id, discord_id);
  if (result.error === 'not_found') return res.status(404).json({ error: 'id não existe' });
  if (result.error === 'already_activated') {
    return res.status(409).json({ error: 'esse ID já está ativado' });
  }
  return res.json({ status: 'ativado', id });
});

/**
 * Chamado pelo BOT quando a pessoa responde à DM de verificação.
 * Body: { verification_id, confirmed }
 */
router.post('/verify-response', async (req, res) => {
  const { verification_id, confirmed } = req.body;
  const result = await playerService.recordVerificationResponse(verification_id, confirmed);
  if (result.error) return res.status(404).json({ error: 'verificação não encontrada' });
  return res.json({ status: 'ok' });
});

/**
 * Contagem simples de jogadores ativados (pra usar no contador do Discord).
 */
router.get('/stats', async (_req, res) => {
  const stats = await playerService.getStats();
  res.json(stats);
});

module.exports = router;
