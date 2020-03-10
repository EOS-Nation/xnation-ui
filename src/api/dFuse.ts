import { createDfuseClient } from "@dfuse/client";



export const client = createDfuseClient({
  apiKey: process.env.VUE_APP_DFUSETOKEN!,
  network: "mainnet"
});
