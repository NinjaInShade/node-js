// This is the same functionality as server.js but all code, files and import relate to mongo db instead of the mysql database.

// Imports
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const multer = require("multer");
const cors = require("cors");
const db = require("./util/database").mongo;
const admin_routes = require("./routes/mongo/admin");
const shop_routes = require("./routes/mongo/shop");
const auth_routes = require("./routes/mongo/auth");
const path = require("path");

const file_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const file_filter = (req, file, cb) => {
  if (file.mimetype === "image/png" || file.mimetype === "image/jpg" || file.mimetype === "image/jpeg") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

const app = express();

// Middlewares
app.use(cors());
app.options("*", cors());
app.use(bodyParser.json());
app.use(multer({ storage: file_storage, fileFilter: file_filter }).single("image"));
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

// Route middlewares
app.use("/auth", auth_routes.routes);
app.use("/admin", admin_routes.routes);
app.use(shop_routes.routes);

// 404 middleware
app.use((req, res, next) => {
  return res.status(404).json({
    error_message: "Invalid route",
  });
});

// Error middleware
app.use((error, req, res, next) => {
  return res.status(500).json({
    message: "There was a server error",
    error_message: `${error}`,
  });
});

db()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log("Server started and database connection succeeded");
    });
  })
  .catch((err) => console.log(err));
