import { NextFunction, Request, Response } from "express";
import { readFileSync } from "fs";
import { getLogFilePath, logger } from "../logger";
import * as ecc from "eosjs-ecc";
import { getNetwork, rpc, getNetworkName, api } from "../eos/networks";
import { extractRpcError } from "../utils";
import { getEnvConfig } from "../dotenv";
import { addRateLimit, checkRateLimit } from "./utils/rate-limit";

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

async function createPremiumName(waxApi, name, ownerKey, activeKey) {
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

  await waxApi.transact(
    {
      actions,
    },
    {
      blocksBehind: 3,
      expireSeconds: 60,
    }
  );
}

export default class WaxController {
  // https://github.com/EdgeApp/edge-eospay-server/blob/67d79cabdba31247960b4cfdd5d4e104a1e55c99/src/eos-name-server.js#L301
  async activateAccount(req: Request, res: Response, next: NextFunction) {
    const body = req.body;
    const errors = [];
    const { requestedAccountName, ownerPublicKey, activePublicKey } = body;

    const bodyParams = [
      "requestedAccountName",
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

        bodyParams.forEach((param) => {
          // console.log(`Validating: ${param}...`)
          if (
            body.hasOwnProperty(param) &&
            typeof body[param] !== "undefined" &&
            body[param] &&
            body[param].length > 0 &&
            typeof body[param] === "string"
          ) {
            switch (param) {
              case "requestedAccountName": {
                if (body[param].length != 12) {
                  errors.push(
                    getErrorObject(
                      `InvalidAccountNameFormat`,
                      `The requested account name "'${body[param]}'" is not 12 characters long. This server is not prepared to handle bidding on acccount names shorter than 12 characters for the EOS network.`
                    )
                  );
                }

                if (!(body[param] as string).endsWith(`.phoenix`)) {
                  errors.push(
                    getErrorObject(
                      `InvalidAccountNameFormat`,
                      `The requested account name "'${body[param]}'" does not end with '.phoenix'. All free WAX accounts must have the '.phoenix' suffix.`
                    )
                  );
                }

                if (!/[a-z1-5]{1,4}\.phoenix/.test(body[param])) {
                  errors.push(
                    getErrorObject(
                      `InvalidAccountNameFormat`,
                      `The requested account name "'${body[param]}'" is invalid.`
                    )
                  );
                }

                break;
              }
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
        const publicKeysToCheck = [ownerPublicKey, activePublicKey]
        try {
          checkRateLimit(ipsToCheck, publicKeysToCheck)
        } catch (error) {
          errors.push(
            getErrorObject(
              `RateLimited`,
              error.message,
            )
          );
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

    // does account already exist?
    try {
      await rpc.get_account(requestedAccountName);
      errors.push(
        getErrorObject(
          `InvalidAccountName`,
          `The requested account name '${requestedAccountName}' already exists.`
        )
      );
    } catch (error) {
      const rpcError = extractRpcError(error);
      if (/unknown key/i.test(rpcError)) {
        // do nothing
      } else {
        logger.error(`Unexpected error while fetching account: ${rpcError}`);
        errors.push(
          getErrorObject(
            `AccountCreationFailure`,
            `Something went wrong while checking account name availability.`
          )
        );
      }
    }

    if (errors.length > 0) {
      return void res.status(500).send(errors);
    }

    // create account
    try {
      await createPremiumName(
        api,
        requestedAccountName,
        ownerPublicKey,
        activePublicKey
      );
    } catch (error) {
      logger.error(`Unexpected error while creating account: ${extractRpcError(error)}`);
      return void res
        .status(500)
        .send([
          getErrorObject(
            `AccountCreationFailure`,
            `Something went wrong while creating the account.`
          ),
        ]);
    }

    const ipsToFilter = [
      req.headers["x-forwarded-for"],
      req.connection.remoteAddress,
    ].filter(Boolean);
    const publicKeysToFilter = [ownerPublicKey, activePublicKey]
    addRateLimit(ipsToFilter, publicKeysToFilter)

    return { requestedAccountName, ownerPublicKey, activePublicKey };
  }
}
