const Bus = require('../models/Bus');
const Location = require('../models/Location');

// @desc    Get driver's assigned bus
// @route   GET /api/driver/my-bus
// @access  Private/Driver
const getMyBus = async (req, res) => {
  try {
    const bus = await Bus.findOne({ driverId: req.user._id })
      .populate('routeId', 'routeNumber routeName stops');

    if (!bus) {
      return res.status(404).json({ message: 'No bus assigned to you' });
    }

    res.json(bus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Start trip
// @route   POST /api/driver/start-trip
// @access  Private/Driver
const startTrip = async (req, res) => {
  try {
    const bus = await Bus.findOne({ driverId: req.user._id });

    if (!bus) {
      return res.status(404).json({ message: 'No bus assigned to you' });
    }

    bus.isActive = true;
    await bus.save();

    res.json({ message: 'Trip started', bus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Stop trip
// @route   POST /api/driver/stop-trip
// @access  Private/Driver
const stopTrip = async (req, res) => {
  try {
    const bus = await Bus.findOne({ driverId: req.user._id });

    if (!bus) {
      return res.status(404).json({ message: 'No bus assigned to you' });
    }

    bus.isActive = false;
    await bus.save();

    res.json({ message: 'Trip stopped', bus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Update available seats
// @route   PUT /api/driver/update-seats
// @access  Private/Driver
const updateSeats = async (req, res) => {
  try {
    const { availableSeats } = req.body;

    const bus = await Bus.findOne({ driverId: req.user._id });

    if (!bus) {
      return res.status(404).json({ message: 'No bus assigned to you' });
    }

    if (availableSeats < 0 || availableSeats > bus.totalSeats) {
      return res.status(400).json({ message: 'Invalid seat count' });
    }

    bus.availableSeats = availableSeats;
    await bus.save();

    res.json({ message: 'Seats updated', bus });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Save location (also called via socket)
// @route   POST /api/driver/location
// @access  Private/Driver
const saveLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;

    const bus = await Bus.findOne({ driverId: req.user._id });

    if (!bus) {
      return res.status(404).json({ message: 'No bus assigned to you' });
    }

    const location = await Location.create({
      busId: bus._id,
      lat,
      lng
    });

    res.json({ message: 'Location saved', location });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getMyBus,
  startTrip,
  stopTrip,
  updateSeats,
  saveLocation
};
