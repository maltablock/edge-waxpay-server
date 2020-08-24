export function exhaustiveCheck(x: never) {
  throw new Error("exhaustiveCheck: should not reach here");
}

export type ArgsType<T> = T extends (...args: infer U) => any ? U : never;
