const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
// const indexRoute = require('./routes/index.js');
// const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, MessageMedia, Buttons } = require('whatsapp-web.js');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
// const cookieParser = require('cookie-parser');
dotenv.config();

// const authRoute = require('./routes/auth');
const indexRoute = require('./routes/index');

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
// app.use(cookieParser());

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
// app.use('/api/auth', authRoute);

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
  if (message.from === '6285172160300@c.us') {
    if (message.hasMedia) {
      const mediaReceived = await message.downloadMedia();
      if (mediaReceived.filename === 'warta_jemaat.pdf') {
        //SIMPAN WARTA JEMAAT KE DB
        await client.sendMessage(message.from, 'warta jemaat diterima');
      } else if (mediaReceived.filename === 'tata_ibadah.pdf') {
        //SIMPAN TATA IBADAH KE DB
        await client.sendMessage(message.from, 'tata ibadah diterima');
      } else if (mediaReceived.filename === 'undefined') {
        //SIMPAN JADWAL IBADAH KE DB
        await client.sendMessage(message.from, 'jadwal ibadah diterima');
      } else {
        await client.sendMessage(message.from, 'file tidak dikenal');
      }
    } else {
      await client.sendMessage(message.from, 'Masukkan Warta Jemaat, Tata Ibadah, atau Jadwal Ibadah dengan format yang sudah ditentukan.');
    }
  } else {
    await client.sendMessage(
      message.from,
      'SELAMAT DATANG di *Layanan Whatsapp _GPIB Immanuel Malang_*\nAnda dapat mengakses TATA IBADAH, WARTA JEMAAT, dan JADWAL IBADAH melalui Layanan Whatsapp ini.\nLayanan ini akan mulai beroperasi tanggal *22 Oktober 2022*\nTuhan Yesus memberkati.'
    );
    // const tanggal = '00/00/00';
    // const periode = '00/00/00 - 00/00/00';

    //  //REPLY PERTAMA
    // const buttons_reply = new Buttons(
    //   `Ini adalah Layanan Whatsapp GPIB Immanuel Malang.\nAnda bisa mendapatkan dokumen Warta Jemaat dan Jadwal Ibadah PELKAT dengan menekan tombol di bawah.\nLayanan ini tersedia 24 jam.\n\n_Dokumen terbaru:_\n_Warta Jemaat: ${tanggal}_\n_Jadwal Ibadah: ${periode}_`,
    //   [
    //     { body: 'Warta Jemaat', id: 'test-1' },
    //     { body: 'Jadwal Ibadah', id: 'test-2' },
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

    //  //OPENING
    // const buttons_reply_mulai = new Buttons('Layanan ini sudah berakhir atau belum dimulai.', [{ body: 'Mulai', id: 'test-7' }], 'Layanan Whatsapp GPIB Immanuel Malang', 'Silahkan tekan tombol di bawah untuk memulai.'); // Reply button

    // const media = MessageMedia.fromFilePath('./public/pdf/warta_jemaat_minggu_tanggal.pdf');

    // if (message.body === 'Warta Jemaat') {
    //   await client.sendMessage(message.from, 'Warta Jemaat belum ada');
    // } else if (message.body === 'Jadwal Ibadah') {
    //   await client.sendMessage(message.from, 'Jadwal Ibadah belum ada.');
    // } else if (message.body === 'Litbang') {
    //   await client.sendMessage(message.from, 'Litbang belum ada.');
    // } else if (message.body === 'Info') {
    //   await client.sendMessage(message.from, 'Info belum ada.');
    // } else if (message.body === 'Merchandise') {
    //   await client.sendMessage(message.from, 'Merchandise belum ada.');
    // } else if (message.body === 'Mulai') {
    //   await client.sendMessage(message.from, buttons_reply);
    //   await client.sendMessage(message.from, buttons_reply_lainlain);
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
