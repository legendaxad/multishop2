import { T } from "../libs/types/common";
import { NextFunction, Request, Response } from "express";
import MemberService from "../model/model.service";
import { AdminRequest, LoginInput, MemberInput } from "../libs/types/member";
import { MemberType } from "../libs/enums/member";
import Errors, { HttpCode, Message } from "../libs/Error";
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
adminController.processSignup = async (req: AdminRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.SOMETHING_WENT_WRONG);
    }

    const newMember: MemberInput = req.body;
    newMember.memberImage = file?.path;
    newMember.memberType = MemberType.SHOP;

    const result = await memberService.processSignup(newMember);
    //TODO:SESSIONS authentication
    req.session.member = result;
    req.session.save(function () {
      res.redirect("/admin");
    });
  } catch (err) {
    console.error("Error  processSignup page:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>alert('Welcome, ${message}!'); window.location.replace('/admin/signup')</script>`,
    );
  }
};
adminController.processLogin = async (req: AdminRequest, res: Response) => {
  try {
    const input: LoginInput = req.body;
    const result = await memberService.processLogin(input);
    //TODO:SESSIONS authentication
    req.session.member = result;
    req.session.save(function () {
      res.redirect("/admin/product/all");
    });
    res.send(result);
  } catch (err) {
    console.error("Error  processLogin page:", err);
    const message =
      err instanceof Errors ? err.message : Message.SOMETHING_WENT_WRONG;
    res.send(
      `<script>alert('Welcome, ${message}!'); window.location.replace('/admin/signup')</script>`,
    );
  }
};

adminController.logout = async (req: AdminRequest, res: Response) => {
  try {
    req.session.destroy(function () {
      res.redirect("/admin");
    });
  } catch (err) {
    console.error("Error  processLogin page:", err);
    res.redirect("/admin");
  }
};

adminController.getUsers = async (req: Request, res: Response) => {
  try {
    console.log("getusers");
    const result = await memberService.getUsers();
    console.log("users:", result);
    res.render("users", { users: result });
  } catch (err) {
    console.error("Error  getUsers page:", err);
    res.redirect("/admin/login");
  }
};
adminController.updateChosenUser = async (req: Request, res: Response) => {
  try {
    console.log("updateChosenUser");

    const result = await memberService.updateChosenUser(req.body);
    res.status(HttpCode.OK).json({ data: result });
  } catch (err) {
    console.error("Error  updateChosenUser page:", err);
    if (err instanceof Errors) res.status(err.code).json(err);
    else res.status(Errors.standard.code).json(Errors.standard);
  }
};
adminController.checkout = async (req: AdminRequest, res: Response) => {
  try {
    if (req.session?.member)
      res.send(
        `<script>alert('Welcome, ${req.session.member.memberNick}!');</script>`,
      );
    else res.send(`<script>alert('${Message.NOT_AUTHENTICATED}');</script>`);
  } catch (err) {
    console.error("Error  checkout page:", err);
    res.redirect("/admin");
  }
};
adminController.verifyRestaurant = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction,
) => {
  if (req.session?.member?.memberType === MemberType.SHOP) {
    req.member = req.session.member;
    next();
  } else {
    const message = Message.NOT_AUTHENTICATED;
    res.send(
      `<script>alert('Welcome, ${message}!'); window.location.replace('/admin/login')</script>`,
    );
  }
};

export default adminController;
