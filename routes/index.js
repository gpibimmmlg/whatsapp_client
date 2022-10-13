const router = require('express').Router();
// const verify = require('./verifyToken');

// router.get('/', verify, (req, res) => {
//   res.render('index', {
//     layout: 'layouts/main-layout',
//     message: {
//       statusCode: 200,
//     },
//     user: req.validUser.name,
//   });
// });

// router.get('/login', (req, res) => {
//   res.render('login', {
//     layout: 'layouts/main-layout',
//     message: {
//       statusCode: 200,
//     },
//   });
// });

router.get('/barcode', (req, res) => {
  res.render('qr', {
    layout: 'layouts/main-layout',
    message: {
      statusCode: 200,
    },
  });
});

module.exports = router;
