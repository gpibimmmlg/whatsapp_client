const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
  let token = req.cookies['x-access-token'];

  if (!token)
    return res.render('login', {
      layout: 'layouts/main-layout',
      title: 'Login',
      msg: 'Please login first',
    }); // if there is no token

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err)
      return res.render('login', {
        layout: 'layouts/main-layout',
        title: 'Login',
        msg: 'Please login first',
      });
    req.validUser = user;
    next();
  });
};
