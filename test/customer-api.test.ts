/**
 * Customer API integration tests.
 *
 * Runs the real Express app against an isolated in-memory MongoDB
 * (mongodb-memory-server). It never connects to the database in .env:
 * MONGO_URL is set before the app is loaded and asserted to be local.
 *
 * Run (from the backend root):
 *   MONGOMS_VERSION=6.0.14 TS_NODE_TRANSPILE_ONLY=1 \
 *     node --require ts-node/register test/customer-api.test.ts
 * Requires `mongodb-memory-server` to be resolvable (devDependency or NODE_PATH).
 */
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { AddressInfo } from "net";
import { Server } from "http";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import * as bcrypt from "bcryptjs";

let mongo: MongoMemoryServer;
let server: Server;
let base = "";

// Loaded after env is prepared
let ProductModel: mongoose.Model<any>;
let MemberModel: mongoose.Model<any>;
let OrderModel: mongoose.Model<any>;

const ids: Record<string, string> = {};
const createdUploads: string[] = [];

type Res = { status: number; body: any; cookies: string[]; text: string };

async function call(
  method: string,
  url: string,
  options: { body?: unknown; cookie?: string; form?: boolean } = {},
): Promise<Res> {
  const headers: Record<string, string> = {};
  let body: any;
  if (options.body instanceof FormData) body = options.body;
  else if (options.form) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams(options.body as Record<string, string>).toString();
  } else if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }
  if (options.cookie) headers.Cookie = options.cookie;
  const res = await fetch(base + url, { method, headers, body, redirect: "manual" });
  const text = await res.text();
  let parsed: any = text;
  try {
    parsed = JSON.parse(text);
  } catch {}
  return { status: res.status, body: parsed, text, cookies: res.headers.getSetCookie() };
}

const cookieValue = (cookies: string[], name: string) =>
  cookies.find((c) => c.startsWith(name + "="))?.split(";")[0] ?? "";

const address = {
  recipientName: "Jordan Lee",
  phone: "+1 555 0100",
  addressLine1: "12 Market Street",
  city: "Seoul",
  country: "South Korea",
  postalCode: "04524",
};

async function signupCustomer(nick: string, phone: string) {
  const res = await call("POST", "/member/signup", {
    body: { memberNick: nick, memberPhone: phone, memberPassword: "secret12" },
  });
  assert.equal(res.status, 201, res.text);
  return cookieValue(res.cookies, "accessToken");
}

before(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGO_URL = mongo.getUri() + "multishop_test";
  process.env.SECRET_TOKEN = "test-secret-token";
  process.env.SESSION_SECRET = "test-session-secret";
  assert.match(process.env.MONGO_URL, /^mongodb:\/\/127\.0\.0\.1:\d+\//);

  await mongoose.connect(process.env.MONGO_URL);
  // require() (not import()) so ts-node compiles these after env is prepared
  const app = require("../src/app").default;
  ProductModel = require("../src/schema/Product.model").default;
  MemberModel = require("../src/schema/Member.model").default;
  OrderModel = require("../src/schema/Order.model").default;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const products = await ProductModel.create([
    { productName: "Velocity Runner", productBrand: "Stride", productCategory: "RUNNING", productPrice: 60, productDesc: "Runner", productImages: ["uploads/products/a.jpg"], productSizes: [40, 41, 42], productLeftCount: 5, productStatus: "PROCESS" },
    { productName: "Court King", productBrand: "Apex", productCategory: "BASKETBALL", productPrice: 30, productDesc: "Court", productImages: [], productSizes: [40], productLeftCount: 1, productStatus: "PROCESS" },
    { productName: "Hidden Draft", productBrand: "Apex", productCategory: "RUNNING", productPrice: 10, productDesc: "Paused", productImages: [], productSizes: [40], productLeftCount: 10, productStatus: "PAUSE" },
    { productName: "Weird (Name) Trainer", productBrand: "Form", productCategory: "TRAINING", productPrice: 120, productDesc: "Trainer", productImages: [], productSizes: [41], productLeftCount: 3, productStatus: "PROCESS" },
  ]);
  ids.runner = String(products[0]._id);
  ids.court = String(products[1]._id);
  ids.paused = String(products[2]._id);
  ids.trainer = String(products[3]._id);
  // Legacy product without sizes (bypasses schema validation, as old data could)
  const legacy = await ProductModel.collection.insertOne({
    productName: "Classic Laces", productBrand: "Form", productCategory: "OTHER", productPrice: 8, productDesc: "Laces", productImages: [], productSizes: [], productLeftCount: 20, productStatus: "PROCESS", productViews: 0, createdAt: new Date(), updatedAt: new Date(),
  });
  ids.laces = String(legacy.insertedId);

  const hash = await bcrypt.hash("secret12", await bcrypt.genSalt());
  await MemberModel.collection.insertMany([
    { memberNick: "blocked_user", memberPhone: "01000000001", memberPassword: hash, memberType: "USER", memberStatus: "BLOCK", memberPoint: 0 },
    { memberNick: "legacy_user", memberPhone: "01000000002", memberPassword: "plainpass1", memberType: "USER", memberStatus: "ACTIVE", memberPoint: 0 },
    { memberNick: "deleted_user", memberPhone: "01000000003", memberPassword: hash, memberType: "USER", memberStatus: "DELETE", memberPoint: 0 },
  ]);
});

