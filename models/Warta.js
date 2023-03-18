const mongoose = require('mongoose');

const WartaSchema = new mongoose.Schema(
  {
    dataType: {
      type: String,
      required: true,
    },
    data: {
      type: String,
      required: true,
    },
    dataName: {
      type: String,
      required: true,
    },
    // username: {
    //   type: String,
    //   required: true,
    //   max: 20,
    //   unique: true,
    // },
    // password: {
    //   type: String,
    //   required: true,
    //   min: 6,
    // },
    // isAdmin: {
    //   type: Boolean,
    //   default: false,
    // },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Warta', WartaSchema);
