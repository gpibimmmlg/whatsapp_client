const logger = require('./logger');

const adminLogger = logger.child({ feature: 'Admin' });
const publicLogger = logger.child({ feature: 'Public' });

module.exports = {
  adminLogger,
  publicLogger,
};