after(async () => {
  for (const file of createdUploads) fs.rmSync(file, { force: true });
  await new Promise((resolve) => server?.close(resolve));
  await mongoose.disconnect();
  await mongo?.stop();
  // connect-mongodb-session keeps its own client open
  setTimeout(() => process.exit(process.exitCode ?? 0), 200).unref();
});

describe("admin platform remains functional and isolated", () => {
  let adminCookie = "";

  test("admin signup (multipart with image) creates the SHOP account and a session", async () => {
    const form = new FormData();
    form.append("memberNick", "shop_admin");
    form.append("memberPhone", "01099999999");
    form.append("memberPassword", "adminpass");
    form.append("memberImage", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "logo.png");
    const res = await call("POST", "/admin/signup", { body: form });
    assert.equal(res.status, 302);
    const shop = await MemberModel.findOne({ memberNick: "shop_admin" }).lean<any>();
    assert.equal(shop.memberType, "SHOP");
    createdUploads.push(path.resolve(shop.memberImage));
  });

  test("admin login uses the session cookie and reaches admin pages", async () => {
    const res = await call("POST", "/admin/login", {
      form: true,
      body: { memberIdentity: "shop_admin", memberPassword: "adminpass" },
    });
    assert.equal(res.status, 302);
    assert.equal(res.cookies.some((c) => c.startsWith("accessToken=")), false);
    adminCookie = cookieValue(res.cookies, "connect.sid");
    assert.ok(adminCookie);
    const users = await call("GET", "/admin/user/all", { cookie: adminCookie });
    assert.equal(users.status, 200);
    assert.match(users.text, /<html/i);
    const products = await call("GET", "/admin/product/all", { cookie: adminCookie });
    assert.equal(products.status, 200);
    assert.match(products.text, /Velocity Runner/);
  });

  test("admin session does not authenticate customer endpoints", async () => {
    const res = await call("GET", "/member/detail", { cookie: adminCookie });
    assert.equal(res.status, 401);
  });

  test("SHOP account cannot log in to the customer shop", async () => {
    const res = await call("POST", "/member/login", {
      body: { memberIdentity: "shop_admin", memberPassword: "adminpass" },
    });
    assert.equal(res.status, 403);
  });

  test("customer token does not authenticate admin pages", async () => {
    const token = await signupCustomer("isolation_user", "01077777777");
    const res = await call("GET", "/admin/user/all", { cookie: token });
    assert.match(res.text, /admin\/login/);
  });

  test("admin user management (block) still works and blocks the customer", async () => {
    const user = await MemberModel.findOne({ memberNick: "isolation_user" }).lean<any>();
    const res = await call("POST", "/admin/user/edit", {
      cookie: adminCookie,
      body: { _id: String(user._id), memberStatus: "BLOCK" },
    });
    assert.equal(res.status, 200);
    const login = await call("POST", "/member/login", {
      body: { memberIdentity: "isolation_user", memberPassword: "secret12" },
    });
    assert.equal(login.status, 403);
  });
});

