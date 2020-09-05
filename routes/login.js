"use strict";

var express = require('express');
var router = express.Router();

router.get('/', (req, res, next) => {
  res.render('login', { user: req.user});
})

module.exports = router;