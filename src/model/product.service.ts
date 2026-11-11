import { shapeIntoMongooseObjectId } from "../libs/config";
import { ProductStatus } from "../libs/enums/product.enums";
import Errors, { HttpCode, Message } from "../libs/Error";
import { T } from "../libs/types/common";
import {
  Product,
  ProductInput,
  ProductInquiry,
  ProductUpdateInput,
} from "../libs/types/product";
import ProductModel from "../schema/Product.model";
import { ViewInput } from "../libs/types/view";
import { ViewGroup } from "../libs/enums/view.enum";
import ViewService from "./View.service";
import { Types } from "mongoose";

class ProductService {
  private readonly productModel;
  public viewService;
  constructor() {
    this.productModel = ProductModel;
    this.viewService = new ViewService();
  }
  // SPA
  public async getProducts(inquiry: ProductInquiry): Promise<Product[]> {
    const match: T = {
      productStatus: ProductStatus.PROCESS,
    };

    if (inquiry.productCollection) {
      match.productCollection = inquiry.productCollection;
    }
    if (inquiry.search) {
      match.productName = { $regex: new RegExp(inquiry.search, "i") };
    }
    const allowedOrders = ["productPrice", "createdAt"];

    const order = allowedOrders.includes(inquiry.order)
      ? inquiry.order
      : "createdAt";

    const sort: T = order === "productPrice" ? { [order]: 1 } : { [order]: -1 };
    const result = await this.productModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        { $skip: (inquiry.page - 1) * inquiry.limit },
        { $limit: inquiry.limit },
      ])
      .exec();

    if (result.length === 0) {
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    }

    return result;
  }
  public async getProduct(
    memberId: Types.ObjectId,
    id: string,
  ): Promise<Product> {
    const productId = shapeIntoMongooseObjectId(id);

    let result = await this.productModel
      .findOne({ _id: productId, productStatus: ProductStatus.PROCESS })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    if (memberId) {
      const input: ViewInput = {
        memberId: memberId,
        viewRefId: productId,
        viewGroup: ViewGroup.PRODUCT,
      };
      const existView = await this.viewService.checkViewExistence(input);
      console.log("Exist: ", existView);
      if (!existView) {
        await this.viewService.insertMemberView(input);
        const updateProduct = await this.productModel
          .findByIdAndUpdate(
            productId,
            { $inc: { productViews: 1 } },
            { new: true },
          )
          .exec();
        if (!updateProduct) {
          throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
        }
        result = updateProduct;
      }
    }
    return result;
  }

  // SSR
  public async getAllProducts(): Promise<Product[]> {
    const result = await this.productModel.find().exec();
    if (!result) throw new Errors(HttpCode.BAD_REQUEST, Message.NO_DATA_FOUND);
    return result;
  }
  public async createNewProduct(input: ProductInput): Promise<Product> {
    try {
      return await this.productModel.create(input);
    } catch (err) {
      console.log("Error,model:createNewProduct", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }
  public async updateChosenProduct(
    id: string,
    input: ProductUpdateInput,
  ): Promise<Product> {
    const product_id = shapeIntoMongooseObjectId(id);
    const result = await this.productModel
      .findByIdAndUpdate({ _id: product_id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }
}
export default ProductService;