describe("customer authentication", () => {
  test("signup whitelists fields, hashes the password and sets an httpOnly cookie", async () => {
    const res = await call("POST", "/member/signup", {
      body: {
        memberNick: "jordan88", memberPhone: "01012345678", memberPassword: "secret12",
        memberType: "ADMIN", memberStatus: "BLOCK", memberPoint: 999, memberAddress: "Seoul",
      },
    });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.member.memberType, "USER");
    assert.equal(res.body.member.memberStatus, "ACTIVE");
    assert.equal(res.body.member.memberPoint, 0);
    assert.equal("memberPassword" in res.body.member, false);
    assert.equal("accessToken" in res.body, false);
    const cookie = res.cookies.find((c) => c.startsWith("accessToken="))!;
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Lax/);
    const stored = await MemberModel.findOne({ memberNick: "jordan88" }).select("+memberPassword").lean<any>();
    assert.match(stored.memberPassword, /^\$2[aby]\$/);
  });

  test("signup rejects invalid data and duplicates", async () => {
    const short = await call("POST", "/member/signup", {
      body: { memberNick: "x1", memberPhone: "01011112222", memberPassword: "123" },
    });
    assert.equal(short.status, 400);
    const badPhone = await call("POST", "/member/signup", {
      body: { memberNick: "phoneless", memberPhone: "abc", memberPassword: "secret12" },
    });
    assert.equal(badPhone.status, 400);
    const dup = await call("POST", "/member/signup", {
      body: { memberNick: "jordan88", memberPhone: "01099990000", memberPassword: "secret12" },
    });
    assert.equal(dup.status, 400);
  });

  test("login by nickname and phone; invalid credentials rejected", async () => {
    const byNick = await call("POST", "/member/login", { body: { memberIdentity: "jordan88", memberPassword: "secret12" } });
    assert.equal(byNick.status, 200);
    assert.equal("memberPassword" in byNick.body.member, false);
    const byPhone = await call("POST", "/member/login", { body: { memberIdentity: "01012345678", memberPassword: "secret12" } });
    assert.equal(byPhone.status, 200);
    const wrong = await call("POST", "/member/login", { body: { memberIdentity: "jordan88", memberPassword: "nope123" } });
    assert.equal(wrong.status, 401);
    const unknown = await call("POST", "/member/login", { body: { memberIdentity: "nobody", memberPassword: "secret12" } });
    assert.equal(unknown.status, 404);
  });

  test("blocked and deleted customers cannot log in", async () => {
    const blocked = await call("POST", "/member/login", { body: { memberIdentity: "blocked_user", memberPassword: "secret12" } });
    assert.equal(blocked.status, 403);
    const deleted = await call("POST", "/member/login", { body: { memberIdentity: "deleted_user", memberPassword: "secret12" } });
    assert.equal(deleted.status, 404);
  });

  test("legacy plain-text password logs in once and is upgraded to bcrypt", async () => {
    const res = await call("POST", "/member/login", { body: { memberIdentity: "legacy_user", memberPassword: "plainpass1" } });
    assert.equal(res.status, 200);
    const stored = await MemberModel.findOne({ memberNick: "legacy_user" }).select("+memberPassword").lean<any>();
    assert.match(stored.memberPassword, /^\$2[aby]\$/);
    const again = await call("POST", "/member/login", { body: { memberIdentity: "legacy_user", memberPassword: "plainpass1" } });
    assert.equal(again.status, 200);
  });

  test("session restoration, invalid tokens and logout", async () => {
    const none = await call("GET", "/member/detail");
    assert.equal(none.status, 401);
    const garbage = await call("GET", "/member/detail", { cookie: "accessToken=not.a.jwt" });
    assert.equal(garbage.status, 401);

    const login = await call("POST", "/member/login", { body: { memberIdentity: "jordan88", memberPassword: "secret12" } });
    const token = cookieValue(login.cookies, "accessToken");
    const detail = await call("GET", "/member/detail", { cookie: token });
    assert.equal(detail.status, 200);
    assert.equal(detail.body.memberNick, "jordan88");
    assert.equal("memberPassword" in detail.body, false);

    const logout = await call("POST", "/member/logout", { cookie: token });
    assert.equal(logout.status, 200);
    assert.match(logout.cookies.join(";"), /accessToken=;/);
    const loggedOutWithoutCookie = await call("POST", "/member/logout");
    assert.equal(loggedOutWithoutCookie.status, 200);
  });

  test("a token stops working once the member is blocked", async () => {
    const token = await signupCustomer("soon_blocked", "01055550000");
    await MemberModel.updateOne({ memberNick: "soon_blocked" }, { memberStatus: "BLOCK" });
    const res = await call("GET", "/member/detail", { cookie: token });
    assert.equal(res.status, 401);
  });
});

