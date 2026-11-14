export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NOT_MODIFIED = 304,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

export enum Message {
  SOMETHING_WENT_WRONG = "Something went wrong!",
  NO_DATA_FOUND = "No data found!",
  CREATE_FAILED = "Create failed!",
  UPDATE_FAILED = "Update failed!",
  BLOCKED_USER = "You have been blocked by Shop , please contact with authors",
  NO_MEMBER_NICK = "No member with that nickname!",
  USED_NICK_PHONE = "You ara inserting already used nick or phone!",
  WRONG_PASSWORD = "Wrong password!",
  NOT_AUTHENTICATED = "You are not authenticated!Please login first.",
  TOKEN_CREATION_FAILED = "Token creation failed",
  // Customer shop (SPA) messages
  NOT_A_CUSTOMER = "This account cannot sign in to the shop.",
  INVALID_SIGNUP_DATA = "Please provide a nickname (2-30 characters), a valid phone number and a password of at least 6 characters.",
  INVALID_PROFILE_DATA = "Some profile fields are invalid.",
  CURRENT_PASSWORD_REQUIRED = "Please enter your current password to set a new one.",
  INVALID_IMAGE = "Please upload an image file.",
  INVALID_PRODUCT_ID = "Invalid product id!",
  PRODUCT_NOT_FOUND = "Product not found!",
  INVALID_FILTER = "Invalid product filter!",
  INVALID_ORDER_ITEMS = "Your cart contains invalid items.",
  INVALID_QUANTITY = "Item quantity must be a whole number between 1 and 99.",
  INVALID_SIZE = "Selected size is not available for this product.",
  PRODUCT_UNAVAILABLE = "A product in your cart is no longer available.",
  INSUFFICIENT_STOCK = "Not enough stock for an item in your cart.",
  INVALID_ADDRESS = "Please provide a complete delivery address.",
  ORDER_NOT_FOUND = "Order not found!",
  INVALID_ORDER_STATUS = "This order status change is not allowed.",
}

class Errors extends Error {
  public code: HttpCode;
  public message: Message;
  /** Optional customer-facing detail, e.g. which product is out of stock. */
  public detail?: string;
  static standard = {
    code: HttpCode.INTERNAL_SERVER_ERROR,
    message: Message.SOMETHING_WENT_WRONG,
  };

  constructor(statusCode: HttpCode, statusMessage: Message, detail?: string) {
    super();
    this.code = statusCode;
    this.message = statusMessage;
    if (detail) this.detail = detail;
  }
}

export default Errors;
