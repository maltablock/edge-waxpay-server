import { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { getLogFilePath, logger } from "../logger";
import * as ecc from "eosjs-ecc";
import { getNetwork, rpc, getNetworkName, api } from "../eos/networks";
import { extractRpcError } from "../utils";
import { getEnvConfig } from "../dotenv";
import { addRateLimit, checkRateLimit } from "./utils/rate-limit";
import { TTransactionResult } from "@deltalabs/eos-utils";
import * as crypto from "crypto";

type ErrorObject = {
  errorCode: string;
  message: string;
  data?: string;
};
function getErrorObject(errorCode: string, message: string, data?: any) {
  const error: ErrorObject = {
    errorCode,
    message,
    data,
  };

  return error;
}

async function createPremiumName(
  waxApi,
  name,
  ownerKey,
  activeKey
): Promise<TTransactionResult["result"]> {
  const config = getEnvConfig()[getNetworkName()];
  const creator = `phoenix`;
  const actions = [];

  actions.push({
    account: "eosio",
    name: "newaccount",
    authorization: [
      {
        actor: creator,
        permission: config.permission,
      },
    ],
    data: {
      active: {
        accounts: [],
        keys: [
          {
            key: activeKey,
            weight: 1,
          },
        ],
        threshold: 1,
        waits: [],
      },
      creator: creator,
      name: name,
      owner: {
        accounts: [],
        keys: [
          {
            key: ownerKey,
            weight: 1,
          },
        ],
        threshold: 1,
        waits: [],
      },
    },
  });
  actions.push({
    account: "eosio",
    name: "buyrambytes",
    authorization: [
      {
        actor: creator,
        permission: config.permission,
      },
    ],
    data: {
      bytes: 6144,
      payer: creator,
      receiver: name,
    },
  });
  actions.push({
    account: "eosio",
    name: "delegatebw",
    authorization: [
      {
        actor: creator,
        permission: config.permission,
      },
    ],
    data: {
      from: creator,
      receiver: name,
      stake_cpu_quantity: "0.90000000 WAX",
      stake_net_quantity: "0.10000000 WAX",
      transfer: true,
    },
  });

  const result = await waxApi.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 60,
    }
  );

  return result;
}

async function checkAccountExists(account: string) {
  try {
    await rpc.get_account(account);
    return true;
  } catch (error) {
    const rpcError = extractRpcError(error);
    if (/unknown key/i.test(rpcError)) {
      // error when account does not exist yet
      return false;
    } else {
      throw error;
    }
  }
}
async function getFreeName(waxApi): Promise<string> {
  let name = ``;

  const getRandomName = () => {
    const letters = `abcdefghijklmnopqrstuvwxyz12345`.split(``);

    const buf = Array.from(new Uint8Array(crypto.randomBytes(4)));
    const prefix = buf.map((val) => letters[val % letters.length]).join(``);
    return `${prefix}.phoenix`;
  };

  let isFree = false;
  let counter = 0;
  const MAX_TRIES = 10;
  while (!isFree && counter < MAX_TRIES) {
    name = getRandomName();
    isFree = !(await checkAccountExists(name));
    counter++;
  }

  if (counter == MAX_TRIES) {
    throw new Error(`could not find a free account name`);
  }

  return name;
}

export default class WaxController {
  // https://github.com/EdgeApp/edge-eospay-server/blob/67d79cabdba31247960b4cfdd5d4e104a1e55c99/src/eos-name-server.js#L301
  async activateAccount(req: Request, res: Response, next: NextFunction) {
    const body = req.body;
    const errors = [];
    const { ownerPublicKey, activePublicKey } = body;

    const bodyParams = [
      "ownerPublicKey",
      "activePublicKey",
    ];

    const validations = [
      () => {
        // body has necessary parameters
        if (!body || typeof body !== "object") {
          errors.push(
            getErrorObject(
              `Invalid_POST_Body`,
              `No parameters were detected in the incoming body.`
            )
          );
          return;
        }

        if (typeof body.requestedAccountName === "string") {
          errors.push(
            getErrorObject(
              `Invalid_POST_Body`,
              `The 'requestedAccountName' parameter is not available on this endpoint. A free account name will be chosen instead.`
            )
          );
        }

        bodyParams.forEach((param) => {
          // console.log(`Validating: ${param}...`)
          if (
            body.hasOwnProperty(param) &&
            typeof body[param] === "string" &&
            body[param] &&
            body[param].length > 0
          ) {
            switch (param) {
              case "ownerPublicKey":
              case "activePublicKey":
                if (!ecc.isValidPublic(body[param])) {
                  errors.push(
                    getErrorObject(
                      `InvalidEosKeyFormat`,
                      `The key provided "'${body[param]}'" appears to be invalid.`
                    )
                  );
                }
                break;
            }
          } else {
            errors.push(
              getErrorObject(
                `Invalid_${param}`,
                `${param} is NOT defined as a string in the incoming body.`
              )
            );
          }
        });
      },
      () => {
        // check if rate-limited
        const ipsToCheck = [
          req.headers["x-forwarded-for"],
          req.connection.remoteAddress,
        ].filter(Boolean);
        const publicKeysToCheck = [ownerPublicKey, activePublicKey];
        try {
          checkRateLimit(ipsToCheck, publicKeysToCheck);
        } catch (error) {
          errors.push(getErrorObject(`RateLimited`, error.message));
        }
      },
    ];

    validations.forEach((valFn, i) => {
      // console.log(`validation ${i}`)
      valFn();
    });

    if (errors.length > 0) {
      return void res.status(500).send(errors);
    }

    // create account
    try {
      const accountName = await getFreeName(api);
      const txResult = await createPremiumName(
        api,
        accountName,
        ownerPublicKey,
        activePublicKey
      );

      const ipsToFilter = [
        req.headers["x-forwarded-for"],
        req.connection.remoteAddress,
      ].filter(Boolean);
      const publicKeysToFilter = [ownerPublicKey, activePublicKey];
      addRateLimit(ipsToFilter, publicKeysToFilter);

      return {
        accountName,
        ownerPublicKey,
        activePublicKey,
        transactionId: txResult.transaction_id,
      };
    } catch (error) {
      logger.error(
        `Unexpected error while creating account: ${extractRpcError(error)}`
      );
      console.error(
        `Unexpected error while creating account: ${extractRpcError(error)}`
      );
      return void res
        .status(500)
        .send([
          getErrorObject(
            `AccountCreationFailure`,
            `Something went wrong while creating the account.`
          ),
        ]);
    }
  }
}
