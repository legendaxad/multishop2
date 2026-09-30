import mongoose, { Schema } from "mongoose";
import { MemberStatus, MemberType } from "../libs/enums/member";
import { Member } from "../libs/types/member";

const memberSchema = new Schema<Member>(
  {
    memberType: {
      type: String,
      enum: MemberType,
      default: MemberType.USER,
    },
    memberStatus: {
      type: String,
      enum: MemberStatus,
      default: MemberStatus.ACTIVE,
    },
    memberNick: {
      type: String,
      index: { unique: true, sparse: true },
      required: true,
    },
    memberPhone: {
      type: String,
      index: { unique: true, sparse: true },
      required: true,
    },
    memberPassword: {
      type: String,
      required: true,
      select: false,
    },
    memberAddress: {
      type: String,
    },
    memberDesc: {
      type: String,
    },
    memberImage: {
      type: String,
    },
    memberPoint: {
      type: Number,
    },
  },
  {
    timestamps: true,
  },
);

export default mongoose.model<Member>("Member", memberSchema);
