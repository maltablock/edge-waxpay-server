import request from "supertest";
import _app from "../src/server";

describe(`createAccount`, () => {
  it("should fail for invalid account names", async () => {
    const app = request(_app) as any;
    const res = await app.post("/api/v1/activateAccount").send({
      requestedAccountName: `test`,
      ownerPublicKey: `EOS8DnoFK9D9HgAMdVocM58woFwWQZJe5L6PAYVQEQTH1xwWJ1Esr`,
      activePublicKey: `EOS6D8ANTQCgpmtK4qPD8MwCqATade3y8Lcq8EWcEWthPoYV7sTxV`,
    });

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveLength(1);
    const expectedErrors = [
      expect.stringMatching(/parameter is not available/i),
    ];
    expect(res.body.map((error) => error.message)).toEqual(
      expect.arrayContaining(expectedErrors)
    );
  });

  it("should fail for invalid public keys", async () => {
    const app = request(_app) as any;
    const res = await app.post("/api/v1/activateAccount").send({
      ownerPublicKey: `EOS8DnoFK9D9HgAMdVocM58woFwWQZJe5L6PAYVQEQTH1xwWJ1Es`,
      activePublicKey: `EOS6D8ANTQCgpmtK4qPD8MwCqATade3y8Lcq8EWcEWthPoYV7sTx`,
    });

    expect(res.statusCode).toEqual(500);
    expect(res.body).toHaveLength(2);
    const expectedErrors = [
      expect.stringMatching(/appears to be invalid/i),
      expect.stringMatching(/appears to be invalid/i),
    ];
    expect(res.body.map((error) => error.message)).toEqual(
      expect.arrayContaining(expectedErrors)
    );
  });

  it.skip("can create an account", async () => {
    const app = request(_app) as any;
    const params = {
      ownerPublicKey: `EOS5csHP9HNjy1y24KZu4PftFxdqxZWSs8hnjrTW8qXq73p6ZM8EU`,
      activePublicKey: `EOS5csHP9HNjy1y24KZu4PftFxdqxZWSs8hnjrTW8qXq73p6ZM8EU`,
    }
    const res = await app.post("/api/v1/activateAccount").send(params);

    expect(res.body).toMatchObject(params);
    expect(res.statusCode).toEqual(200);
  });
});
