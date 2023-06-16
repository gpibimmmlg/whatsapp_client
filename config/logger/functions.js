function infoLog(childLogger, msg, status, phoneNumber) {
  childLogger.info(msg, {
    status,
    phoneNumber,
  });
}

function errorLog(childLogger, error, info) {
  childLogger.error(error, { info });
}

module.exports = {
  infoLog,
  errorLog,
};
