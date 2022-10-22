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
const Subs = require('./models/Subs');
const Teks = require('./models/Teks');

const client = new Client({
  // authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox'],
  },
  // puppeteer: { headless: false },
});

client.initialize();

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
    try {
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
        } else if (mediaReceived.filename.indexOf('1_tata_ibadah') === 0 || mediaReceived.filename.indexOf('2_tata_ibadah') === 0) {
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
            'File tidak dikenal. Pastikan nama file dan jenis file yang anda masukkan sudah benar.\nFormat nama file: \n_warta_jemaat_02-01-22_\n_1_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
          );
        }
      } else {
        if (message.body.indexOf('!Teks') === 0) {
          const teksSlice = message.body.slice(5);
          const newTeks = new Teks({ content: teksSlice, author: message.from });
          await newTeks.save();
          await client.sendMessage(message.from, 'teks diterima');
          // console.log(newTeks);
        } else if (message.body.indexOf('!LihatTeks') === 0) {
          const teks = await Teks.find().sort({ createdAt: -1 });
          if (teks[0] === undefined) {
            await client.sendMessage(message.from, 'teks belum ada');
          } else {
            await client.sendMessage(message.from, teks[0].content);
          }
        } else if (message.body.indexOf('!LihatWarta') === 0) {
          const warta = await Warta.find().sort({ createdAt: -1 });
          if (warta[0] === undefined) {
            await client.sendMessage(message.from, 'warta jemaat belum ada');
          } else {
            const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } else if (message.body.indexOf('!LihatTata') === 0) {
          const tata = await Tata.find().sort({ createdAt: -1 });
          if (tata[1] === undefined) {
            await client.sendMessage(message.from, 'tata ibadah belum ada atau cuma satu.');
          } else {
            const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
            const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
            await client.sendMessage(message.from, media1);
            await client.sendMessage(message.from, media2);
          }
        } else if (message.body.indexOf('!LihatJadwal') === 0) {
          const jadwal = await Jadwal.find().sort({ createdAt: -1 });
          if (jadwal[0] === undefined) {
            await client.sendMessage(message.from, 'jadwal belum ada');
          } else {
            const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data, jadwal[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } else if (message.body.indexOf('!BroadcastTeks') === 0) {
          const teks = await Teks.find().sort({ createdAt: -1 });
          if (teks[0] === undefined) {
            await client.sendMessage(message.from, 'teks belum ada');
          } else {
            const subses = await Subs.find();
            for (let i = 0; i < subses.length; i++) {
              await client.sendMessage(subses[i].phone, teks[0].content);
            }
          }
        } else if (message.body.indexOf('!BroadcastWarta') === 0) {
          const warta = await Warta.find().sort({ createdAt: -1 });
          if (warta[0] === undefined) {
            await client.sendMessage(message.from, 'warta jemaat belum ada');
          } else {
            const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
            const subses = await Subs.find();
            for (let i = 0; i < subses.length; i++) {
              await client.sendMessage(subses[i].phone, media);
            }
          }
        } else if (message.body.indexOf('!BroadcastTata') === 0) {
          const tata = await Tata.find().sort({ createdAt: -1 });
          if (tata[0] === undefined) {
            await client.sendMessage(message.from, 'tata ibadah belum ada');
          } else {
            const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
            const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
            const subses = await Subs.find();
            for (let i = 0; i < subses.length; i++) {
              await client.sendMessage(subses[i].phone, media1);
              await client.sendMessage(subses[i].phone, media2);
            }
          }
        } else if (message.body.indexOf('!BroadcastJadwal') === 0) {
          const jadwal = await Jadwal.find().sort({ createdAt: -1 });
          if (jadwal[0] === undefined) {
            await client.sendMessage(message.from, 'jadwal ibadah belum ada');
          } else {
            const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data, jadwal[0].dataName);
            const subses = await Subs.find();
            for (let i = 0; i < subses.length; i++) {
              await client.sendMessage(subses[i].phone, media);
            }
          }
        } else if (message.body.indexOf('!JumlahSubscriber') === 0) {
          const subses = await Subs.find();
          const subsesStr = subses.length.toString();
          await client.sendMessage(message.from, subsesStr);
        } else {
          await client.sendMessage(
            message.from,
            'Kata kunci salah.\nKata Kunci:\n\n        !Teks\n        !LihatTeks\n        !LihatWarta\n        !LihatTata\n        !LihatJadwal\n        !BroadcastTeks\n        !BroadcastWarta\n        !BroadcastTata\n        !BroadcastJadwal\n        !JumlahSubscriber\n\nFormat nama file: \n_warta_jemaat_02-01-22_\n_tata_ibadah_19-05-22_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
          );
        }
      }
    } catch (err) {
      await client.sendMessage(message.from, 'Admin Server Error.');
    }
  } else {
    try {
      // await client.sendMessage(message.from, 'SELAMAT DATANG di \n*Layanan Whatsapp*\n*_GPIB Immanuel Malang_*\n\nLayanan ini akan mulai beroperasi tanggal *22 Oktober 2022.*\n\nTuhan Yesus memberkati.');

      // await client.sendMessage(message.from, button);

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

      if (message.body.indexOf('Langganan') != -1 || message.body.indexOf('langganan') != -1) {
        const subs = await Subs.findOne({ phone: message.from });
        if (subs) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda SUDAH berlangganan.');
        } else {
          const newSubs = new Subs({ phone: message.from });
          await newSubs.save();
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda sudah berlangganan.\nNantikan informasi terbaru seputar GPIB Immanuel malang di kemudian hari.\nTerima kasih, Tuhan Yesus memberkati.');
        }
      } else if (message.body.indexOf('Berhenti') != -1 || message.body.indexOf('berhenti') != -1) {
        const subs = await Subs.findOne({ phone: message.from });
        if (!subs) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BELUM berlangganan. Silahkan balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk berlangganan secara GRATIS.');
        } else {
          await Subs.findOneAndDelete({ phone: message.from });
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BERHENTI berlangganan.\nTerima kasih, Tuhan Yesus memberkati.');
        }
      } else if (message.body.indexOf('Warta') != -1 || message.body.indexOf('warta') != -1) {
        const warta = await Warta.find().sort({ createdAt: -1 });
        if (warta.length === 0) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Warta Jemaat belum ada.');
        } else {
          const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
          await client.sendMessage(message.from, media);
        }
      } else if (message.body.indexOf('Tata') != -1 || message.body.indexOf('tata') != -1) {
        const tata = await Tata.find().sort({ createdAt: -1 });
        if (tata.length < 2) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Tata ibadah belum ada.');
        } else {
          const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
          const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
          await client.sendMessage(message.from, media1);
          await client.sendMessage(message.from, media2);
        }
      } else if (message.body.indexOf('Jadwal') != -1 || message.body.indexOf('jadwal') != -1) {
        //LIHAT JADWAL
        const jadwal = await Jadwal.find().sort({ createdAt: -1 });
        const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data);
        await client.sendMessage(message.from, media);
      } else if (message.body.indexOf('Mulai') != -1 || message.body.indexOf('mulai') != -1) {
        //FIND NEWEST WARTA & TATA
        const warta = await Warta.find().sort({ createdAt: -1 });
        const wartaNameArr = warta[0].dataName.split('');
        let wartaDateArr = [];
        for (let i = 13; i < 21; i++) {
          wartaDateArr.push(wartaNameArr[i]);
        }
        const wartaDate = wartaDateArr.join('');
        // console.log(wartaDate);

        const tata = await Tata.find().sort({ createdAt: -1 });
        const tataNameArr = tata[0].dataName.split('');
        let tataDateArr = [];
        for (let i = 14; i < 22; i++) {
          tataDateArr.push(tataNameArr[i]);
        }
        const tataDate = tataDateArr.join('');
        // console.log(tataDate);
        // console.log(warta);
        const mulai = `*[PESAN OTOMATIS]*\nAnda bisa mendapatkan dokumen Warta Jemaat, Tata Ibadah, dan Jadwal Ibadah terbaru.\nDengan cara membalas pesan ini dengan kata kunci sebagai berikut.\n\n\n    *_Warta_* = untuk mendapatkan Warta Jemaat terbaru.\n\n    *_Tata_* = untuk mendapatkan Tata Ibadah terbaru.\n\n    *_Jadwal_* = untuk mendapatkan Jadwal Ibadah seminggu.\n\n\nDokumen yang tersedia:\n- Warta Jemaat tanggal ${wartaDate}\n- Tata Ibadah tanggal ${tataDate}\n\nLayanan ini tersedia 24 jam.`;
        await client.sendMessage(message.from, mulai);
      } else {
        const opening =
          '*[PESAN OTOMATIS]*\nLayanan Whatsapp\nGPIB Immanuel Malang\n\nLayanan ini sudah berakhir atau belum dimulai.\n\nSilahkan balas pesan ini dengan kata kunci:\n\n        *_Mulai_*\n\nUntuk memulai layanan Whatsapp ini.\n\nAtau balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk menerima informasi terbaru seputar GPIB Immanuel Malang GRATIS setiap minggunya.\n\nAtau\n\n        *_Berhenti_*\n\nUntuk berhenti berlangganan.';
        await client.sendMessage(message.from, opening);
      }
    } catch (err) {
      await client.sendMessage(message.from, 'Admin Server Error.');
    }
  }
});

//LISTEN
app.listen(port, () => {
  console.log(`listening at port ${port}`);
});
