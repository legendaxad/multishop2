import express from "express";
const routerAdmin = express.Router();
import adminController from "./controllers/admin.controller";
import makeUploader from "./libs/utils/uploader";

//SHOP_ADMIN

routerAdmin.get("/", adminController.goHome);
routerAdmin
  .get("/login", adminController.getLogin)
  .post("/login", adminController.processLogin);
routerAdmin
  .get("/signup", adminController.getSignup)
  .post(
    "/signup",
    makeUploader("members").single("memeberImage"),
    adminController.processSignup,
  );
routerAdmin.get("/logout", adminController.logout);
routerAdmin.get("/check-me", adminController.checkout);

//PRODUCTS

//USER

export default routerAdmin;
