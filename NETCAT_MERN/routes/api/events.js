const express = require('express');
const router = express.Router();
const { body, check, validationResult } = require('express-validator/check');
const Event = require('../../models/Event');
const Featured = require('../../models/Featured');

// @route   GET api/events/
// @desc    Get events by school, event type, and featured status
// @access  Public
router.get('/', async (req, res) => {
  try {
    let school = req.query.school;
    let type = req.query.type;
    let featured = req.query.featured;
    let limit = parseInt(req.query.limit, 10);

    let events;

    if (featured && featured === 'true') {
      if (school && type) {
        events = await Featured.find({ school, type })
          .sort({
            'date.from': -1
          })
          .limit(limit);
      } else if (school) {
        events = await Featured.find({ school })
          .sort({ 'date.from': 1 })
          .limit(limit);
      } else if (type) {
        events = await Featured.find({ type })
          .sort({ 'date.from': 1 })
          .limit(limit);
      } else {
        events = await Featured.find()
          .sort({ 'date.from': 1 })
          .limit(limit);
      }
    } else {
      if (school && type) {
        events = await Event.find({ school, type })
          .sort({
            'date.from': 1
          })
          .limit(limit);
      } else if (school) {
        events = await Event.find({ school })
          .sort({ 'date.from': 1 })
          .limit(limit);
      } else if (type) {
        events = await Event.find({ type })
          .sort({ 'date.from': 1 })
          .limit(limit);
      } else {
        events = await Event.find()
          .sort({ 'date.from': 1 })
          .limit(limit);
      }
    }

    res.json(events);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/events/:id
// @desc    Get normal or featured events by id
// @access  Public
router.get('/:id', async (req, res) => {
  let featured = req.query.featured;
  let event;
  try {
    if (featured && featured === 'true') {
      event = await Featured.findById(req.params.id);
    } else {
      event = await Event.findById(req.params.id);
    }
    if (!event) {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Event not found' });
    }
    res.status(500).send('Server Error');
  }
});

// @route   POST api/events
// @desc    Create a NORMAL or FEATURED event
// @access  Developer

/**
 * TODO: Change permission level to developer
 */
router.post(
  '/',
  [
    check('title', 'Title is required')
      .not()
      .isEmpty(),
    check('date.from', "Invalid 'from' date format").isISO8601(),
    body('date').custom(value => {
      // If multiDay exists and is true
      if (value.multiDay && value.multiDay === true) {
        // If to field is empty or is not a valid datem throw invalid date error
        if (!value.to || !Date.parse(value.to)) {
          throw new Error("Invalid 'to' date format");
        }
      }
      return true;
    })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const {
      title,
      location,
      date,
      description,
      thumbNailUrl,
      school,
      featured,
      type,
      rsvpLink
    } = req.body;

    const eventFields = {
      title,
      location,
      date,
      description,
      thumbNailUrl,
      school,
      type,
      rsvpLink
    };

    try {
      let newEvent;
      // If featured field exists and is true, then it is a featured event
      featured && featured === true
        ? (newEvent = new Featured(eventFields))
        : (newEvent = new Event(eventFields));

      newEvent = await newEvent.save();
      res.json(newEvent);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }
);

// @route   POST api/events/test-data
// @desc    Generate fake data
// @access  Developer

/**
 * DELETE LATER
 */
router.get('/test/generate-test-data', async (req, res) => {
  const random = () => Math.random() * 0.01 - 0.005;

  try {
    // Remove all existing data
    await Event.deleteMany();
    await Featured.deleteMany();
    let saveCoord = {};
    // Fake normal events
    for (let i = 0; i < 18; i++) {
      let title, school;
      if (i < 6) {
        title = 'Dornsife Event';
        school = 'dornsife';
      } else if (i < 12) {
        title = 'Annenberg Event';
        school = 'annenberg';
      } else {
        title = 'Marshall Event';
        school = 'marshall';
      }

      let lat = 34.02176870202642 + random();
      let lng = -118.28651879471587 + random();

      if (i == 0) {
        saveCoord = { lat, lng };
      } else if (i < 4) {
        lat = saveCoord.lat;
        lng = saveCoord.lng;
      }
      console.log({ i, lat, lng });
      let newEvent = {
        title: `${title} ${i + 1}`,
        location: {
          room: 'Taper Hall 112',
          address: '1015 W 34st, LA 90089',
          latitude: lat,
          longitude: lng
        },
        date: {
          from: new Date(
            `${i + 1 < 10 ? `0${i + 1}` : i + 1} July 2019 4:30:00 PDT`
          ),
          to: new Date(
            `${i + 1 < 10 ? `0${i + 1}` : i + 1}  July 2019 6:30:00 PDT`
          ),
          multiDay: false
        },
        featured: false,
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        thumbNailUrl: 'www.facebook.com',
        school,
        type: i % 2 === 0 ? 'workshop' : 'career'
      };
      newEvent = new Event(newEvent);
      newEvent = await newEvent.save();
      console.log({ i, school });
    }

    // Fake featured events
    for (let i = 0; i < 16; i++) {
      let title, school;
      if (i < 4) {
        title = 'Featured Viterbi Event';
        school = 'viterbi';
      } else if (i < 8) {
        title = 'Featured Dornsife Event';
        school = 'dornsife';
      } else if (i < 12) {
        title = 'Featured Annenberg Event';
        school = 'annenberg';
      } else {
        title = 'Featured Marshall Event';
        school = 'marshall';
      }
      let newEvent = {
        title: `${title} ${i + 1}`,
        location: {
          room: 'Taper Hall 112',
          address: '1015 W 34st, LA 90089',
          latitude: 34.02176870202642 + random(),
          longitude: -118.28651879471587 + random()
        },
        date: {
          from: new Date(`${i + 10} July 2019 4:30:00 PDT`),
          to: new Date(`${i + 10} July 2019 6:30:00 PDT`),
          multiDay: false
        },
        featured: true,
        description:
          'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
        thumbNailUrl: 'www.facebook.com',
        school,
        type: i % 2 === 0 ? 'workshop' : 'career'
      };
      newEvent = new Featured(newEvent);
      newEvent = await newEvent.save();
      console.log({ i: i + 24, school });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
