import {
  ProductCollection,
  ProductSize,
  ProductStatus,
} from "../enums/product.enums";

import { Types } from "mongoose";

export interface Product {
  _id: Types.ObjectId;
  productName: string;
  productBrand: string;
  productCategory: ProductCollection;
  productPrice: number;
  productDesc: string;
  productImages: string[];
  productSizes: ProductSize[];
  productLeftCount: number;
  productStatus: ProductStatus;
  productViews: number;
}

export interface ProductInput {
  productName: string;
  productBrand: string;
  productCategory: ProductCollection;
  productPrice: number;
  productDesc: string;
  productImages: string[];
  productSizes: ProductSize[];
  productLeftCount: number;
  productStatus?: ProductStatus;
  productViews?: number;
}

export interface ProductUpdateInput {
  _id: Types.ObjectId;
  productName?: string;
  productBrand?: string;
  productCategory?: ProductCollection;
  productPrice?: number;
  productDesc?: string;
  productImages?: string[];
  productSizes?: ProductSize[];
  productLeftCount?: number;
  productStatus?: ProductStatus;
  productViews?: number;
}
