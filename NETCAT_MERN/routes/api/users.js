const express = require('express');
const router = express.Router();
const gravatar = require('gravatar');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { check, validationResult } = require('express-validator/check');

const User = require('../../models/User');

// @route   POST api/users
// @desc    Register user
// @access  Public
router.post(
  '/',
  [
    check('name', 'Name is required')
      .not()
      .isEmpty(),
    check('email', 'Please include a valid email').isEmail(),
    check(
      'password',
      'Please enter a password with 6 or more characters'
    ).isLength({ min: 6 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password } = req.body;

    try {
      // See if user exists
      let user = await User.findOne({ email: email });
      if (user) {
        return res
          .status(400)
          .json({ errors: [{ msg: 'User already exists' }] });
      }

      const avatar = gravatar.url(email, {
        s: '200', // size
        r: 'pg', // rating, ie. no naked people
        d: 'mm' // default value if no avatar available
      });

      user = new User({
        name,
        email,
        avatar,
        password
      });

      // Encrypt password
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);

      await user.save();
      // Return jsonwebtoken

      const payload = {
        user: {
          id: user.id // user._id from mongodb
        }
      };

      // Encrypt user id and return corresponding token
      jwt.sign(
        payload,
        config.get('jwtSecret'),
        { expiresIn: 600 }, // 10 minutes
        (err, token) => {
          if (err) throw err;
          res.json({ token });
        }
      );
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
