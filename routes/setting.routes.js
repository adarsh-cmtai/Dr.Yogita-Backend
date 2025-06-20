const express = require('express');
const router = express.Router();

const settingController = require('../controllers/setting.controller.js');

router.get('/:key', settingController.getSetting);
router.post('/', settingController.createOrUpdateSetting);

module.exports = router;
