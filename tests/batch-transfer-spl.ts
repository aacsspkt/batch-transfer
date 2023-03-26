import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BatchTransfer } from "../target/types/batch_transfer";
import {
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccount,
} from "@solana/spl-token";

describe("batch-transfer-3", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.BatchTransfer as Program<BatchTransfer>;
  const connection = anchor.getProvider().connection;
  const mint = new anchor.web3.PublicKey(
    "9xLaH2mj5mX1apnPdWfaU24x5sR9QF1wPU6gbZBAgorf"
  );

  const owner_buffer = [
    199, 70, 8, 99, 248, 66, 30, 8, 75, 69, 185, 133, 180, 74, 109, 145, 120,
    169, 57, 112, 248, 44, 107, 35, 88, 237, 151, 106, 224, 78, 206, 131, 119,
    249, 244, 237, 207, 161, 59, 99, 84, 105, 11, 179, 7, 76, 68, 230, 58, 65,
    232, 121, 248, 108, 113, 162, 88, 226, 92, 40, 215, 99, 140, 220,
  ];

  const owner = anchor.web3.Keypair.fromSecretKey(Buffer.from(owner_buffer));
  const owner_ata = getAssociatedTokenAddressSync(mint, owner.publicKey);
  console.log("owner_ata -> ", owner_ata.toString());

  //interface
  interface Receivers {
    pubkey: anchor.web3.PublicKey;
    ata: anchor.web3.PublicKey;
    amount: number;
  }
  it("Bulk Transfer", async () => {
    const random_accounts: Receivers[] = [];

    // max 20 accounts
    for (let i = 0; i < 20; i++) {
      let account = anchor.web3.Keypair.generate();
      let ata = await createAssociatedTokenAccount(
        connection,
        owner,
        mint,
        account.publicKey
      );
      random_accounts.push({
        pubkey: account.publicKey,
        ata,
        amount: 1,
      });
    }

    for (const receiver of random_accounts) {
      anchor.getProvider().connection.requestAirdrop(receiver.pubkey, 1000);
    }

    const instructions: anchor.web3.TransactionInstruction[] = [];
    for (const receiver of random_accounts) {
      instructions.push(
        createTransferCheckedInstruction(
          owner_ata,
          mint,
          receiver.ata,
          owner.publicKey,
          receiver.amount,
          9
        )
      );
    }
    console.log("ix", instructions[0]);

    const tx = new anchor.web3.Transaction();
    tx.add(...instructions);
    // console.log("tx -> ", tx);

    try {
      const sig = await anchor.web3.sendAndConfirmTransaction(
        anchor.getProvider().connection,
        tx,
        [owner]
      );
      console.log("sig-token -> ", sig);
    } catch (e) {
      console.log("error -> ", e);
    }
  });
});
