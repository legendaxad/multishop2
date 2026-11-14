import { T } from "../libs/types/common";
import { CookieOptions, NextFunction, Request, Response } from "express";
import fs from "fs";
import { parseDeliveryAddress } from "../libs/utils/validation";
import {
  ExtendedRequest,
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import MemberService from "../model/Member.service";
import Errors, { HttpCode, Message } from "../libs/Error";
import { AUTH_TIMER } from "../libs/config";
import AuthService from "../model/Auth.service";
const memberService = new MemberService();
const authService = new AuthService();
const memberController: T = {};

// Customer JWT cookie (separate from the admin express-session cookie)
const cookieOptions: CookieOptions = {
  maxAge: AUTH_TIMER * 3600 * 1000,
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
memberController.getShop = async (req: Request, res: Response) => {
  const result = await memberService.getShop();
  res.status(HttpCode.OK).json(result);
};
memberController.signup = async (req: ExtendedRequest, res: Response) => {
  try {
    const input: MemberInput = req.body;
    // Profile image is optional and only accepted as an uploaded file
    input.memberImage = undefined;
    if (req.file) {
      if (
        !req.file.mimetype.startsWith("image/") ||
        req.file.size > MAX_IMAGE_SIZE
      )
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_IMAGE);
      input.memberImage = req.file.path.replace(/\\/g, "/");
    }
    const result: Member = await memberService.signup(input),
      token = await authService.createToken(result);
    res.cookie("accessToken", token, cookieOptions);

    res.status(HttpCode.CREATED).json({ member: result });
  } catch (error) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (error instanceof Errors) res.status(error.code).json(error);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.login = async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body;
    const result = await memberService.login(input);
    const token = await authService.createToken(result);
    res.cookie("accessToken", token, cookieOptions);
    res.status(HttpCode.OK).json({ member: result });
  } catch (error) {
    if (error instanceof Errors) res.status(error.code).json(error);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.logout = async (req: ExtendedRequest, res: Response) => {
  try {
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie("accessToken", clearOptions);
    res.status(HttpCode.OK).json({ logout: true });
  } catch (error) {
    if (error instanceof Errors) res.status(error.code).json(error);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.getMemberDetail = async (
  req: ExtendedRequest,
  res: Response,
) => {
  try {
    const result = await memberService.getMemberDetail(req.member);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.error("Error getMemberDetail page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.updateMember = async (req: ExtendedRequest, res: Response) => {
  try {
    const input: MemberUpdateInput = req.body;
    if (req.file) {
      if (!req.file.mimetype.startsWith("image/")) {
        fs.unlink(req.file.path, () => {});
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_IMAGE);
      }
      input.memberImage = req.file.path.replace(/\\/g, "/");
    }
    if (input.memberDeliveryAddress) {
      const address = parseDeliveryAddress(input.memberDeliveryAddress);
      if (!address)
        throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_ADDRESS);
      input.memberDeliveryAddress = address;
    }
    const result = await memberService.updateMember(req.member, input);
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.error("Error updateMember page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.getTopUsers = async (req: Request, res: Response) => {
  try {
    const result = await memberService.getTopUsers();
    res.status(HttpCode.OK).json(result);
  } catch (err) {
    console.error("Error getTopUsers page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.verifyAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies["accessToken"];
    if (!token)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    // Expired/invalid tokens and members who are no longer ACTIVE are rejected
    const tokenMember = await authService.checkAuth(token);
    req.member = await memberService.getMemberDetail(tokenMember);
    next();
  } catch (err) {
    const { maxAge, ...clearOptions } = cookieOptions;
    res.clearCookie("accessToken", clearOptions);
    res
      .status(HttpCode.UNAUTHORIZED)
      .json(new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED));
  }
};

memberController.retrieveAuth = async (
  req: ExtendedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const token = req.cookies["accessToken"];
    if (token) req.member = await authService.checkAuth(token);
    next();
  } catch (err) {
    console.error("Error retrieveAuth page:", err);
    next();
  }
};

export default memberController;
