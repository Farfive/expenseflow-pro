const express = require('express');
const router = express.Router();

// Get notifications
router.get('/', (req, res) => {
  res.json({
    success: true,
    data: { notifications: [] }
  });
});

module.exports = router; 