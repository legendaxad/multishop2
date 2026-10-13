import express from "express";
import path from "path";
import morgan from "morgan";
import routerAdmin from "./router-admin";
import router from "./router";
import { MORGAN_FORMAT } from "./libs/config";
import session from "express-session";
import ConnectMongoDB from "connect-mongodb-session";
import dotenv from "dotenv";
import { T } from "./libs/types/common";
dotenv.config();

const MongoDBStrore = ConnectMongoDB(session);
const store = new MongoDBStrore({
  uri: String(process.env.MONGO_URL),
  collection: "sessions",
});
//1. Entrance
const app = express();
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan(MORGAN_FORMAT));
//2.sessions
app.use(
  session({
    secret: String(process.env.SESSION_SECRET),
    cookie: {
      maxAge: 1000 * 3600 * 6, // 6 hours
    },
    store: store,
    resave: true,
    saveUninitialized: true,
  }),
);
app.use(function (req, res, next) {
  const sessionInstance = req.session as T;
  res.locals.member = sessionInstance.member;
  next();
});
//3.views
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//4.Routers
app.use("/admin", routerAdmin);
app.use("/", router);

export default app;
