const express = require('express');
const router = express.Router();

// Get company details
router.get('/:id', (req, res) => {
  res.json({
    success: true,
    data: { company: req.currentCompany }
  });
});

module.exports = router; 