const multer = require('multer');
const crypto = require('crypto');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, './public/images/uploads');  // Make sure this folder exists and has write permissions
    },
    filename: (req, file, cb) => {
        crypto.randomBytes(12, (err, buffer) => {
            const fileName = buffer.toString('hex') + path.extname(file.originalname);  // Create a random file name with extension
            cb(null, fileName);
        });
    }
});

const upload = multer({ storage: storage });

module.exports = upload;
