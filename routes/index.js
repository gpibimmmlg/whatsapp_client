const router = require('express').Router();

router.get('/login', (req, res) => {
  res.render('login', {
    layout: 'layouts/main-layout',
  });
});

module.exports = router;
