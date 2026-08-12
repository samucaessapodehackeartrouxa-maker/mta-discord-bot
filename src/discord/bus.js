const { EventEmitter } = require('events');

// Usado pelo playerService pra avisar o bot quando precisa mandar uma DM
// (ex: serial mudou e precisa confirmar com o dono do ID).
module.exports = new EventEmitter();
