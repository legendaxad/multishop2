import { Response } from "express";
import { T } from "../libs/types/common";
import { ExtendedRequest } from "../libs/types/member";
import Errors, { HttpCode } from "../libs/Error";
import OrderServive from "../model/Order.service";
import { OrderInquiry, OrderUpdateInput } from "../libs/types/order";
import { OrderStatus } from "../libs/enums/order.enum";

const orderController: T = {};
const orderServive = new OrderServive();
orderController.createOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("createOrder");
    const result = await orderServive.createOrder(req.member, req.body);
    res.status(HttpCode.CREATED).json(result);
  } catch (err) {
    console.error("Error createOrder page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};

orderController.getMyOrders = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("getMyOrders");
    const { page, limit, orderStatus } = req.query;
    const inquiry: OrderInquiry = {
      page: Number(page) || 1,
      limit: Number(limit) || 10,
      orderStatus: orderStatus as OrderStatus,
    };
    const result = await orderServive.getMyOrders(req.member, inquiry);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.error("Error getMyOrders page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
orderController.updateOrder = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("updateOrder");
    const input: OrderUpdateInput = req.body;
    const result = await orderServive.updateOrder(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.error("Error updateOrder page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
export default orderController;
