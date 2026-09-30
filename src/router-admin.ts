import express from "express";
const routerAdmin = express.Router();
import adminController from "./controllers/admin.controller";

//SHOP_ADMIN

routerAdmin.get("/", adminController.goHome);
routerAdmin
  .get("/login", adminController.getLogin)
  .post("/login", adminController.processLogin);
routerAdmin
  .get("/signup", adminController.getSignup)
  .post("/signup", adminController.processSignup);

//PRODUCTS

//USER

export default routerAdmin;
