const { pool } = require('../db');
const bus = require('../discord/bus');

/**
 * Chamado quando um serial NUNCA visto conecta no servidor.
 * Cria um ID novo, sequencial, ainda não ativado.
 */
async function getOrCreateBySerial(serial, ip) {
  const existing = await pool.query('SELECT * FROM players WHERE serial = $1', [serial]);

  let player;
  if (existing.rows.length > 0) {
    player = existing.rows[0];
  } else {
    const insert = await pool.query(
      'INSERT INTO players (serial, activated) VALUES ($1, false) RETURNING *',
      [serial]
    );
    player = insert.rows[0];
  }

  await pool.query('INSERT INTO login_log (player_id, serial, ip) VALUES ($1, $2, $3)', [
    player.id,
    serial,
    ip || null,
  ]);

  return player;
}

/**
 * Chamado quando um jogador já ativado loga informando o ID dele.
 * Se o serial bater com o salvo -> tudo certo.
 * Se for diferente -> cria uma verificação pendente e dispara o evento
 * pro bot mandar DM perguntando se foi a pessoa mesmo.
 */
async function checkLogin(id, serial, ip) {
  const result = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return { status: 'not_found' };
  }

  const player = result.rows[0];

  await pool.query('INSERT INTO login_log (player_id, serial, ip) VALUES ($1, $2, $3)', [
    player.id,
    serial,
    ip || null,
  ]);

  if (!player.activated) {
    return { status: 'not_activated', id: player.id };
  }

  if (player.serial && player.serial !== serial) {
    const insert = await pool.query(
      'INSERT INTO verifications (player_id, new_serial) VALUES ($1, $2) RETURNING *',
      [player.id, serial]
    );
    const verification = insert.rows[0];

    // avisa o bot (via evento interno) pra mandar a DM — não bloqueia o login
    bus.emit('serial-mismatch', { verification, player });

    return { status: 'ok_pending_verification', id: player.id };
  }

  // primeiro login depois de ativar: grava o serial
  if (!player.serial) {
    await pool.query('UPDATE players SET serial = $1 WHERE id = $2', [serial, player.id]);
  }

  return { status: 'ok', id: player.id };
}

async function activatePlayer(id, discordId) {
  const result = await pool.query('SELECT * FROM players WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    return { error: 'not_found' };
  }

  const player = result.rows[0];
  if (player.activated) {
    return { error: 'already_activated' };
  }

  await pool.query(
    'UPDATE players SET activated = true, discord_id = $1, activated_at = now() WHERE id = $2',
    [discordId, id]
  );

  return { ok: true };
}

async function recordVerificationResponse(verificationId, confirmed) {
  const status = confirmed ? 'confirmed' : 'denied';
  const result = await pool.query(
    'UPDATE verifications SET status = $1, resolved_at = now() WHERE id = $2 RETURNING *',
    [status, verificationId]
  );
  if (result.rows.length === 0) return { error: 'not_found' };

  const verification = result.rows[0];
  if (confirmed) {
    await pool.query('UPDATE players SET serial = $1 WHERE id = $2', [
      verification.new_serial,
      verification.player_id,
    ]);
  }

  return { ok: true, verification };
}

async function getStats() {
  const total = await pool.query('SELECT COUNT(*) FROM players WHERE activated = true');
  return { activated_total: Number(total.rows[0].count) };
}

module.exports = {
  getOrCreateBySerial,
  checkLogin,
  activatePlayer,
  recordVerificationResponse,
  getStats,
};
