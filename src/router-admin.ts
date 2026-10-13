import express from "express";
const routerAdmin = express.Router();
import adminController from "./controllers/admin.controller";
import makeUploader from "./libs/utils/uploader";
import productController from "./controllers/product.controller";

//SHOP_ADMIN

routerAdmin.get("/", adminController.goHome);
routerAdmin
  .get("/login", adminController.getLogin)
  .post("/login", adminController.processLogin);
routerAdmin
  .get("/signup", adminController.getSignup)
  .post(
    "/signup",
    makeUploader("members").single("memberImage"),
    adminController.processSignup,
  );
routerAdmin.get("/logout", adminController.logout);
routerAdmin.get("/check-me", adminController.checkout);

//PRODUCTS

routerAdmin.get(
  "/product/all",
  adminController.verifyRestaurant,
  productController.getAllProducts,
);

routerAdmin.post(
  "/product/create",
  adminController.verifyRestaurant,
  makeUploader("products").array("productImages", 5),
  // uploadProductImage.single("productImage"),
  productController.createNewProduct,
);
routerAdmin.post(
  "/product/:id",
  adminController.verifyRestaurant,
  makeUploader("products").array("productImages", 5),
  productController.updateChosenProduct,
);

//USER

routerAdmin.get(
  "/user/all",
  adminController.verifyRestaurant,
  adminController.getUsers,
);

routerAdmin.post(
  "/user/edit",
  adminController.verifyRestaurant,
  adminController.updateChosenUser,
);

export default routerAdmin;
