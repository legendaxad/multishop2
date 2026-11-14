import { Types } from "mongoose";
import { Product } from "./product";
import { OrderStatus } from "../enums/order.enum";
import { DeliveryAddress } from "./member";
export interface OrderItemInput {
  itemQuantity: number;
  itemPrice: number;
  itemSize?: number;
  productId: Types.ObjectId;
  orderId?: Types.ObjectId;
}
export interface OrderInput {
  items: OrderItemInput[];
  deliveryAddress: DeliveryAddress;
  saveAddress?: boolean;
}
export interface Order {
  _id: Types.ObjectId;
  memberId: Types.ObjectId;
  orderToatl: number;
  orderDelivery: number;
  orderStatus: OrderStatus;
  orderAddress?: DeliveryAddress;
  orderStockReserved?: boolean;
  createdAt: Date;
  updatedAt: Date;
  //   from aggregation
  orderItem: OrderItem[];
  productData: Product[];
}

export interface OrderItem {
  _id: Types.ObjectId;
  itemPrice: number;
  itemQuantity: number;
  itemSize?: number;
  orderId: Types.ObjectId;
  productId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderInquiry {
  page: number;
  limit: number;
  orderStatus: OrderStatus;
}
export interface OrderUpdateInput {
  orderId: string;
  orderStatus: string;
}
