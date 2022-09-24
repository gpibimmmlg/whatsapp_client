const router = require('express').Router();
const verify = require('./verifyToken');

router.get('/', verify, (req, res) => {
  res.render('index', {
    layout: 'layouts/main-layout',
    user: req.validUser.name,
  });
});

router.get('/login', (req, res) => {
  res.render('login', {
    layout: 'layouts/main-layout',
  });
});

router.get('/barcode', verify, (req, res) => {
  res.render('qr', {
    layout: 'layouts/main-layout',
  });
});

module.exports = router;
