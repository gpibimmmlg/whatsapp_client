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

//LOGGING
const { adminLogger, publicLogger } = require('./config/logger/childLogger');

//IMPORT MONGOOSE MODELS
const Tata = require('./models/Tata');
// const Warta = require('./models/Warta');
// const Jadwal = require('./models/Jadwal');
const Subs = require('./models/Subs');
const Teks = require('./models/Teks');
const Immanuel = require('./models/Immanuel');
// const Keuangan = require('./models/Keuangan');
// const Ulang = require('./models/Teologi');
const { infoLog } = require('./config/logger/functions');

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
  const invalidExt = '[PESAN OTOMATIS]\nFormat dokumen Salah.';
  const fileOversize = '[PESAN OTOMATIS]\nUpload File GAGAL. Ukuran File maksimal 1,5mb.';
  const danielNumber = '6285172160302@c.us';
  if (message.from === process.env.ADMIN_NUMBER || message.from === process.env.MANAGER_NUMBER || message.from === danielNumber) {
    if (message.hasMedia) {
      const mediaReceived = await message.downloadMedia();
      if (mediaReceived.filename === undefined) {
        mediaReceived.filename = 'undefined';
      }
      if (mediaReceived.filename.indexOf('1_tata_ibadah') === 0 || mediaReceived.filename.indexOf('2_tata_ibadah') === 0) {
        if (mediaReceived.filesize >= 1500000) return await client.sendMessage(message.from, fileOversize);
        await client.sendMessage(message.from, replyLoading);
        try {
          //DELETE THE OLDEST DATA
          const tatas = await Tata.find().sort({ createdAt: 1 });
          await Tata.deleteOne({ dataName: tatas[0] });

          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN TATA IBADAH KE DB
          const newTata = new Tata({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newTata.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'tata ibadah diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      } else if (mediaReceived.filename.indexOf('warta_immanuel') === 0 || mediaReceived.filename.indexOf('.pdf') === 23) {
        if (mediaReceived.filesize >= 1500000) return await client.sendMessage(message.from, fileOversize);

        await client.sendMessage(message.from, replyLoading);
        try {
          //HAPUS DOKUMEN DI DB
          await Immanuel.deleteMany({ dataType: 'application/pdf' });

          // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
          //SIMPAN WARTA JEMAAT KE DB
          const newImm = new Immanuel({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
          await newImm.save();

          //REPLY TO ADMIN
          await client.sendMessage(message.from, 'warta immanuel diterima');
        } catch (err) {
          await client.sendMessage(message.from, replyError);
        }
      }
      // else if (mediaReceived.filename.indexOf('laporan_keuangan') === 0) {
      //   await client.sendMessage(message.from, replyLoading);
      //   try {
      //     // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
      //     //SIMPAN WARTA JEMAAT KE DB
      //     const newKeuangan = new Keuangan({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
      //     await newKeuangan.save();

      //     //REPLY TO ADMIN
      //     await client.sendMessage(message.from, 'laporan keuangan diterima');
      //   } catch (err) {
      //     await client.sendMessage(message.from, replyError);
      //   }
      // }
      // else if (mediaReceived.filename.indexOf('ulang_tahun') === 0) {
      //   await client.sendMessage(message.from, replyLoading);
      //   if (mediaReceived.mimetype === 'image/jpg' || mediaReceived.mimetype === 'image/png' || mediaReceived.mimetype === 'image/jpeg') {
      //     try {
      //       // const dataBuf = Buffer.from(mediaReceived.data, 'base64');
      //       //SIMPAN WARTA JEMAAT KE DB
      //       const newUlang = new Ulang({ dataType: mediaReceived.mimetype, data: mediaReceived.data, dataName: mediaReceived.filename });
      //       await newUlang.save();

      //       //REPLY TO ADMIN
      //       await client.sendMessage(message.from, 'dokumen Ulang Tahun diterima');
      //     } catch (err) {
      //       await client.sendMessage(message.from, replyError);
      //     }
      //   } else {
      //     await client.sendMessage(message.from, invalidExt);
      //   }
      // }
      else {
        // console.log(mediaReceived);
        // console.log(media);
        await client.sendMessage(
          message.from,
          'File tidak dikenal. Pastikan nama file dan jenis file yang anda masukkan sudah benar.\nFormat nama file: \n_1_tata_ibadah_19-05-22_\n_warta_immanuel_27-10-23_\n_laporan_keuangan_17-01-23_\n_ulang_tahun_06-12-23_\nJenis file:\nWarta Immanuel, Laporan Keuangan, dan Ulang Tahun = _pdf_ (file document)\nTata Ibadah = _pdf_ (file document)\nUlang Tahun = _png_ / _jpg_ / _jpeg_ (kirim via dokumen, bukan via galeri)'
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
      }
      // else if (message.body.indexOf('!LihatLaporanKeuangan') === 0) {
      //   await client.sendMessage(message.from, replyLoading);
      //   try {
      //     const keuangan = await Keuangan.find().sort({ createdAt: -1 });
      //     if (keuangan[0] === undefined) {
      //       await client.sendMessage(message.from, 'laporan keuangan belum ada');
      //     } else {
      //       // const dataString = keuangan[0].data.toString('base64');
      //       const media = new MessageMedia(keuangan[0].dataType, keuangan[0], keuangan[0].dataName);
      //       await client.sendMessage(message.from, media);
      //     }
      //   } catch (err) {
      //     await client.sendMessage(message.from, replyError);
      //   }
      // }
      // else if (message.body.indexOf('!LihatUlangTahun') === 0) {
      //   await client.sendMessage(message.from, replyLoading);
      //   try {
      //     const ulang = await Ulang.find().sort({ createdAt: -1 });
      //     if (ulang[0] === undefined) {
      //       await client.sendMessage(message.from, 'Dokumen Ulang Tahun belum ada');
      //     } else {
      //       // const dataString = ulang[0].data.toString('base64');
      //       const media = new MessageMedia(ulang[0].dataType, ulang[0].data);
      //       await client.sendMessage(message.from, media);
      //     }
      //   } catch (err) {
      //     await client.sendMessage(message.from, replyError);
      //   }
      // }
      else if (message.body.indexOf('!LihatTata') === 0) {
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
          'Kata kunci salah.\nKata Kunci:\n\n        !Teks\n        !LihatTeks\n        !LihatWartaImmanuel\n        !LihatTata\n        !BroadcastTeks\n        !JumlahSubscriber\n\nFormat nama file: \n_1_tata_ibadah_19-05-22_\n_warta_immanuel_27-10-23_\nJenis file:\nTata Ibadah = _pdf_ (file document)\nJadwal Ibadah = _png_ / _jpg_ / _jpeg_ (langsung file foto/galeri)\nWarta Immanuel = _pdf_ (file document)'
        );
      }
    }
  } else if (message.from != process.env.RESTRICTED_NUMBER) {
    // await client.sendMessage(message.from, '[Pesan Otomatis]\nLayanan Whatsapp ini sedang dalam pemeliharaan. Mohon maaf atas ketidaknyamanan ini.');
    const messageReceived = message.body.replace(/\s/g, '').toLowerCase();
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
    } else if (messageReceived === 'tata' || messageReceived === '4') {
      await client.sendMessage(message.from, replyLoading);
      infoLog(publicLogger, 'tata', 'loading', message.from);

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

        infoLog(publicLogger, 'tata', 'success', message.from);
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'mulai' || messageReceived === '1') {
      // if (!tanggalWarta) {
      //   tanggalWarta = 'DD/MM/YY';
      // }
      // if (!tanggalTata) {
      //   tanggalTata = 'DD/MM/YY';
      // }

      //REPLY KEDUA
      const replyMulai =
        '[PESAN OTOMATIS]\nSelamat Datang di Layanan Whatsapp\nGPIB Immanuel Malang.\n\nAnda bisa mendapatkan dokumen Tata Ibadah dan Warta Jemaat sepekan dengan cara membalas pesan ini dengan _katakunci_ atau _angka_:\n\n4. *_Tata_* = Untuk mendapatkan Tata Ibadah.\n5. *_Warta_* = Untuk mendapatkan Warta Jemaat.';

      await client.sendMessage(message.from, replyMulai);

      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    } else if (messageReceived === 'warta' || messageReceived === '5') {
      await client.sendMessage(message.from, replyLoading);
      infoLog(publicLogger, 'warta', 'loading', message.from);
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

        infoLog(publicLogger, 'warta', 'success', message.from);
      } catch (err) {
        await client.sendMessage(message.from, replyError);
      }
      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    }
    // else if (messageReceived === 'keuangan' || messageReceived === '6') {
    //   await client.sendMessage(message.from, replyLoading);
    //   infoLog(publicLogger, 'keuangan', 'loading', message.from);
    //   try {
    //     const keuangan = await Keuangan.find().sort({ createdAt: -1 });
    //     if (keuangan.length === 0) {
    //       await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, Laporan Keuangan belum ada.');
    //     } else {
    //       // const dataString = keuangan[0].data.toString('base64');
    //       const media = new MessageMedia(keuangan[0].dataType, keuangan[0].data, keuangan[0].dataName);
    //       await client.sendMessage(message.from, media);
    //       await client.sendMessage(message.from, replyClosing);
    //     }
    //     infoLog(publicLogger, 'keuangan', 'success', message.from);
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    //   //CLEAR MESSAGES
    //   const chat = await client.getChatById(message.from);
    //   await chat.clearMessages();
    // }
    // else if (messageReceived === 'ulangtahun' || messageReceived === '7' || messageReceived === 'ulang tahun') {
    //   await client.sendMessage(message.from, replyLoading);
    //   infoLog(publicLogger, 'ulangtahun', 'loading', message.from);
    //   try {
    //     const ulang = await Ulang.find().sort({ createdAt: -1 });
    //     if (ulang.length === 0) {
    //       await client.sendMessage(message.from, '*[PESAN OTOMATIS]*\nMohon maaf, dokumen belum ada.');
    //     } else {
    //       // const dataString = ulang[0].data.toString('base64');
    //       const media = new MessageMedia(ulang[0].dataType, ulang[0].data);
    //       await client.sendMessage(message.from, media);
    //       await client.sendMessage(message.from, replyClosing);
    //     }
    //     infoLog(publicLogger, 'ulangtahun', 'success', message.from);
    //   } catch (err) {
    //     await client.sendMessage(message.from, replyError);
    //   }
    //   //CLEAR MESSAGES
    //   const chat = await client.getChatById(message.from);
    //   await chat.clearMessages();
    // }
    else {
      infoLog(publicLogger, messageReceived, 'invalid', message.from);
      //REPLY PERTAMA
      const replyInit =
        '[PESAN OTOMATIS]\nLayanan ini belum dimulai atau katakunci salah.\n\nSilahkan balas pesan ini dengan _katakunci_ atau _angka_:\n\n1. *_Mulai_* = Untuk memulai layanan Whatsapp ini.\n2. *_Langganan_* = Untuk berlangganan menerima informasi tambahan seputar GPIB Immanuel Malang secara GRATIS.\n3. *_Berhenti_* = Untuk berhenti berlangganan.';

      await client.sendMessage(message.from, replyInit);

      //CLEAR MESSAGES
      const chat = await client.getChatById(message.from);
      await chat.clearMessages();
    }
  }
});

//LISTEN
app.listen(port, () => {
  console.log(`listening at port ${port}`);
});
