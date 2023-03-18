const mongoose = require('mongoose');

const ImmanuelSchema = new mongoose.Schema(
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('Immanuel', ImmanuelSchema);
