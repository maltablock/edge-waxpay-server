import { NetworkName } from "@deltalabs/eos-utils";

export const latestHealth: {
  block?: number;
  time?: Date;
  lastError?: { message: string; date: Date };
} = {};

export const pulse = (
  headBlock: number,
  headTime: string
) => {
  latestHealth.block = headBlock;
  latestHealth.time = new Date(`${headTime}Z`);
};

export const pulseError = (errorMessage: string) => {
  latestHealth.lastError = { message: errorMessage, date: new Date() };
};
