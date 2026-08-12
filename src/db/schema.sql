-- Tabela principal: cada linha é um ID de jogador
CREATE TABLE IF NOT EXISTS players (
  id           SERIAL PRIMARY KEY,        -- o ID sequencial do jogo (1, 2, 3...)
  serial       TEXT,                      -- serial do MTA (getPlayerSerial) atual
  discord_id   TEXT,                      -- id do usuário no Discord, preenchido ao ativar
  activated    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  activated_at TIMESTAMPTZ
);

-- Histórico de logins, útil pra staff investigar depois
CREATE TABLE IF NOT EXISTS login_log (
  log_id     SERIAL PRIMARY KEY,
  player_id  INTEGER REFERENCES players(id),
  serial     TEXT,
  ip         TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Verificações pendentes: quando um ID loga com serial diferente do salvo
CREATE TABLE IF NOT EXISTS verifications (
  id          SERIAL PRIMARY KEY,
  player_id   INTEGER REFERENCES players(id),
  new_serial  TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | confirmed | denied
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
