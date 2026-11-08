import { T } from "../libs/types/common";
import { Request, Response } from "express";
import {
  ExtendedRequest,
  LoginInput,
  Member,
  MemberInput,
} from "../libs/types/member";
import MemberService from "../model/Member.service";
import Errors, { HttpCode } from "../libs/Error";
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
export default memberController;