describe("customer profile", () => {
  let token = "";
  before(async () => {
    token = await signupCustomer("profile_user", "01020002000");
    await call("POST", "/member/update", { cookie: token, body: { memberDesc: "Keeps this bio" } });
  });

  test("only approved fields are updated and undefined fields are preserved", async () => {
    const res = await call("POST", "/member/update", {
      cookie: token,
      body: { memberNick: "profile_user2", memberType: "ADMIN", memberPoint: 1000, memberStatus: "BLOCK" },
    });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.memberNick, "profile_user2");
    assert.equal(res.body.memberType, "USER");
    assert.equal(res.body.memberPoint, 0);
    assert.equal(res.body.memberStatus, "ACTIVE");
    assert.equal(res.body.memberDesc, "Keeps this bio");
    assert.equal("memberPassword" in res.body, false);
  });

  test("password change is hashed and usable for login", async () => {
    const res = await call("POST", "/member/update", { cookie: token, body: { memberPassword: "newpass99" } });
    assert.equal(res.status, 200);
    const stored = await MemberModel.findOne({ memberNick: "profile_user2" }).select("+memberPassword").lean<any>();
    assert.match(stored.memberPassword, /^\$2[aby]\$/);
    const login = await call("POST", "/member/login", { body: { memberIdentity: "profile_user2", memberPassword: "newpass99" } });
    assert.equal(login.status, 200);
  });

  test("delivery address is validated and persisted", async () => {
    const bad = await call("POST", "/member/update", { cookie: token, body: { memberDeliveryAddress: { city: "Seoul" } } });
    assert.equal(bad.status, 400);
    const ok = await call("POST", "/member/update", { cookie: token, body: { memberDeliveryAddress: address } });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.memberDeliveryAddress.addressLine1, address.addressLine1);
    const detail = await call("GET", "/member/detail", { cookie: token });
    assert.equal(detail.body.memberDeliveryAddress.city, "Seoul");
  });

  test("multipart update with a JSON address and an image", async () => {
    const form = new FormData();
    form.append("memberDesc", "Multipart bio");
    form.append("memberDeliveryAddress", JSON.stringify({ ...address, city: "Busan" }));
    form.append("memberImage", new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" }), "me.png");
    const res = await call("POST", "/member/update", { cookie: token, body: form });
    assert.equal(res.status, 200, res.text);
    assert.equal(res.body.memberDeliveryAddress.city, "Busan");
    assert.match(res.body.memberImage, /^uploads\/members\/.+\.png$/);
    createdUploads.push(path.resolve(res.body.memberImage));
    const image = await call("GET", "/" + res.body.memberImage);
    assert.equal(image.status, 200);
  });

  test("non-image upload is rejected", async () => {
    const form = new FormData();
    form.append("memberImage", new Blob(["hello"], { type: "text/plain" }), "note.txt");
    const res = await call("POST", "/member/update", { cookie: token, body: form });
    assert.equal(res.status, 400);
  });

  test("duplicate nickname is rejected", async () => {
    const res = await call("POST", "/member/update", { cookie: token, body: { memberNick: "jordan88" } });
    assert.equal(res.status, 400);
  });

  test("unauthenticated profile update is rejected", async () => {
    const res = await call("POST", "/member/update", { body: { memberNick: "hacker" } });
    assert.equal(res.status, 401);
  });
});

