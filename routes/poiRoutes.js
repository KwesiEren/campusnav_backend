const express = require('express');
const router = express.Router();
const poiController = require('../controllers/poiController');
const multer = require('multer');
const path = require('path');

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/poi'),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage });

router.get('/', poiController.getAllPOIs);
router.post('/', upload.array('images', 2), poiController.createPOI);
router.put('/:id', upload.array('images', 2), poiController.updatePOI);
router.delete('/:id', poiController.deletePOI);

module.exports = router;
