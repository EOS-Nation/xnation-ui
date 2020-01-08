import { VuexModule, mutation, action, Module } from "vuex-class-component";
import { web3 } from "@/api/helpers";
import { ABISmartToken } from '@/api/ethConfig';
import { EthAddress } from '@/types/bancor';

const tx = (data: any) =>
  new Promise((resolve, reject) => {
    console.log("pumping into web3.eth.sendTransaction is...", data);
    web3.eth
      .sendTransaction(data)
      .on("transactionHash", hash => {
        console.log("returning a tx hash!", hash);
        resolve(hash);
      })
      .on("receipt", (receipt: any) => {
        console.log("receipt received", receipt);
      })
      .on("confirmation", (confirmationNumber: any, receipt: any) => {
        console.log({ confirmationNumber, receipt });
      })
      .on("error", error => reject(error));
  });

@Module({ namespacedPath: "ethWallet/" })
export class EthereumModule extends VuexModule {
  loggedInAccount: string = "";

  @mutation setLoggedInAccount(account: string) {
    this.loggedInAccount = account;
  }

  get isAuthenticated() {
    return this.loggedInAccount;
  }

  get ethereum() {
    // @ts-ignore
    return window["ethereum"];
  }

  @action async logout() {
    console.warn("Client cannot logout by itself, log out via MetaMask.");
  }

  @action async connect() {
    // @ts-ignore
    const accounts = await web3.currentProvider.enable();
    if (!accounts) throw new Error("Failed to find a Web3 compatible wallet.");
    this.setLoggedInAccount(accounts[0]);
    this.startListener();
    return accounts[0];
  }

  @action async startListener() {
    // @ts-ignore
    web3.currentProvider.publicConfigStore.on(
      "update",
      (x: {
        isUnlocked: boolean;
        isEnabled: boolean;
        selectedAddress: string;
        networkVersion: string;
        onboardingcomplete: boolean;
        chainId: string;
      }) => this.setLoggedInAccount(x.selectedAddress)
    );
  }

  @action async checkAlreadySignedIn() {
    if (this.ethereum) {
      if (this.ethereum.selectedAddress) {
        this.setLoggedInAccount(this.ethereum.selectedAddress);
        this.startListener();
      }
    }
  }

  @action async getBalance({ accountHolder, tokenContractAddress }: { accountHolder: EthAddress, tokenContractAddress: EthAddress }) {
      // @ts-ignore
      const tokenContract = new web3.eth.Contract(ABISmartToken, tokenContractAddress);
      return tokenContract.methods.balanceOf(accountHolder).call();
  }

  @action async tx(params: any) {
    console.log("TX on eth wallet hit with", params);
    console.log("will now be returning new promise");
    return tx(params);
  }

  @action async transfer({
    floatAmount,
    recipient
  }: {
    floatAmount: string;
    recipient: string;
  }) {
    if (!floatAmount) throw new Error("Float Amount required.");
    if (!web3.utils.isAddress(recipient))
      throw new Error("Recipient must be valid ETH address");
    const weiAmount = web3.utils.toWei(floatAmount);
    const value = web3.utils.toHex(weiAmount);
    const params = [
      {
        from: this.isAuthenticated,
        to: recipient,
        value
      }
    ];
    return this.tx(params);
  }
}

export const ethWallet = EthereumModule.ExtractVuexModule(EthereumModule);