describe("product catalog", () => {
  test("listing works without query params and hides non-PROCESS products", async () => {
    const res = await call("GET", "/product/all");
    assert.equal(res.status, 200);
    const names = res.body.map((p: any) => p.productName);
    assert.ok(names.includes("Velocity Runner"));
    assert.equal(names.includes("Hidden Draft"), false);
  });

  test("category filter uses productCategory", async () => {
    const res = await call("GET", "/product/all?productCollection=BASKETBALL");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((p: any) => p.productName), ["Court King"]);
    const empty = await call("GET", "/product/all?productCollection=FOOTBALL");
    assert.equal(empty.status, 404);
    const invalid = await call("GET", "/product/all?productCollection=SANDALS");
    assert.equal(invalid.status, 400);
  });

  test("search is escaped and matches name or brand", async () => {
    const special = await call("GET", "/product/all?search=" + encodeURIComponent("(name)"));
    assert.equal(special.status, 200);
    assert.equal(special.body[0].productName, "Weird (Name) Trainer");
    const brand = await call("GET", "/product/all?search=apex");
    assert.deepEqual(brand.body.map((p: any) => p.productName), ["Court King"]);
    const regexy = await call("GET", "/product/all?search=" + encodeURIComponent(".*"));
    assert.equal(regexy.status, 404);
  });

  test("sorting by price ascending", async () => {
    const res = await call("GET", "/product/all?order=productPrice&limit=10");
    const prices = res.body.map((p: any) => p.productPrice);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
  });

  test("pagination returns distinct pages and a total count", async () => {
    const page1 = await call("GET", "/product/all?page=1&limit=2&order=productPrice");
    const page2 = await call("GET", "/product/all?page=2&limit=2&order=productPrice");
    assert.equal(page1.body.length, 2);
    assert.equal(page2.body.length, 2);
    const all = [...page1.body, ...page2.body].map((p: any) => p._id);
    assert.equal(new Set(all).size, 4);
    const count = await call("GET", "/product/count");
    assert.deepEqual(count.body, { total: 4 });
    const filtered = await call("GET", "/product/count?productCollection=RUNNING");
    assert.deepEqual(filtered.body, { total: 1 });
  });

  test("product detail, invalid id and missing product", async () => {
    const ok = await call("GET", `/product/${ids.runner}`);
    assert.equal(ok.status, 200);
    assert.deepEqual(ok.body.productSizes, [40, 41, 42]);
    const invalid = await call("GET", "/product/not-an-id");
    assert.equal(invalid.status, 400);
    const missing = await call("GET", `/product/${new mongoose.Types.ObjectId()}`);
    assert.equal(missing.status, 404);
    const paused = await call("GET", `/product/${ids.paused}`);
    assert.equal(paused.status, 404);
  });

  test("existing uploaded product images are served from /uploads", async () => {
    const dir = path.resolve("uploads/products");
    const file = fs.existsSync(dir) ? fs.readdirSync(dir).find((f) => !f.startsWith(".")) : undefined;
    if (!file) return; // no local uploads to check
    const res = await call("GET", `/uploads/products/${file}`);
    assert.equal(res.status, 200);
  });
});

