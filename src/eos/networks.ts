import { createNetwork, Api } from "@deltalabs/eos-utils";
import { JsSignatureProvider } from "eosjs/dist/eosjs-jssig";
import { getEnvConfig } from "../dotenv";
import { isProduction } from "../utils";

export const getNetworkName = () => {
  return `wax`; // TODO: enable wax only on prod
  // return isProduction() ? `wax` : `waxtest`;
};

export const getContracts = (): {} => {
  const network = getNetworkName();
  const envConfig = getEnvConfig();

  switch (network) {
    case `waxtest`:
      return {};
    case `wax`:
      return {};
    default:
      throw new Error(
        `No contract accounts for "${network}" network defined yet`
      );
  }
};

const WaxTestNetwork = createNetwork(
  `waxtest`,
  process.env.WAXTEST_ENDPOINT || `https://waxtestnet.greymass.com`
);
const WaxNetwork = createNetwork(
  `wax`,
  process.env.WAX_ENDPOINT || `https://api-wax.maltablock.org`
);

export const getNetwork = () => {
  const networkName = getNetworkName();
  switch (networkName) {
    case `wax`:
      return WaxNetwork;
    case `waxtest`:
      return WaxTestNetwork;
    default:
      throw new Error(`Network "${networkName}" not supported yet.`);
  }
};

const network = getNetwork();
const { rpc } = network;

const config = getEnvConfig()
const signatureProvider = new JsSignatureProvider([config[network.networkName!].key]);
const api = new Api({
  rpc: rpc,
  signatureProvider,
  textDecoder: new TextDecoder(),
  textEncoder: new TextEncoder(),
});

export { rpc, api };
