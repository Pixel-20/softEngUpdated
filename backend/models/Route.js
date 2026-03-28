const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  lat: {
    type: Number,
    required: true
  },
  lng: {
    type: Number,
    required: true
  },
  order: {
    type: Number,
    required: true
  }
});

const routeSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
    unique: true
  },
  routeName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  stops: [stopSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('Route', routeSchema);
