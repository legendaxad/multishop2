import { Request, Response } from "express";
import { T } from "../libs/types/common";
import Errors, { HttpCode, Message } from "../libs/Error";
import { AdminRequest } from "../libs/types/member";
import { ProductInput, ProductUpdateInput } from "../libs/types/product";
import ProductService from "../model/product.service";

const productController: T = {};
const productService = new ProductService();

productController.getAllProducts = async (req: Request, res: Response) => {
  try {
    console.log("getAllProducts");
    const data = await productService.getAllProducts();
    res.render("products", { products: data });
  } catch (err) {
    console.error("Error getAllProducts page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
productController.createNewProduct = async (
  req: AdminRequest,
  res: Response,
) => {
  console.log("createNewProduct");
  try {
    if (!req.files?.length)
      throw new Errors(HttpCode.INTERNAL_SERVER_ERROR, Message.CREATE_FAILED);
    const data: ProductInput = req.body;
    data.productImages = req.files.map((ele) => {
      return ele.path;
    });
    ((data.productSizes = req.body.productSizes
      .split(",")
      .map((size: string) => Number(size.trim()))),
      await productService.createNewProduct(data));
    res.send(
      `<script>alert('Successful creation!'); window.location.replace('/admin/product/all')</script>`,
    );
  } catch (err) {
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;

    res.send(
      `<script>alert('${message} !'); window.location.replace('/admin/product/all')</script>`,
    );
  }
};

productController.updateChosenProduct = async (
  req: AdminRequest,
  res: Response,
) => {
  try {
    console.log("updateChosenProduct");
    const id = req.params.id;
    const data: ProductUpdateInput = req.body;
    if (req.files?.length) {
      data.productImages = req.files.map((ele) => ele.path);
    }
    const result = await productService.updateChosenProduct(id, data);
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.error("Error updateChosenProduct page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

export default productController;