describe("checkout and orders", () => {
  let token = "";
  let otherToken = "";
  const stock = async (id: string) =>
    (await ProductModel.findById(id).lean<any>()).productLeftCount;

  before(async () => {
    token = await signupCustomer("buyer_one", "01030003000");
    otherToken = await signupCustomer("buyer_two", "01040004000");
  });

  test("unauthenticated order is rejected", async () => {
    const res = await call("POST", "/order/create", { body: { items: [], deliveryAddress: address } });
    assert.equal(res.status, 401);
  });

  test("valid order uses database prices, stores sizes and address snapshot, reserves stock", async () => {
    const before = await stock(ids.runner);
    const res = await call("POST", "/order/create", {
      cookie: token,
      body: {
        items: [
          { productId: ids.runner, itemQuantity: 2, itemSize: 41, itemPrice: 1 },
          { productId: ids.runner, itemQuantity: 1, itemSize: 42, itemPrice: 1 },
          { productId: ids.laces, itemQuantity: 1, itemPrice: 0 },
        ],
        deliveryAddress: address,
        orderTotal: 3,
        saveAddress: true,
      },
    });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.orderTotal, 60 * 3 + 8); // 188, free delivery
    assert.equal(res.body.orderDelivery, 0);
    assert.equal(res.body.orderStatus, "PAUSE");
    assert.equal(res.body.orderAddress.addressLine1, address.addressLine1);
    assert.equal(await stock(ids.runner), before - 3);
    const member = await call("GET", "/member/detail", { cookie: token });
    assert.equal(member.body.memberDeliveryAddress.city, address.city);
  });

  test("delivery fee applies below 100", async () => {
    const res = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.laces, itemQuantity: 2 }], deliveryAddress: address },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.orderTotal, 16 + 5);
    assert.equal(res.body.orderDelivery, 5);
  });

  test("invalid quantities are rejected", async () => {
    for (const itemQuantity of [0, -1, 1.5, 100, "2"]) {
      const res = await call("POST", "/order/create", {
        cookie: token,
        body: { items: [{ productId: ids.runner, itemQuantity, itemSize: 40 }], deliveryAddress: address },
      });
      assert.equal(res.status, 400, `quantity ${itemQuantity}`);
    }
  });

  test("invalid or unavailable products are rejected", async () => {
    const bad = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: "abc", itemQuantity: 1 }], deliveryAddress: address },
    });
    assert.equal(bad.status, 400);
    const missing = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: String(new mongoose.Types.ObjectId()), itemQuantity: 1 }], deliveryAddress: address },
    });
    assert.equal(missing.status, 400);
    const paused = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.paused, itemQuantity: 1, itemSize: 40 }], deliveryAddress: address },
    });
    assert.equal(paused.status, 400);
    assert.equal(paused.body.detail, "Hidden Draft");
  });

  test("invalid or missing sizes are rejected", async () => {
    const wrong = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.runner, itemQuantity: 1, itemSize: 46 }], deliveryAddress: address },
    });
    assert.equal(wrong.status, 400);
    const none = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.runner, itemQuantity: 1 }], deliveryAddress: address },
    });
    assert.equal(none.status, 400);
  });

  test("missing or incomplete delivery address is rejected", async () => {
    const res = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.laces, itemQuantity: 1 }], deliveryAddress: { city: "Seoul" } },
    });
    assert.equal(res.status, 400);
    const none = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.laces, itemQuantity: 1 }] },
    });
    assert.equal(none.status, 400);
  });

  test("insufficient stock is rejected and earlier reservations are released", async () => {
    const runnerBefore = await stock(ids.runner);
    const res = await call("POST", "/order/create", {
      cookie: token,
      body: {
        items: [
          { productId: ids.runner, itemQuantity: 1, itemSize: 40 },
          { productId: ids.court, itemQuantity: 2, itemSize: 40 },
        ],
        deliveryAddress: address,
      },
    });
    assert.equal(res.status, 409);
    assert.equal(res.body.detail, "Court King");
    assert.equal(await stock(ids.runner), runnerBefore);
    assert.equal(await stock(ids.court), 1);
  });

  test("concurrent orders cannot oversell the last item", async () => {
    const body = { items: [{ productId: ids.court, itemQuantity: 1, itemSize: 40 }], deliveryAddress: address };
    const results = await Promise.all([
      call("POST", "/order/create", { cookie: token, body }),
      call("POST", "/order/create", { cookie: otherToken, body }),
      call("POST", "/order/create", { cookie: token, body }),
    ]);
    const statuses = results.map((r) => r.status).sort();
    assert.deepEqual(statuses, [201, 409, 409]);
    assert.equal(await stock(ids.court), 0);
  });

  test("order history matches items by product id with purchase price, size and address", async () => {
    // Change the product price and the profile address after purchase
    await ProductModel.updateOne({ _id: ids.runner }, { productPrice: 75 });
    await call("POST", "/member/update", { cookie: token, body: { memberDeliveryAddress: { ...address, city: "Daegu" } } });

    const res = await call("GET", "/order/all?page=1&limit=10", { cookie: token });
    assert.equal(res.status, 200);
    const order = res.body.find((o: any) => o.orderTotal === 188);
    assert.ok(order);
    assert.equal(order.orderAddress.city, "Seoul"); // snapshot unchanged
    for (const item of order.orderItems) {
      const product = order.productData.find((p: any) => p._id === item.productId);
      assert.ok(product, "every item has its product");
    }
    const sizes = order.orderItems.filter((i: any) => i.productId === ids.runner).map((i: any) => i.itemSize).sort();
    assert.deepEqual(sizes, [41, 42]);
    assert.ok(order.orderItems.every((i: any) => i.productId !== ids.runner || i.itemPrice === 60));

    const filtered = await call("GET", "/order/all?orderStatus=PAUSE", { cookie: token });
    assert.ok(filtered.body.every((o: any) => o.orderStatus === "PAUSE"));
    const invalid = await call("GET", "/order/all?orderStatus=SHIPPED", { cookie: token });
    assert.equal(invalid.status, 400);
    const others = await call("GET", "/order/all", { cookie: otherToken });
    assert.ok(others.status === 200 || others.status === 404);
    if (others.status === 200)
      assert.ok(others.body.every((o: any) => o.orderTotal !== 188));
  });

  test("status workflow: only customer transitions are allowed; cancel releases stock", async () => {
    const created = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.trainer, itemQuantity: 2, itemSize: 41 }], deliveryAddress: address },
    });
    assert.equal(created.status, 201);
    const orderId = created.body._id;
    assert.equal(await stock(ids.trainer), 1);

    const skip = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "FINISH" } });
    assert.equal(skip.status, 400);
    const foreign = await call("POST", "/order/update", { cookie: otherToken, body: { orderId, orderStatus: "DELETED" } });
    assert.equal(foreign.status, 404);

    const cancel = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "DELETED" } });
    assert.equal(cancel.status, 200);
    assert.equal(await stock(ids.trainer), 3);
    const again = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "DELETED" } });
    assert.equal(again.status, 400);
    assert.equal(await stock(ids.trainer), 3);
  });

  test("pay then confirm: PAUSE -> PROCESS (+1 point) -> FINISH", async () => {
    const created = await call("POST", "/order/create", {
      cookie: token,
      body: { items: [{ productId: ids.laces, itemQuantity: 1 }], deliveryAddress: address },
    });
    const orderId = created.body._id;
    const pay = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "PROCESS" } });
    assert.equal(pay.status, 200);
    const member = await call("GET", "/member/detail", { cookie: token });
    assert.equal(member.body.memberPoint, 1);
    const cancelAfterPay = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "DELETED" } });
    assert.equal(cancelAfterPay.status, 400);
    const finish = await call("POST", "/order/update", { cookie: token, body: { orderId, orderStatus: "FINISH" } });
    assert.equal(finish.status, 200);
    assert.equal((await OrderModel.findById(orderId).lean<any>()).orderStatus, "FINISH");
  });

  test("legacy orders without a stock reservation do not restore stock on cancel", async () => {
    const member = await MemberModel.findOne({ memberNick: "buyer_one" }).lean<any>();
    const legacy = await OrderModel.collection.insertOne({
      orderTotal: 13, orderDelivery: 5, orderStatus: "PAUSE", memberId: member._id, createdAt: new Date(), updatedAt: new Date(),
    });
    await mongoose.connection.collection("orderItems").insertOne({
      orderId: legacy.insertedId, productId: new mongoose.Types.ObjectId(ids.laces), itemPrice: 8, itemQuantity: 1,
    });
    const before = await stock(ids.laces);
    const res = await call("POST", "/order/update", {
      cookie: token,
      body: { orderId: String(legacy.insertedId), orderStatus: "DELETED" },
    });
    assert.equal(res.status, 200);
    assert.equal(await stock(ids.laces), before);
  });
});

