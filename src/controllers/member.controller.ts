import { T } from "../libs/types/common";
import { NextFunction, Request, Response } from "express";
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
memberController.getShop = async (req: Request, res: Response) => {
  const result = await memberService.getShop();
  res.status(HttpCode.OK).json(result);
};
memberController.signup = async (req: Request, res: Response) => {
  try {
    const input: MemberInput = req.body,
      result: Member = await memberService.signup(input),
      token = await authService.createToken(result);
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });

    res.status(HttpCode.CREATED).json({ member: result, accessToken: token });
  } catch (error) {
    if (error instanceof Errors) res.status(error.code).json(error);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.login = async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body;
    const result = await memberService.login(input);
    const token = await authService.createToken(result);
    console.log(token);
    res.cookie("accessToken", token, {
      maxAge: AUTH_TIMER * 3600 * 1000,
      httpOnly: false,
    });
    res.status(HttpCode.OK).json({ member: result, accessToken: token });
  } catch (error) {
    if (error instanceof Errors) res.status(error.code).json(error);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
memberController.logout = async (req: ExtendedRequest, res: Response) => {
  try {
    console.log("keldik logountfa");
    res.clearCookie("accessToken", {
      httpOnly: true,
      path: "/",
    });
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
    if (req.file) input.memberImage = req.file.path;
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
    console.log("keldik verifyAuth", req.cookies);

    const token = req.cookies["accessToken"];
    console.log("keldik verifyAuth", token);
    if (token) req.member = await authService.checkAuth(token);
    if (!req.member)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.NOT_AUTHENTICATED);
    next();
  } catch (err) {
    if (err instanceof Errors) {
      res.status(err.code).json(err);
    } else {
      res.status(Errors.standard.code).json(Errors.standard);
    }
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
