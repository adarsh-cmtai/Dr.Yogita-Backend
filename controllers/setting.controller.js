const Setting = require('../models/setting.model.js');

const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key: key });

    if (!setting) {
      return res.status(404).json({ message: `Setting with key '${key}' not found.` });
    }

    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching setting.', error: error.message });
  }
};

const createOrUpdateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || !value) {
      return res.status(400).json({ message: 'Both key and value are required.' });
    }

    const updatedSetting = await Setting.findOneAndUpdate(
      { key: key },
      { value: value },
      {
        new: true,
        upsert: true,
        runValidators: true,
      }
    );

    res.status(200).json({ message: 'Setting updated successfully!', setting: updatedSetting });
  } catch (error) {
    res.status(500).json({ message: 'Error updating setting.', error: error.message });
  }
};

module.exports = {
  getSetting,
  createOrUpdateSetting,
};
