import { MemberStatus, MemberType } from "../libs/enums/member.enum";
import Errors, { HttpCode, Message } from "../libs/Error";
import {
  LoginInput,
  Member,
  MemberInput,
  MemberUpdateInput,
} from "../libs/types/member";
import * as bcrypt from "bcryptjs";
import MemberModel from "../schema/Member.model";
import { shapeIntoMongooseObjectId } from "../libs/config";
import { PHONE_PATTERN } from "../libs/utils/validation";

// bcryptjs hash format ($2a$/$2b$/$2y$ + cost + 53 chars)
const BCRYPT_HASH = /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/;

class MemberService {
  private readonly memberModel;

  constructor() {
    this.memberModel = MemberModel;
  }

  //   SPA -SHOP
  public async getShop(): Promise<Member> {
    const result = await this.memberModel
      .findOne({ memberType: MemberType.SHOP })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }
  public async signup(input: MemberInput): Promise<Member> {
    const nick = String(input.memberNick ?? "").trim();
    const phone = String(input.memberPhone ?? "").trim();
    if (
      nick.length < 2 ||
      nick.length > 30 ||
      !PHONE_PATTERN.test(phone) ||
      typeof input.memberPassword !== "string" ||
      input.memberPassword.length < 6
    )
      throw new Errors(HttpCode.BAD_REQUEST, Message.INVALID_SIGNUP_DATA);

    // Whitelist: customers cannot choose type, status or points
    const newMember: MemberInput = {
      memberNick: nick,
      memberPhone: phone,
      memberPassword: input.memberPassword,
      memberAddress: input.memberAddress,
      memberDesc: input.memberDesc,
      memberType: MemberType.USER,
      memberPoint: 0,
    };
    const salt = await bcrypt.genSalt();
    newMember.memberPassword = await bcrypt.hash(newMember.memberPassword, salt);
    try {
      const result = await this.memberModel.create(newMember);
      const { memberPassword, ...member } = result.toJSON();
      return member as Member;
    } catch (err) {
      console.log("Error,model:signup", err);
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        {
          $or: [
            { memberNick: input.memberIdentity },
            { memberPhone: input.memberIdentity },
          ],
          memberStatus: { $ne: MemberStatus.DELETE },
        },
        {
          memberNick: 1,
          memberPassword: 1,
          memberPhone: 1,
          memberStatus: 1,
          memberType: 1,
        },
      )
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
    else if (member.memberStatus === MemberStatus.BLOCK)
      throw new Errors(HttpCode.FORBIDDEN, Message.BLOCKED_USER);
    else if (member.memberType !== MemberType.USER)
      throw new Errors(HttpCode.FORBIDDEN, Message.NOT_A_CUSTOMER);

    const isHashed = BCRYPT_HASH.test(member.memberPassword);
    const isMatch = isHashed
      ? await bcrypt.compare(input.memberPassword, member.memberPassword)
      : input.memberPassword === member.memberPassword;
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    if (!isHashed) {
      // Legacy plain-text password: upgrade only if it is still the value we verified
      const salt = await bcrypt.genSalt();
      await this.memberModel
        .updateOne(
          { _id: member._id, memberPassword: member.memberPassword },
          { memberPassword: await bcrypt.hash(input.memberPassword, salt) },
        )
        .exec();
    }
    return (await this.memberModel
      .findById(member._id)
      .lean()
      .exec()) as Member;
  }
  public async getMemberDetail(member: Member): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const result = await this.memberModel
      .findOne({ _id: memberId, memberStatus: MemberStatus.ACTIVE })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result as Member;
  }
  public async updateMember(
    member: Member,
    input: MemberUpdateInput,
  ): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    // Whitelist: only the customer's own profile fields (undefined keys are dropped by Mongoose)
    const updateData: MemberUpdateInput = {
      _id: memberId,
      memberNick: input.memberNick,
      memberPhone: input.memberPhone,
      memberAddress: input.memberAddress,
      memberDesc: input.memberDesc,
      memberImage: input.memberImage,
      memberDeliveryAddress: input.memberDeliveryAddress,
    };
    if (input.memberPassword) {
      const salt = await bcrypt.genSalt();
      updateData.memberPassword = await bcrypt.hash(input.memberPassword, salt);
    }
    try {
      const result = await this.memberModel.findByIdAndUpdate(
        { _id: memberId },
        updateData,
        { new: true },
      );
      if (!result)
        throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
      return result;
    } catch (err) {
      if (err instanceof Errors) throw err;
      throw new Errors(HttpCode.BAD_REQUEST, Message.USED_NICK_PHONE);
    }
  }
  public async getTopUsers(): Promise<Member[]> {
    const result = this.memberModel
      .find({
        memberStatus: MemberStatus.ACTIVE,
        memberPoint: { $gte: 1 },
      })
      .sort({ memberPoint: "desc" })
      .limit(4)
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }
  public async addUserPoint(member: Member, point: number): Promise<Member> {
    const memberId = shapeIntoMongooseObjectId(member._id);
    const result = await this.memberModel
      .findOneAndUpdate(
        {
          _id: memberId,
          memberType: MemberType.USER,
          memberStatus: MemberStatus.ACTIVE,
        },
        { $inc: { memberPoint: point } },
        { new: true },
      )
      .lean()
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }

  //SSR -ADMIN

  public async processSignup(input: MemberInput): Promise<Member> {
    const exist = await this.memberModel
      .findOne({
        memberType: MemberType.SHOP,
      })
      .exec();
    if (exist) throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    const salt = await bcrypt.genSalt();
    input.memberPassword = await bcrypt.hash(input.memberPassword, salt);

    try {
      const result = await this.memberModel.create(input);
      result.memberPassword = "";
      return result;
    } catch (err) {
      throw new Errors(HttpCode.BAD_REQUEST, Message.CREATE_FAILED);
    }
  }

  public async processLogin(input: LoginInput): Promise<Member> {
    const member = await this.memberModel
      .findOne(
        { memberNick: input.memberIdentity },
        { memberNick: 1, memberPassword: 1 },
      )
      .exec();
    if (!member) throw new Errors(HttpCode.NOT_FOUND, Message.NO_MEMBER_NICK);
    const isMatch = await bcrypt.compare(
      input.memberPassword,
      member.memberPassword,
    );
    if (!isMatch)
      throw new Errors(HttpCode.UNAUTHORIZED, Message.WRONG_PASSWORD);
    return (await this.memberModel
      .findById(member._id)
      .exec()) as unknown as Member;
  }
  public async getUsers(): Promise<Member[]> {
    const result = await this.memberModel
      .find({ memberType: MemberType.USER })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_FOUND, Message.NO_DATA_FOUND);
    return result;
  }
  public async updateChosenUser(input: MemberUpdateInput): Promise<Member> {
    input._id = shapeIntoMongooseObjectId(input._id);
    const result = await this.memberModel
      .findByIdAndUpdate({ _id: input._id }, input, { new: true })
      .exec();
    if (!result) throw new Errors(HttpCode.NOT_MODIFIED, Message.UPDATE_FAILED);
    return result;
  }
}
export default MemberService;
