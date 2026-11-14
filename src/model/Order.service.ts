import { Types } from "mongoose";
import { shapeIntoMongooseObjectId } from "../libs/config";
import Errors, { HttpCode, Message } from "../libs/Error";
import { Member } from "../libs/types/member";
import {
  Order,
  OrderInput,
  OrderInquiry,
  OrderItemInput,
  OrderUpdateInput,
} from "../libs/types/order";
import OrderModel from "../schema/Order.model";
import OrderItemModel from "../schema/OrderItem.model";
import ProductModel from "../schema/Product.model";
import MemberService from "./Member.service";
import { OrderStatus } from "../libs/enums/order.enum";
import { ProductStatus } from "../libs/enums/product.enums";
import {
  isValidObjectId,
  parseDeliveryAddress,
} from "../libs/utils/validation";

// Status changes a customer may perform on their own orders
const CUSTOMER_STATUS_FLOW: { [key: string]: OrderStatus[] } = {
  [OrderStatus.PAUSE]: [OrderStatus.PROCESS, OrderStatus.DELETED],
  [OrderStatus.PROCESS]: [OrderStatus.FINISH],
};

class OrderServive {
  private readonly orderModel;
  private readonly orderItemModel;
  private readonly productModel;
  private readonly memberService;

  constructor() {
    this.orderModel = OrderModel;
    this.orderItemModel = OrderItemModel;
    this.productModel = ProductModel;
    this.memberService = new MemberService();
  }
  public async createOrder(member: Member, input: OrderInput): Promise<Order> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const orderAddress = parseDeliveryAddress(input?.deliveryAddress);
    if (!orderAddress)
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ADDRESS);
    if (
      !Array.isArray(input.items) ||
      input.items.length === 0 ||
      input.items.length > 50
    )
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ORDER_ITEMS);

    // Validate items against trusted product data; browser prices are ignored
    const productIds = input.items.map((item) => String(item?.productId));
    if (!productIds.every((id) => isValidObjectId(id)))
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ORDER_ITEMS);
    const products = await this.productModel
      .find({ _id: { $in: productIds.map(shapeIntoMongooseObjectId) } })
      .exec();

    const orderItems: OrderItemInput[] = [];
    const stockToReserve = new Map<string, number>();
    for (const item of input.items) {
      const quantity = item.itemQuantity;
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99)
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_QUANTITY);
      const product = products.find(
        (ele) => String(ele._id) === String(item.productId),
      );
      if (!product || product.productStatus !== ProductStatus.PROCESS)
        throw new Errors(
          HttpCode.BAD_REQUEST,
          Message.PRODUCT_UNAVAILABLE,
          product?.productName,
        );
      const hasSizes = product.productSizes?.length > 0;
      if (hasSizes && !product.productSizes.includes(Number(item.itemSize)))
        throw new Errors(
          HttpCode.BAD_REQUEST,
          Message.INVALID_SIZE,
          product.productName,
        );

      orderItems.push({
        itemQuantity: quantity,
        itemPrice: product.productPrice,
        itemSize: hasSizes ? Number(item.itemSize) : undefined,
        productId: product._id,
      });
      const key = String(product._id);
      stockToReserve.set(key, (stockToReserve.get(key) ?? 0) + quantity);
    }

    const amount =
      Math.round(
        orderItems.reduce(
          (accumulator, item) =>
            accumulator + item.itemPrice * item.itemQuantity,
          0,
        ) * 100,
      ) / 100;
    const delivery = amount < 100 ? 5 : 0;

    // Reserve shared stock (productLeftCount) with atomic conditional updates.
    // No transaction: each decrement only succeeds while enough stock is left,
    // and earlier reservations are released if a later step fails.
    const reserved: [string, number][] = [];
    let newOrder: Order | null = null;
    try {
      for (const [productId, quantity] of stockToReserve) {
        const updated = await this.productModel
          .findOneAndUpdate(
            {
              _id: shapeIntoMongooseObjectId(productId),
              productStatus: ProductStatus.PROCESS,
              productLeftCount: { $gte: quantity },
            },
            { $inc: { productLeftCount: -quantity } },
          )
          .exec();
        if (!updated) {
          const product = products.find((ele) => String(ele._id) === productId);
          throw new Errors(
            HttpCode.CONFLICT,
            Message.INSUFFICIENT_STOCK,
            product?.productName,
          );
        }
        reserved.push([productId, quantity]);
      }

      newOrder = await this.orderModel.create({
        orderTotal: amount + delivery,
        orderDelivery: delivery,
        memberId: memberId,
        orderAddress: orderAddress,
        orderStockReserved: true,
      });
      await this.recordOrderItem(newOrder._id, orderItems);
    } catch (err) {
      console.error("error,model:createOrder", (err as Error)?.message);
      for (const [productId, quantity] of reserved) {
        await this.productModel
          .updateOne(
            { _id: shapeIntoMongooseObjectId(productId) },
            { $inc: { productLeftCount: quantity } },
          )
          .exec();
      }
      if (newOrder) {
        await this.orderItemModel.deleteMany({ orderId: newOrder._id }).exec();
        await this.orderModel.deleteOne({ _id: newOrder._id }).exec();
      }
      if (err instanceof Errors) throw err;
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }

    if (input.saveAddress) {
      try {
        await this.memberService.updateMember(member, {
          _id: memberId,
          memberDeliveryAddress: orderAddress,
        });
      } catch (err) {
        console.error("error,model:createOrder saveAddress", err);
      }
    }
    return newOrder;
  }
  private async recordOrderItem(
    orderId: Types.ObjectId,
    input: OrderItemInput[],
  ): Promise<void> {
    const promisedList = input.map(async (item: OrderItemInput) => {
      item.orderId = orderId;
      item.productId = shapeIntoMongooseObjectId(item.productId);
      await this.orderItemModel.create(item);
      return "INSERTED";
    });
    await Promise.all(promisedList);
  }
  public async getMyOrders(
    member: Member,
    inquiry: OrderInquiry,
  ): Promise<Order[]> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const matches: any = {
      memberId: memberId,
    };

    if (inquiry.orderStatus) {
      matches.orderStatus = inquiry.orderStatus;
    }
    const result = await this.orderModel
      .aggregate([
        { $match: matches },
        { $sort: { updatedAt: -1 } },
        { $skip: (inquiry.page - 1) * inquiry.limit },
        { $limit: inquiry.limit },
        {
          $lookup: {
            from: "orderItems",
            localField: "_id",
            foreignField: "orderId",
            as: "orderItems",
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "orderItems.productId",
            foreignField: "_id",
            as: "productData",
          },
        },
      ])
      .exec();
    if (result.length === 0)
      throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }
  public async updateOrder(
    member: Member,
    input: OrderUpdateInput,
  ): Promise<Order> {
    if (!isValidObjectId(input?.orderId))
      throw new Errors(HttpCode.BAD_REQUEST, Message.ORDER_NOT_FOUND);
    const memberId = shapeIntoMongooseObjectId(member._id),
      orderId = shapeIntoMongooseObjectId(input.orderId),
      orderStaus = input.orderStatus as OrderStatus;

    const order = await this.orderModel
      .findOne({ memberId: memberId, _id: orderId })
      .exec();
    if (!order) throw new Errors(HttpCode.NOT_FOUND, Message.ORDER_NOT_FOUND);
    // Customer workflow: PAUSE -> PROCESS (pay) | DELETED (cancel), PROCESS -> FINISH
    if (!CUSTOMER_STATUS_FLOW[order.orderStatus]?.includes(orderStaus))
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ORDER_STATUS);

    const releaseStock =
      orderStaus === OrderStatus.DELETED && order.orderStockReserved === true;
    const result = await this.orderModel
      .findOneAndUpdate(
        { memberId: memberId, _id: orderId, orderStatus: order.orderStatus },
        releaseStock
          ? { orderStatus: orderStaus, orderStockReserved: false }
          : { orderStatus: orderStaus },
        { new: true },
      )
      .exec();
    if (!result)
      throw new Errors(HttpCode.CONFLICT, Message.INVALID_ORDER_STATUS);

    if (releaseStock) {
      const items = await this.orderItemModel.find({ orderId: orderId }).exec();
      for (const item of items) {
        await this.productModel
          .updateOne(
            { _id: item.productId },
            { $inc: { productLeftCount: item.itemQuantity } },
          )
          .exec();
      }
    }
    if (orderStaus === OrderStatus.PROCESS) {
      await this.memberService.addUserPoint(member, 1);
    }
    return result;
  }
}
export default OrderServive;
