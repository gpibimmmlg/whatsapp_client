const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const path = require('path');
// const indexRoute = require('./routes/index.js');
const qrcode = require('qrcode-terminal');
const QRCode = require('qrcode');
const { Client, MessageMedia, Buttons, LocalAuth } = require('whatsapp-web.js');
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
const Immanuel = require('./models/Immanuel');
const Keuangan = require('./models/Keuangan');
const Teologi = require('./models/Teologi');

const client = new Client({
  // authStrategy: new LocalAuth(),
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    // headless: false,
  },
  // puppeteer: { headless: false },
});

client.initialize();

//DECLARATION
const app = express();
const port = process.env.PORT || 80;

//MIDDLEWARES
app.use(expressLayouts);
app.use(express.json({ limit: '10mb' }));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ limit: '10mb', extended: false }));
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(`${__dirname}/public`)); // make files able to access
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// // Mongodb Connect
// mongoose
//   .connect(process.env.MONGO_SECRET, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
//   })
//   .then(console.log('connected to DB!'))
//   .catch((err) => {
//     console.log(err);
//   });

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_SECRET, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('MongoDB connected!!');
  } catch (err) {
    console.log('Failed to connect to MongoDB', err);
  }
};
connectDB();

//Generate WA QR
let qrView;
let tanggalWarta;
let tanggalTata;
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

client.on('authenticated', (session) => {
  // Save the session object however you prefer.
  // Convert it to json, save it to a file, store it in a database...
  console.log('AUTHENTICATED');
});

client.on('disconnected', (reason) => {
  // console.log('disconnected');
  console.log('disconnected', reason);
});

