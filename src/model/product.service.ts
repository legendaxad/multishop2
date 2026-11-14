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
import { escapeRegex, isValidObjectId } from "../libs/utils/validation";

class ProductService {
  private readonly productModel;
  public viewService;
  constructor() {
    this.productModel = ProductModel;
    this.viewService = new ViewService();
  }
  // SPA
  public async getProducts(inquiry: ProductInquiry): Promise<Product[]> {
    const match: T = this.getProductsMatch(inquiry);
    const allowedOrders = ["productPrice", "createdAt", "productViews"];

    const order = allowedOrders.includes(inquiry.order)
      ? inquiry.order
      : "createdAt";

    // _id as tie-breaker keeps pagination stable
    const sort: T =
      order === "productPrice"
        ? { [order]: 1, _id: -1 }
        : { [order]: -1, _id: -1 };
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
  public async getProductsCount(inquiry: ProductInquiry): Promise<number> {
    return await this.productModel
      .countDocuments(this.getProductsMatch(inquiry))
      .exec();
  }
  private getProductsMatch(inquiry: ProductInquiry): T {
    const match: T = {
      productStatus: ProductStatus.PROCESS,
    };

    if (inquiry.productCollection) {
      match.productCategory = inquiry.productCollection;
    }
    if (inquiry.search) {
      const search = new RegExp(escapeRegex(inquiry.search), "i");
      match.$or = [{ productName: search }, { productBrand: search }];
    }
    return match;
  }
  public async getProduct(
    memberId: Types.ObjectId,
    id: string,
  ): Promise<Product> {
    if (!isValidObjectId(id))
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_PRODUCT_ID);
    const productId = shapeIntoMongooseObjectId(id);

    let result = await this.productModel
      .findOne({ _id: productId, productStatus: ProductStatus.PROCESS })
      .exec();
    if (!result)
      throw new Errors(HttpCode.NOT_FOUND, Message.PRODUCT_NOT_FOUND);
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
