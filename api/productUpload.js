
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const uploadDirectory = path.join(
    __dirname, 'public', 'uploads', 'products'
);

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp'
};

const storage = multer.diskStorage({
    destination(req, file, callback) {
        callback(null, uploadDirectory);
    },

    filename(req, file, callback) {
        const extension = allowedTypes[file.mimetype];

        callback(
            null,
            crypto.randomUUID() + extension
        );
    }
});

const upload = multer({
    storage,

    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },

    fileFilter(req, file, callback) {
        if (!allowedTypes[file.mimetype]) {
            return callback(
                new Error('Only JPG, PNG and WebP images are allowed.')
            );
        }

        callback(null, true);
    }
});

/*
 * SECURITY LEARNING NOTE:
 * A browser-supplied MIME type is not proof of file content.
 * Verify file signatures after upload.
 *
 * SVG files are deliberately excluded because they may
 * contain active content.
 */

async function validateUploadedImage(file) {
    if (!file) return;

    const handle = await fs.promises.open(file.path, 'r');

    let bytes;

    try {
        const buffer = Buffer.alloc(16);
        const result = await handle.read(buffer, 0, 16, 0);
        bytes = buffer.subarray(0, result.bytesRead);
    } finally {
        await handle.close();
    }

    const jpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;

    const png =
        bytes.subarray(0, 8).equals(
            Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
        );

    const webp =
        bytes.subarray(0, 4).toString() === 'RIFF' &&
        bytes.subarray(8, 12).toString() === 'WEBP';

    const valid =
        (file.mimetype === 'image/jpeg' && jpeg) ||
        (file.mimetype === 'image/png' && png) ||
        (file.mimetype === 'image/webp' && webp);

    if (!valid) {
        throw new Error('The selected file is not a valid image.');
    }
}

async function removeUpload(file) {
    if (file && file.path) {
        await fs.promises.unlink(file.path).catch(() => {});
    }
}

function uploadedImagePath(file) {
    return '/uploads/products/' + file.filename;
}

module.exports = {
    upload,
    validateUploadedImage,
    removeUpload,
    uploadedImagePath
};
