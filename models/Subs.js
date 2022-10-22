const mongoose = require('mongoose');

const SubsSchema = new mongoose.Schema(
  {
    phone: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subs', SubsSchema);
