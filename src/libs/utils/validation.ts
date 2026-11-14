import { Types } from "mongoose";
import { DeliveryAddress } from "../types/member";

export const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;

// Escape user search text so it is matched literally inside a RegExp
export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const isValidObjectId = (value: any): boolean =>
  typeof value === "string" &&
  /^[a-f\d]{24}$/i.test(value) &&
  Types.ObjectId.isValid(value);

// Validate a delivery address; returns null when incomplete or invalid.
// Used by both member profile update and order creation.
export const parseDeliveryAddress = (input: any): DeliveryAddress | null => {
  if (typeof input === "string") {
    try {
      input = JSON.parse(input); // multipart profile updates send JSON text
    } catch {
      return null;
    }
  }
  if (!input || typeof input !== "object") return null;

  const text = (value: any, max: number) =>
    typeof value === "string" && value.trim().length <= max
      ? value.trim()
      : "";

  const address: DeliveryAddress = {
    recipientName: text(input.recipientName, 80),
    phone: text(input.phone, 20),
    addressLine1: text(input.addressLine1, 160),
    addressLine2: text(input.addressLine2, 160) || undefined,
    city: text(input.city, 80),
    region: text(input.region, 80) || undefined,
    postalCode: text(input.postalCode, 20) || undefined,
    country: text(input.country, 80),
  };

  if (
    !address.recipientName ||
    !address.addressLine1 ||
    !address.city ||
    !address.country ||
    !PHONE_PATTERN.test(address.phone)
  )
    return null;
  return address;
};
