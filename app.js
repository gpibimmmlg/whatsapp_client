const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
// const indexRoute = require('./routes/index.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, MessageMedia, Buttons } = require('whatsapp-web.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
dotenv.config();

const authRoute = require('./routes/auth');
const indexRoute = require('./routes/index');

//IMPORT MONGOOSE MODELS
const Tata = require('./models/Tata');
const Warta = require('./models/Warta');
const Jadwal = require('./models/Jadwal');

const client = new Client({
  // authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
  },
});

//DECLARATION
const app = express();
const port = process.env.PORT || 3000;

//MIDDLEWARES
app.use(expressLayouts);
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(`${__dirname}/public`)); // make files able to access
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Mongodb Connect
mongoose
  .connect(process.env.MONGO_SECRET, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(console.log('connected to DB!'))
  .catch((err) => {
    console.log(err);
  });

//Generate WA QR
let qrView;
client.on('qr', (qr) => {
  // qrcode.generate(qr, { small: true });

  QRCode.toDataURL(qr, (err, url) => {
    qrView = url;
  });
});

//ROUTES
app.use('/', indexRoute);
app.use('/api/auth', authRoute);

app.get('/api/qr', (req, res) => {
  res.json({
    qrClient: qrView,
  });
});

//WHATSAPP BOT LOGIC
client.on('ready', () => {
  console.log('Client is ready!');
  qrView = 'ready';
});

client.on('message', async (message) => {
  if (message.from === process.env.ADMIN_NUMBER) {
    if (message.hasMedia) {
      const mediaReceived = await message.downloadMedia();
      if (mediaReceived.filename === undefined) {
        mediaReceived.filename = 'undefined';
      }
      if (mediaReceived.filename.indexOf('warta_jemaat') === 0) {
        //SIMPAN WARTA JEMAAT KE DB
        const newWarta = new Warta({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
        await newWarta.save();

        //REPLY TO ADMIN
        await client.sendMessage(message.from, 'warta jemaat diterima');
      } else if (mediaReceived.filename.indexOf('tata_ibadah') === 0) {
        //SIMPAN TATA IBADAH KE DB
        const newTata = new Tata({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
        await newTata.save();

        //REPLY TO ADMIN
        await client.sendMessage(message.from, 'tata ibadah diterima');
      } else if (mediaReceived.filename === 'undefined') {
        //SIMPAN WARTA JEMAAT KE DB
        const newJadwal = new Jadwal({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
        await newJadwal.save();

        //REPLY TO ADMIN
        await client.sendMessage(message.from, 'jadwal ibadah diterima');
      } else {
        // console.log(media);
        await client.sendMessage(
          message.from,
          'File tidak dikenal. Pastikan nama file dan jenis file yang anda masukkan sudah benar.\nFormat nama file: \n_warta_jemaat_02-01-22_\n_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
        );
      }
    } else {
      await client.sendMessage(
        message.from,
        'Masukkan Warta Jemaat, Tata Ibadah, atau Jadwal Ibadah dengan format yang sudah ditentukan.\nFormat nama file: \n_warta_jemaat_02-01-22_\n_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
      );
    }
  } else {
    await client.sendMessage(message.from, 'SELAMAT DATANG di \n*Layanan Whatsapp*\n*_GPIB Immanuel Malang_*\n\nLayanan ini akan mulai beroperasi tanggal *22 Oktober 2022.*\n\nTuhan Yesus memberkati.');

    // //FIND NEWEST WARTA & TATA
    // const warta = await Warta.find().sort({ createdAt: -1 });
    // const wartaNameArr = warta[0].dataName.split('');
    // let wartaDateArr = [];
    // for (let i = 13; i < 21; i++) {
    //   wartaDateArr.push(wartaNameArr[i]);
    // }
    // const wartaDate = wartaDateArr.join('');
    // // console.log(wartaDate);

    // const tata = await Tata.find().sort({ createdAt: -1 });
    // const tataNameArr = tata[0].dataName.split('');
    // let tataDateArr = [];
    // for (let i = 12; i < 20; i++) {
    //   tataDateArr.push(tataNameArr[i]);
    // }
    // const tataDate = tataDateArr.join('');
    // // console.log(tataDate);
    // // console.log(warta);

    // //REPLY PERTAMA
    // const buttons_reply = new Buttons(
    //   `Ini adalah Layanan Whatsapp GPIB Immanuel Malang.\nAnda bisa mendapatkan dokumen Warta Jemaat dan Jadwal Ibadah PELKAT dengan menekan tombol di bawah.\nLayanan ini tersedia 24 jam.\n\n_Dokumen yang tersedia:_\n_Warta Jemaat: tanggal ${wartaDate}_\n_Tata Ibadah: tanggal ${tataDate}_`,
    //   [
    //     { body: 'Warta Jemaat', id: 'test-1' },
    //     { body: 'Tata Ibadah', id: 'test-2' },
    //     { body: 'Jadwal Ibadah', id: 'test-3' },
    //   ],
    //   'SELAMAT DATANG!!!',
    //   'Pilih dokumen yang anda inginkan'
    // ); // Reply button

    //  // REPLY KEDUA
    // const buttons_reply_lainlain = new Buttons('GPIB Immanuel Malang juga dapat memberi anda dokumen-dokumen lainnya, seperti:', [
    //   { body: 'Litbang', id: 'test-4' },
    //   { body: 'Info', id: 'test-5' },
    //   { body: 'Merchandise', id: 'test-6' },
    // ]); // Reply button

    // //OPENING
    // const buttons_reply_mulai = new Buttons('Layanan ini sudah berakhir atau belum dimulai.', [{ body: 'Mulai', id: 'test-4' }], 'Layanan Whatsapp GPIB Immanuel Malang', 'Silahkan tekan tombol di bawah untuk memulai.'); // Reply button

    // const buttons_reply_kembali = new Buttons('Butuh dokumen lainnya?', [{ body: 'Kembali ke menu utama', id: 'test-5' }]); // Reply button

    // // const media = MessageMedia.fromFilePath('./public/pdf/warta_jemaat_minggu_tanggal.pdf');

    // if (message.body === 'Warta Jemaat') {
    //   const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
    //   await client.sendMessage(message.from, media);
    //   await client.sendMessage(message.from, buttons_reply_kembali);
    // } else if (message.body === 'Tata Ibadah') {
    //   const media = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
    //   await client.sendMessage(message.from, media);
    //   await client.sendMessage(message.from, buttons_reply_kembali);
    // } else if (message.body === 'Jadwal Ibadah') {
    //   const jadwal = await Jadwal.find().sort({ createdAt: -1 });
    //   const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data);
    //   await client.sendMessage(message.from, media);
    //   await client.sendMessage(message.from, buttons_reply_kembali);
    // } else if (message.body === 'Kembali ke menu utama') {
    //   await client.sendMessage(message.from, buttons_reply);
    // } else if (message.body === 'Mulai') {
    //   await client.sendMessage(message.from, buttons_reply);
    // } else {
    //   await client.sendMessage(message.from, buttons_reply_mulai);
    // }
  }
});

client.initialize();

//LISTEN
app.listen(port, () => {
  console.log(`listening at port ${port}`);
});
