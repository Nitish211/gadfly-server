const express = require('express');
const router = express.Router();
const { registerUser, getUserProfile, getAllUsers, verifyPartner } = require('../controllers/userController');
const upload = require('../middleware/upload');

router.post('/', upload.fields([{ name: 'profilePic', maxCount: 1 }, { name: 'audioClip', maxCount: 1 }]), registerUser);
router.get('/', getAllUsers);
router.get('/:id', getUserProfile);
router.put('/verify/:id', verifyPartner);

module.exports = router;
