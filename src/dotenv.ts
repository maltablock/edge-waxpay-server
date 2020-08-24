import * as dotenv from "dotenv";
import { ALL_NETWORKS } from "./utils";
import { NetworkName } from "@deltalabs/eos-utils";

dotenv.config();

export const getEnvConfig = () => {
  const parse = (networkName: NetworkName) => {
    const VAR_NAME = `${networkName.toUpperCase()}_ACCOUNT`;
    const val = process.env[VAR_NAME];
    if (!val) return;

    const [acc, permission, key, cpuPayer, cpuKey] = val
      .split(`;`)
      .map((x) => x.trim());

    return {
      payer: acc,
      permission: permission,
      key: key,
      cpuPayer,
      cpuKey,
    };
  };

  return ALL_NETWORKS.reduce(
    (acc, network) => ({
      ...acc,
      [network]: parse(network),
    }),
    {}
  ) as {
    [key: string]: ReturnType<typeof parse>;
  };
};
