import { Schema } from "mongoose";
import { DeliveryAddress } from "../libs/types/member";

/**
 * Embedded delivery address. Used as the customer's default address on
 * Member and as an immutable snapshot on Order. Optional on both models, so
 * existing documents without an address remain valid.
 */
const deliveryAddressSchema = new Schema<DeliveryAddress>(
  {
    recipientName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    addressLine1: { type: String, required: true, trim: true },
    addressLine2: { type: String, trim: true },
    city: { type: String, required: true, trim: true },
    region: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, required: true, trim: true },
  },
  { _id: false },
);

export default deliveryAddressSchema;