client.on('message', async (message) => {
  const replyError = '[PESAN OTOMATIS]\nTerjadi gangguan.\nSilahkan coba beberapa saat lagi';
  const replyLoading = '[PESAN OTOMATIS]\nMohon tunggu...';
  const replyClosing = '[PESAN OTOMATIS]\nTerima kasih telah mengunduh.';
  if (message.from === process.env.ADMIN_NUMBER) {
    if (message.hasMedia) {
      const mediaReceived = await message.downloadMedia();
      if (mediaReceived.filename === undefined) {
        mediaReceived.filename = 'undefined';
      }
      if (mediaReceived.filename.indexOf('1_tata_ibadah') === 0 || mediaReceived.filename.indexOf('2_tata_ibadah') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN TATA IBADAH KE DB
          const newTata = new Tata({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newTata.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'tata ibadah diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (mediaReceived.mimetype === 'image/png' || mediaReceived.mimetype === 'image/jpeg' || mediaReceived.mimetype === 'image/jpg') {
        await client.sendMessage(message.from, replyLoading);
        try {
          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN WARTA JEMAAT KE DB
          const newJadwal = new Jadwal({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newJadwal.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'jadwal diterima.');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (mediaReceived.filename.indexOf('warta_immanuel') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN WARTA JEMAAT KE DB
          const newImm = new Immanuel({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newImm.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'warta immanuel diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (mediaReceived.filename.indexOf('laporan_keuangan') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN WARTA JEMAAT KE DB
          const newKeuangan = new Keuangan({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newKeuangan.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'laporan keuangan diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (mediaReceived.filename.indexOf('liturgi_pelayan') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN WARTA JEMAAT KE DB
          const newTeologi = new Teologi({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newTeologi.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'liturgi pelayan diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else {
        // console.log(media);
        await client.sendMessage(
          message.from,
          'File tidak dikenal. Pastikan nama file dan jenis file yang anda masukkan sudah benar.\nFormat nama file: \n_warta_jemaat_02-01-22_\n_1_tata_ibadah_19-05-22_\n_warta_immanuel_27-10-23_\n_laporan_keuangan_17-01-23_\n_liturgi_pelayan_06-12-23_\nJenis file:\nWarta Jemaat = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)'
        );
      }
    } else {
      if (message.body.indexOf('!Teks') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const teksSlice = message.body.slice(5);
          const teksContent = '*[PESAN OTOMATIS KHUSUS PELANGGAN]*\n' + teksSlice;
          const newTeks = new Teks({ content: teksContent, author: message.from });
          await newTeks.save();
          await client.sendMessage(message.from, 'teks diterima');
          // console.log(newTeks);
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }

        //update
      } else if (message.body.indexOf('!LihatTeks') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const teks = await Teks.find().sort({ createdAt: -1 });
          if (teks[0] === undefined) {
            await client.sendMessage(message.from, 'teks belum ada');
          } else {
            await client.sendMessage(message.from, teks[0].content);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!LihatWartaImmanuel') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const immanuel = await Immanuel.find().sort({ createdAt: -1 });
          if (immanuel[0] === undefined) {
            await client.sendMessage(message.from, 'warta immanuel belum ada');
          } else {
            // const dataString = immanuel[0].data.toString('base64');
            const media = new MessageMedia(immanuel[0].dataType, immanuel[0].data, immanuel[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!LihatLaporanKeuangan') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const keuangan = await Keuangan.find().sort({ createdAt: -1 });
          if (keuangan[0] === undefined) {
            await client.sendMessage(message.from, 'laporan keuangan belum ada');
          } else {
            // const dataString = keuangan[0].data.toString('base64');
            const media = new MessageMedia(keuangan[0].dataType, keuangan[0], keuangan[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!LihatLiturgiPelayan') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const teologi = await Teologi.find().sort({ createdAt: -1 });
          if (teologi[0] === undefined) {
            await client.sendMessage(message.from, 'liturgi pelayan belum ada');
          } else {
            // const dataString = teologi[0].data.toString('base64');
            const media = new MessageMedia(teologi[0].dataType, teologi[0].data, teologi[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!LihatTata') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const tata = await Tata.find().sort({ createdAt: -1 });
          if (tata[1] === undefined) {
            await client.sendMessage(message.from, 'tata ibadah belum ada atau cuma satu.');
          } else {
            // const dataString0 = tata[0].data.toString('base64');
            // const dataString1 = tata[1].data.toString('base64');
            const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
            const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
            await client.sendMessage(message.from, media1);
            await client.sendMessage(message.from, media2);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!LihatJadwal') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const jadwal = await Jadwal.find().sort({ createdAt: -1 });
          if (jadwal[0] === undefined) {
            await client.sendMessage(message.from, 'jadwal belum ada');
          } else {
            // const dataString = jadwal[0].data.toString('base64');
            const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data, jadwal[0].dataName);
            await client.sendMessage(message.from, media);
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!BroadcastTeks') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const teks = await Teks.find().sort({ createdAt: -1 });
          if (teks[0] === undefined) {
            await client.sendMessage(message.from, 'teks belum ada');
          } else {
            const subses = await Subs.find();
            for (let i = 0; i < subses.length; i++) {
              await client.sendMessage(subses[i].phone, teks[0].content);
            }
            await client.sendMessage(message.from, 'Teks terkirim.');
          }
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!UpdateTanggal') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          updateTanggalWartaTata();
          await client.sendMessage(message.from, 'Tanggal Warta dan Tata berhasil diupdate.');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (message.body.indexOf('!JumlahSubscriber') === 0) {
        await client.sendMessage(message.from, replyLoading);
        try {
          const subses = await Subs.find();
          const subsesStr = subses.length.toString();
          await client.sendMessage(message.from, subsesStr);
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else {
        await client.sendMessage(
          message.from,
          'Kata kunci salah.\nKata Kunci:\n\n        !Teks\n        !LihatTeks\n        !LihatWarta\n        !LihatTata\n        !LihatJadwal\n        !BroadcastTeks\n        !JumlahSubscriber\n\nFormat nama file: \n_1_tata_ibadah_19-05-22_\n_warta_immanuel_27-10-23_\n_laporan_keuangan_17-01-23_\n_liturgi_pelayan_06-12-23_\nJenis file:\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)\nWarta Immanuel = _pdf_ (file document)\nLaporan Keuangan = _pdf_ (file document)\nLiturgi Pelayan = _pdf_ (file document)'
        );
      }
    }
  } else if (message.from != process.env.RESTRICTED_NUMBER) {
    // await client.sendMessage(message.from, '[Pesan Otomatis]\nLayanan Whatsapp ini sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanan ini.');
    const messageReceived = message.body.replace(/\s/g, '').toLowerCase();
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //>>>>>>>>>>>>>>>>>> NON-BUTTON CODE <<<<<<<<<<<<<<<<<<<
    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    // if (message.body.indexOf('Mulai') === 0 || message.body.indexOf('mulai') === 0) {
    //   if (!tanggalWarta) {
    //     tanggalWarta = 'DD/MM/YY';
    //   }
    //   if (!tanggalTata) {
    //     tanggalTata = 'DD/MM/YY';
    //   }
    //   const reply1 = `[PESAN OTOMATIS]\nSilahkan membalas pesan ini dengan kata kunci yang tersedia.\n\nKata kunci:\n\n        *_Warta_*\nUntuk mendapatkan Warta Jemaat Terbaru.\n\n        *_Tata_*\nUntuk mendapatkan Tata Ibadah Minggu.\n\n        *_Jadwal_*\nUntuk mendapatkan Jadwal Ibadah Sepekan.\n\n        *_Langganan_*\nUntuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n\n        *_Berhenti_*\nUntuk berhenti berlangganan.\n\n\nCatatan:\nDokumen yang tersedia, yaitu\nWarta Jemaat: tanggal ${tanggalWarta}\nTata Ibadah: tanggal ${tanggalTata}`;
    //   await client.sendMessage(message.from, reply1);
    // } else if (message.body.indexOf('Jadwal') === 0 || message.body.indexOf('jadwal') === 0) {
    //   await client.sendMessage(message.from, replyLoading);
    //   try {
    //     //LIHAT JADWAL
    //     const jadwal = await Jadwal.find().sort({ createdAt: -1 });
    //     if (!jadwal) {
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nJadwal Ibadah belum ada.');
    //     } else {
    //       const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data);
    //       await client.sendMessage(message.from, media);
    //     }
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    // } else if (message.body.indexOf('Tata') === 0 || message.body.indexOf('tata') === 0) {
    //   await client.sendMessage(message.from, replyLoading);
    //   try {
    //     const tata = await Tata.find().sort({ createdAt: -1 });
    //     if (tata.length < 2) {
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nMohon maaf, Tata ibadah belum ada.');
    //     } else {
    //       const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
    //       const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
    //       await client.sendMessage(message.from, media1);
    //       await client.sendMessage(message.from, media2);
    //     }
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    // } else if (message.body.indexOf('Warta') === 0 || message.body.indexOf('warta') === 0) {
    //   await client.sendMessage(message.from, replyLoading);
    //   try {
    //     const warta = await Warta.find().sort({ createdAt: -1 });
    //     if (!warta) {
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nWarta Jemaat belum ada.');
    //     } else {
    //       const media = new MessageMedia(warta[0].dataType, warta[0].data, warta[0].dataName);
    //       await client.sendMessage(message.from, media);
    //     }
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    // } else if (message.body.indexOf('Langganan') === 0 || message.body.indexOf('langganan') === 0) {
    //   await client.sendMessage(message.from, replyLoading);
    //   try {
    //     const subs = await Subs.findOne({ phone: message.from });
    //     if (subs) {
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nAnda SUDAH berlangganan.');
    //     } else {
    //       const newSubs = new Subs({ phone: message.from });
    //       await newSubs.save();
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nAnda sudah berlangganan.\nNantikan informasi seputar GPIB Immanuel Malang di kemudian hari.\nTerima kasih, Tuhan Yesus memberkati.');
    //     }
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    // } else if (message.body.indexOf('Berhenti') === 0 || message.body.indexOf('berhenti') === 0) {
    //   await client.sendMessage(message.from, replyLoading);
    //   try {
    //     const subs = await Subs.findOne({ phone: message.from });
    //     if (!subs) {
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nAnda BELUM berlangganan. Silahkan balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk berlangganan secara GRATIS.');
    //     } else {
    //       await Subs.findOneAndDelete({ phone: message.from });
    //       await client.sendMessage(message.from, '[PESAN OTOMATIS]\nAnda BERHENTI berlangganan.\nTerima kasih, Tuhan Yesus memberkati.');
    //     }
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    // } else {
    //   //   await client.sendMessage(message.from, '👋 Hello!');
    //   const opening = '[PESAN OTOMATIS]\nLayanan Whatsapp\nGPIB Immanuel Malang\n\nKata kunci yang anda masukkan SALAH, atau anda BELUM memulai layanan ini. Untuk memulai, silahkan balas pesan ini dengan kata kunci:\n\n       _*Mulai*_';
    //   await client.sendMessage(message.from, opening);
    // }
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //>>>>>>>>>>>>>>>>>> BUTTON CODE <<<<<<<<<<<<<<<<<<<<<<<
    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    if (messageReceived === 'langganan' || messageReceived === '2') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const subs = await Subs.findOne({ phone: message.from });
        if (subs) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda SUDAH berlangganan.');
        } else {
          const newSubs = new Subs({ phone: message.from });
          await newSubs.save();
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda sudah berlangganan.\nNantikan informasi seputar GPIB Immanuel malang di kemudian hari.\nTerima kasih, Tuhan Yesus memberkati.');
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'berhenti' || messageReceived === '3') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const subs = await Subs.findOne({ phone: message.from });
        if (!subs) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BELUM berlangganan. Silahkan balas dengan kata kunci:\n\n        *_Langganan_*\n\nUntuk berlangganan secara GRATIS.');
        } else {
          await Subs.findOneAndDelete({ phone: message.from });
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nAnda BERHENTI berlangganan.\nTerima kasih, Tuhan Yesus memberkati.');
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'warta' || messageReceived === '4') {
      // try {
      //REPLY PERTAMA
      const replyWarta =
        '[PESAN OTOMATIS]\nSilahkan pilih dokumen Warta Jemaat yang anda inginkan dengan cara membalas pesan ini dengan _katakunci_ atau _angka_:\n\n7. *_Immanuel_* = Untuk mendapatkan Warta Immanuel.\n8. *_Keuangan_* = Untuk mendapatkan Laporan Keuangan.\n9. *_Liturgi_* = Untuk mendapatkan daftar Pelayan, Bacaan, dan Nyanyian pekan ini dan pekan depan.';
      await client.sendMessage(message.from, replyWarta);
      // const buttons_reply_warta = new Buttons(
      //   '[PESAN OTOMATIS]\n*Warta Jemaat*\nPilih dokumen warta yang anda inginkan.',
      //   [
      //     { body: 'Warta Immanuel', id: 'test-7' },
      //     { body: 'Laporan Keuangan', id: 'test-8' },
      //     { body: 'Pelayan, Bacaan & Nyanyian', id: 'test-9' },
      //   ],
      //   'Layanan Whatsapp GPIB Immanuel Malang',
      //   'Silahkan tekan tombol di bawah'
      // ); // Reply button
      // await client.sendMessage(message.from, buttons_reply_warta);
      // //CLEAR MESSAGES
      // const chat = await client.getChatById(message.from);
      // await chat.clearMessages();
      // } catch (err) {
      //   await client.sendMessage(message.from, replyError);
      // }
      // await client.sendMessage(message.from, replyLoading);
      // try {
      //   const warta = await Warta.find().sort({ createdAt: -1 });
      //   if (warta.length === 0) {
      //     await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Warta Jemaat belum ada.');
      //   } else {
      //     const dataString = warta[0].data.toString('base64');
      //     const media = new MessageMedia(warta[0].dataType, dataString, warta[0].dataName);
      //     await client.sendMessage(message.from, media);
      //   }
      // } catch (err) {
      //   await client.sendMessage(message.from, replyError);
      // }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'tata' || messageReceived === '5') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const tata = await Tata.find().sort({ createdAt: -1 });
        if (tata.length < 2) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Tata ibadah belum ada.');
        } else {
          // const dataString0 = tata[0].data.toString('base64');
          // const dataString1 = tata[1].data.toString('base64');
          const media1 = new MessageMedia(tata[0].dataType, tata[0].data, tata[0].dataName);
          const media2 = new MessageMedia(tata[1].dataType, tata[1].data, tata[1].dataName);
          await client.sendMessage(message.from, media1);
          await client.sendMessage(message.from, media2);
          await client.sendMessage(message.from, replyClosing);
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'jadwal' || messageReceived === '6') {
      await client.sendMessage(message.from, replyLoading);
      try {
        //LIHAT JADWAL
        const jadwal = await Jadwal.find().sort({ createdAt: -1 });
        if (jadwal.length === 0) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, jadwal ibadah belum ada.');
        } else {
          // const dataString = jadwal[0].data.toString('base64');
          const media = new MessageMedia(jadwal[0].dataType, jadwal[0].data);
          await client.sendMessage(message.from, media);
          await client.sendMessage(message.from, replyClosing);
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      // //CLEAR MESSAGES
      // const chat = await client.getChatById(message.from);
      // await chat.clearMessages();
    } else if (messageReceived === 'mulai' || messageReceived === '1') {
      // if (!tanggalWarta) {
      //   tanggalWarta = 'DD/MM/YY';
      // }
      // if (!tanggalTata) {
      //   tanggalTata = 'DD/MM/YY';
      // }

      //REPLY KEDUA
      const replyMulai =
        '[PESAN OTOMATIS]\nSelamat Datang di Layanan Whatsapp\nGPIB Immanuel Malang.\n\nAnda bisa mendapatkan dokumen Warta Jemaat, Tata Ibadah Minggu dan Jadwal Ibadah Sepekan dengan cara membalas pesan ini dengan _katakunci_ atau _angka_:\n\n4. *_Warta_* = Untuk mendapatkan Warta Jemaat.\n5. *_Tata_* = Untuk mendapatkan Tata Ibadah.\n6. *_Jadwal_* = Untuk mendapatkan Jadwal Ibadah sepekan.';

      await client.sendMessage(message.from, replyMulai);
      // const buttons_reply_mulai = new Buttons(
      //   `di Layanan Whatsapp\nGPIB Immanuel Malang.\n\nAnda bisa mendapatkan dokumen Warta Jemaat, Tata Ibadah Minggu dan Jadwal Ibadah Sepekan dengan menekan tombol di bawah.\nLayanan ini tersedia 24 jam.`,
      //   [
      //     { body: 'Warta Jemaat', id: 'test-1' },
      //     { body: 'Tata Ibadah', id: 'test-2' },
      //     { body: 'Jadwal Ibadah', id: 'test-3' },
      //   ],
      //   'SELAMAT DATANG!!!',
      //   'Pilih dokumen yang anda inginkan'
      // ); // Reply button
      // await client.sendMessage(message.from, buttons_reply_mulai);
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'immanuel' || messageReceived === 'imanuel' || messageReceived === '7') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const immanuel = await Immanuel.find().sort({ createdAt: -1 });
        if (immanuel.length === 0) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Warta Immanuel belum ada.');
        } else {
          // const dataString = immanuel[0].data.toString('base64');
          const media = new MessageMedia(immanuel[0].dataType, immanuel[0].data, immanuel[0].dataName);
          await client.sendMessage(message.from, media);
          await client.sendMessage(message.from, replyClosing);
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'keuangan' || messageReceived === '8') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const keuangan = await Keuangan.find().sort({ createdAt: -1 });
        if (keuangan.length === 0) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Laporan Keuangan belum ada.');
        } else {
          // const dataString = keuangan[0].data.toString('base64');
          const media = new MessageMedia(keuangan[0].dataType, keuangan[0].data, keuangan[0].dataName);
          await client.sendMessage(message.from, media);
          await client.sendMessage(message.from, replyClosing);
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'liturgi' || messageReceived === '9') {
      await client.sendMessage(message.from, replyLoading);
      try {
        const teologi = await Teologi.find().sort({ createdAt: -1 });
        if (teologi.length === 0) {
          await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, dokumen Pelayan, Bacaan & Nyanyian belum ada.');
        } else {
          // const dataString = teologi[0].data.toString('base64');
          const media = new MessageMedia(teologi[0].dataType, teologi[0].data, teologi[0].dataName);
          await client.sendMessage(message.from, media);
          await client.sendMessage(message.from, replyClosing);
        }
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else {
      //REPLY PERTAMA
      const replyInit =
        '[PESAN OTOMATIS]\nLayanan ini belum dimulai atau katakunci salah.\n\nSilahkan balas pesan ini dengan _katakunci_ atau _angka_:\n\n1. *_Mulai_* = Untuk memulai layanan Whatsapp ini.\n2. *_Langganan_* = Untuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n3. *_Berhenti_* = Untuk berhenti berlangganan.';

      await client.sendMessage(message.from, replyInit);
      // const buttons_reply = new Buttons(
      //   '[PESAN OTOMATIS]\n\nLayanan ini sudah berakhir atau belum dimulai.\n\nSilahkan balas pesan ini dengan menekan tombol di bawah.\n\nKeterangan:\n\n*_Mulai_* = Untuk memulai layanan Whatsapp ini.\n\n*_Langganan_* = Untuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n\n*_Berhenti_* = Untuk berhenti berlangganan.',
      //   [
      //     { body: 'Mulai', id: 'test-4' },
      //     { body: 'Langganan', id: 'test-5' },
      //     { body: 'Berhenti Langganan', id: 'test-6' },
      //   ],
      //   'Layanan Whatsapp GPIB Immanuel Malang',
      //   'Silahkan tekan tombol di bawah'
      // ); // Reply button
      // await client.sendMessage(message.from, buttons_reply);
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    }
    //>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
    //<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<
    //------------------ OLD CODE -----------------
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
    // ------------------------------------------------
  }
});

async function updateTanggalWartaTata() {
  //FIND NEWEST WARTA
  const warta = await Warta.find().sort({ createdAt: -1 });
  if (warta.length === 0) {
    tanggalWarta = 'Belum ada';
  } else {
    const wartaNameArr = warta[0].dataName.split('');
    let wartaDateArr = [];
    for (let i = 13; i < 21; i++) {
      wartaDateArr.push(wartaNameArr[i]);
    }
    const wartaDate = wartaDateArr.join('');
    // console.log(wartaDate);
    tanggalWarta = wartaDate;
  }

  //FIND NEWEST TATA
  const tata = await Tata.find().sort({ createdAt: -1 });
  if (tata.length < 2) {
    tanggalTata = 'Belum ada';
  } else {
    const tataNameArr = tata[0].dataName.split('');
    let tataDateArr = [];
    for (let i = 14; i < 22; i++) {
      tataDateArr.push(tataNameArr[i]);
    }
    const tataDate = tataDateArr.join('');
    // console.log(tataDate);
    tanggalTata = tataDate;
  }
  // tanggalWarta = wartaDate;
}

updateTanggalWartaTata();

//LISTEN
app.listen(port, () => {
  console.log(`listening at port ${port}`);
});
