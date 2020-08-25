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

const getEosErrorDetails = (eosError: { details: any[]}) => {
  return eosError.details.map(detail => {
    return detail.message
  }).join(`\n`)
}
export const extractRpcError = (err: Error|RpcError|any) => {
  let message = err.message
  if(err instanceof RpcError) {
    try {
      message = getEosErrorDetails(JSON.parse(err.message).error)
    } catch {}
  } else if (err.json) {
    if(err.json.error) return getEosErrorDetails(err.json.error);
  }
  return message
}

export const ALL_NETWORKS: NetworkName[] = [`wax`, `waxtest`];
