import mongoose, { Schema } from "mongoose";
import { OrderStatus } from "../libs/enums/order.enum";
import { Order } from "../libs/types/order";
import deliveryAddressSchema from "./DeliveryAddress.schema";

const orderSchema = new Schema(
  {
    orderTotal: {
      type: Number,
      required: true,
    },
    orderDelivery: {
      type: Number,
      required: true,
    },
    orderStatus: {
      type: String,
      enum: OrderStatus,
      default: OrderStatus.PAUSE,
    },
    memberId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "Member",
    },
    // Snapshot of the delivery address at order time. Optional so orders
    // created before this field existed remain valid.
    orderAddress: {
      type: deliveryAddressSchema,
      required: false,
    },
    // True when product stock was decremented for this order. Used to return
    // stock exactly once on cancellation; legacy orders default to false.
    orderStockReserved: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);
export default mongoose.model<Order>("Order", orderSchema);