describe("homepage data: views ranking and top customers", () => {
  test("product views are counted once per member and drive order=productViews", async () => {
    const viewerA = await signupCustomer("viewer_a", "01060006000");
    const viewerB = await signupCustomer("viewer_b", "01070007000");
    const before = await call("GET", `/product/${ids.laces}`);
    // Anonymous views are not counted
    assert.equal((await call("GET", `/product/${ids.laces}`)).body.productViews, before.body.productViews);

    await call("GET", `/product/${ids.trainer}`, { cookie: viewerA });
    await call("GET", `/product/${ids.trainer}`, { cookie: viewerA }); // repeat view: not counted twice
    await call("GET", `/product/${ids.trainer}`, { cookie: viewerB });
    await call("GET", `/product/${ids.laces}`, { cookie: viewerA });

    const ranked = await call("GET", "/product/all?order=productViews&limit=4");
    assert.equal(ranked.status, 200);
    const views = ranked.body.map((p: any) => p.productViews);
    assert.deepEqual(views, [...views].sort((a: number, b: number) => b - a));
    assert.equal(ranked.body[0].productName, "Weird (Name) Trainer");
    assert.equal(ranked.body[0].productViews, 2);
  });

  test("ids filter returns only those available products and never counts views", async () => {
    const viewer = await signupCustomer("ids_viewer", "01033330000");
    const before = (await ProductModel.findById(ids.runner).lean<any>()).productViews;
    const res = await call("GET", `/product/all?ids=${ids.runner},${ids.paused},${ids.court}&limit=50`, { cookie: viewer });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.map((p: any) => p._id).sort(), [ids.runner, ids.court].sort());
    assert.equal((await ProductModel.findById(ids.runner).lean<any>()).productViews, before);
    const invalid = await call("GET", "/product/all?ids=abc");
    assert.equal(invalid.status, 400);
  });

  test("top users only expose public leaderboard fields", async () => {
    const res = await call("GET", "/member/top-users");
    assert.equal(res.status, 200);
    assert.ok(res.body.length >= 1);
    for (const member of res.body) {
      assert.deepEqual(
        Object.keys(member).filter((key) => !["_id", "memberNick", "memberImage", "memberPoint"].includes(key)),
        [],
      );
      assert.ok(member.memberPoint >= 1);
    }
    const points = res.body.map((m: any) => m.memberPoint);
    assert.deepEqual(points, [...points].sort((a: number, b: number) => b - a));
  });
});

