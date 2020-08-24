import { RpcError } from "eosjs";
import { NetworkName } from "@deltalabs/eos-utils";

export const sleep = (ms: number, shouldRejectWithMessage = ``) =>
  new Promise((resolve, reject) => setTimeout(shouldRejectWithMessage ? () => reject(new Error(shouldRejectWithMessage)) : resolve, ms));

export const isProduction = () => process.env.NODE_ENV === `production`;

export const formatBloksTransaction = (network: NetworkName, txId: string) => {
  let bloksNetworkName = network as string;
  if(network === `wax`) bloksNetworkName = `wax`
  else if(network === `waxtest`) bloksNetworkName = `wax-test`

  const prefix = bloksNetworkName ? `${bloksNetworkName}.` : ``;
  return `https://${prefix}bloks.io/transaction/${txId}`;
};

export const extractRpcError = (err: Error|RpcError|any) => {
  let message = err.message
  if(err instanceof RpcError) {
    try {
      message = JSON.parse(err.message).error.details.map(detail => {
        return detail.message
      }).join(`\n`)
    } catch {}
  } else if (err.json) {
    // might only be LiquidApps client lib
    if(err.json.error) return err.json.error;
  }
  return message
}

export const ALL_NETWORKS: NetworkName[] = [`wax`, `waxtest`];
