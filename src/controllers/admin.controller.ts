import { T } from "../libs/types/common";
import { Request, Response } from "express";
import MemberService from "../model/model.service";
import { LoginInput, MemberInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member";
const memberService = new MemberService();
const adminController: T = {};
adminController.goHome = (req: Request, res: Response) => {
  try {
    res.render("home");
  } catch (error) {
    console.error("Error home page:", error);
  }
};
adminController.getLogin = (req: Request, res: Response) => {
  try {
    res.render("login");
  } catch (error) {
    console.error("Error login page:", error);
  }
};
adminController.getSignup = (req: Request, res: Response) => {
  try {
    res.render("signup");
  } catch (error) {
    console.error("Error signup page:", error);
  }
};
adminController.processSignup = async (req: Request, res: Response) => {
  try {
    const newMember: MemberInput = req.body;
    newMember.memberType = MemberType.SHOP;

    const result = await memberService.processSignup(newMember);
    //TODO:SESSIONS authentication

    res.send(result);
  } catch (error) {
    console.error("Error  processSignup page:", error);
    res.send(error);
  }
};
adminController.processLogin = async (req: Request, res: Response) => {
  try {
    const input: LoginInput = req.body;
    const result = await memberService.processLogin(input);
    //TODO:SESSIONS authentication

    res.send(result);
  } catch (error) {}
};

export default adminController;
