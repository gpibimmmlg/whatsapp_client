const router = require('express').Router();

router.get('/', (req, res) => {
  res.render('index', {
    layout: 'layouts/main-layout',
  });
});

router.get('/login', (req, res) => {
  res.render('login', {
    layout: 'layouts/main-layout',
  });
});

router.get('/barcode', (req, res) => {
  res.render('qr', {
    layout: 'layouts/main-layout',
  });
});

module.exports = router;
