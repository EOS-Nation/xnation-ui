import { JsonRpc } from "eosjs";
import { createDfuseClient } from "@dfuse/client";

const client = createDfuseClient({
  network: "eos.dfuse.eosnation.io",
  authentication: false
});

export const rpc = new JsonRpc("https://api.eosn.io");

export const dFuse = client;