describe("signup with an optional profile image", () => {
  const png = () => new Blob([Buffer.from("89504e470d0a1a0a", "hex")], { type: "image/png" });

  test("multipart signup stores the uploaded image and serves it", async () => {
    const form = new FormData();
    form.append("memberNick", "photo_user");
    form.append("memberPhone", "01080008000");
    form.append("memberPassword", "secret12");
    form.append("memberType", "ADMIN");
    form.append("memberPoint", "500");
    form.append("memberImage", png(), "me.png");
    const res = await call("POST", "/member/signup", { body: form });
    assert.equal(res.status, 201, res.text);
    assert.equal(res.body.member.memberType, "USER");
    assert.equal(res.body.member.memberPoint, 0);
    assert.equal("memberPassword" in res.body.member, false);
    assert.match(res.body.member.memberImage, /^uploads\/members\/.+\.png$/);
    createdUploads.push(path.resolve(res.body.member.memberImage));
    assert.ok(res.cookies.some((c) => c.startsWith("accessToken=")));
    const image = await call("GET", "/" + res.body.member.memberImage);
    assert.equal(image.status, 200);
  });

  test("JSON signup without an image still works and ignores a client image path", async () => {
    const res = await call("POST", "/member/signup", {
      body: { memberNick: "no_photo", memberPhone: "01090009000", memberPassword: "secret12", memberImage: "uploads/members/someone-else.png" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.member.memberImage, undefined);
  });

  test("non-image uploads are rejected and the file is removed", async () => {
    const dir = path.resolve("uploads/members");
    const beforeFiles = fs.readdirSync(dir).length;
    const form = new FormData();
    form.append("memberNick", "bad_upload");
    form.append("memberPhone", "01011110000");
    form.append("memberPassword", "secret12");
    form.append("memberImage", new Blob(["not an image"], { type: "text/plain" }), "note.txt");
    const res = await call("POST", "/member/signup", { body: form });
    assert.equal(res.status, 400);
    assert.equal(await MemberModel.exists({ memberNick: "bad_upload" }), null);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(fs.readdirSync(dir).length, beforeFiles);
  });

  test("failed signup (duplicate nickname) removes the uploaded image", async () => {
    const dir = path.resolve("uploads/members");
    const beforeFiles = fs.readdirSync(dir).length;
    const form = new FormData();
    form.append("memberNick", "photo_user");
    form.append("memberPhone", "01022220000");
    form.append("memberPassword", "secret12");
    form.append("memberImage", png(), "dup.png");
    const res = await call("POST", "/member/signup", { body: form });
    assert.equal(res.status, 400);
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(fs.readdirSync(dir).length, beforeFiles);
  });
});
