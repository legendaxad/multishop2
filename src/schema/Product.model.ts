import mongoose, { Schema } from "mongoose";
import { Product } from "../libs/types/product";
import { ProductCollection, ProductStatus } from "../libs/enums/product.enums";

const productSchema = new Schema<Product>(
  {
    productName: {
      type: String,
      required: true,
      trim: true,
    },

    productBrand: {
      type: String,
      required: true,
      trim: true,
    },

    productCategory: {
      type: String,
      enum: ProductCollection,
      required: true,
    },

    productPrice: {
      type: Number,
      required: true,
      min: 0,
    },

    productDesc: {
      type: String,
      required: true,
    },

    productImages: {
      type: [String],
      default: [],
    },

    productSizes: {
      type: [Number],
      required: true,
    },

    productLeftCount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },

    productStatus: {
      type: String,
      enum: ProductStatus,
      default: ProductStatus.PAUSE,
    },

    productViews: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

export default mongoose.model<Product>("Product", productSchema);
