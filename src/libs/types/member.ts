import { MemberStatus, MemberType } from "../enums/member";
import { ObjectId } from "mongoose";
import { Request } from "express";
import { Session } from "express-session";
export interface Member {
  _id: ObjectId;
  memberType: MemberType;
  memberStatus: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
  memberPoint: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemberInput {
  memberType?: MemberType;
  memberStatus?: MemberStatus;
  memberNick: string;
  memberPhone: string;
  memberPassword: string;
  memberAddress?: string;
  memberDesc?: string;
  memberImage?: string;
  memberPoint: number;
}

export interface LoginInput {
  memberIdentity: string;
  memberPassword: string;
}
export interface AdminRequest extends Request {
  member: Member;
  session: Session & { member: Member };
  file: Express.Multer.File;
  files: Express.Multer.File[];
}
