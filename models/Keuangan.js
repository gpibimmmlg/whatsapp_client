const mongoose = require('mongoose');

const KeuanganSchema = new mongoose.Schema(
  {
    dataType: {
      type: String,
      required: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    dataName: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Keuangan', KeuanganSchema);
