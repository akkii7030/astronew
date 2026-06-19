declare module "@cashfreepayments/cashfree-js" {
  export function load(opts: { mode: "production" | "sandbox" }): Promise<{
    checkout: (opts: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_modal" | "_parent" | "_top";
    }) => Promise<unknown>;
  }>;
}
