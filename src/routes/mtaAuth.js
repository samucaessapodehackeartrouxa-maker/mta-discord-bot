// Protege as rotas que o servidor MTA chama, exigindo o header x-mta-key
// batendo com a variável de ambiente MTA_API_KEY.
function requireMtaKey(req, res, next) {
  const key = req.header('x-mta-key');
  if (!key || key !== process.env.MTA_API_KEY) {
    return res.status(401).json({ error: 'chave inválida' });
  }
  next();
}

module.exports = { requireMtaKey };
