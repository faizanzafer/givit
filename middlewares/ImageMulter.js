const multer = require("multer");

const multerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/media");
  },
  filename: (req, file, cb) => {
    const ext = file.mimetype.split("/")[1];
    cb(null, `user-${Date.now()}.${ext}`);
  },
});

const multerFilter = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image") &&
    (file.mimetype.endsWith("jpg") ||
      file.mimetype.endsWith("jpeg") ||
      file.mimetype.endsWith("png"))
  ) {
    cb(null, true);
  } else {
    req.file_error =
      "Not a valid file ! Please upload only jpg, jpeg, png file.";
    return cb(null, false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
  limits: {
    fileSize: 5242880,
  },
});

module.exports = async function (req, res, next) {
  const upload_ = upload.single("image");

  upload_(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      req.file_error = err.message;
    } else if (err) {
      req.file_error = err;
    }
    next();
  });
};
