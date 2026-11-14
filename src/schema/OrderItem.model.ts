import mongoose, { Schema } from "mongoose";
import { OrderItem } from "../libs/types/order";

const orderItemSchema = new Schema(
  {
    itemQuantity: {
      type: Number,
      required: true,
    },
    itemPrice: {
      type: Number,
      required: true,
    },
    // EU shoe size chosen by the customer (optional for legacy items and
    // products without sizes).
    itemSize: {
      type: Number,
    },
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
    },
  },
  {
    timestamps: true,
    collection: "orderItems",
  },
);
export default mongoose.model<OrderItem>("OrderItem", orderItemSchema);
