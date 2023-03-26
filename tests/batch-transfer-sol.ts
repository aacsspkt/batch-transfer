import { BN } from 'bn.js';
import dotnev from 'dotenv';

import * as anchor from '@coral-xyz/anchor';

import {
  BatchTransfer,
  IDL,
} from '../target/types/batch_transfer';

dotnev.config()

describe("batch-transfer", () => {
  const secret = process.env.SECRET_KEY || "";
  if (secret === "") {
    throw new Error("Missing SECRET_KEY in env");
  }
  const keypair = anchor.web3.Keypair.fromSecretKey(anchor.utils.bytes.bs58.decode(secret));
  const wallet = new anchor.Wallet(keypair);
  const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"));
  const provider = new anchor.AnchorProvider(connection, wallet, anchor.AnchorProvider.defaultOptions());
  // Configure the client to use the local cluster.

  const programId = new anchor.web3.PublicKey("CFNXEYW8WPiSL5KFRBxSVtMrStE8WQjaekQ5vHjf14ph");

  const program = new anchor.Program<BatchTransfer>(
    IDL, 
    programId, 
    provider
  );

  it("deposit sol!", async () => {
    console.log("token program", anchor.utils.token.ASSOCIATED_PROGRAM_ID.toString(), anchor.utils.token.TOKEN_PROGRAM_ID.toString());
    const systemProgram = anchor.web3.SystemProgram.programId;

    const authority = wallet.publicKey;
    console.log("authority", authority);
    const [ledger] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("BatchTransaction"), authority.toBuffer()], 
      program.programId
      );
    const amount = new BN("10").mul(new BN(anchor.web3.LAMPORTS_PER_SOL));
    
    const tx = await program.methods.depositSol(amount)
    .accounts({
      authority,
      ledger,
      systemProgram
    }).transaction();


    const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;

    // const signed = await wallet.signTransaction(tx);
    // const signature = await connection.sendRawTransaction(signed.serialize());
    // await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
    // console.log("Your transaction signature", signature);
  });


  it("sol transfer", async ()=> {
    const systemProgram = anchor.web3.SystemProgram.programId;

    const authority = wallet.publicKey;
    const [ledger] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("BatchTransaction"), authority.toBuffer()], 
      program.programId
      );
    console.log("ledger", ledger.toString())
    const to = new anchor.web3.PublicKey("8ctxLVXqJjttevpURSnrX5DDMuSgNDAyVjwHoSfccrTE");
    const amount = new BN("1000000")
    
    const ix = await program.methods
      .solTransfer(amount)
      .accounts({
        authority,
        ledger,
        systemProgram,
        to
      }).instruction();

      const tx = new anchor.web3.Transaction();
      
      let MAX_IX_COUNT = 42

      for (let i = 0; i < MAX_IX_COUNT; i++) {
        tx.add(ix);
      }

      const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
      tx.feePayer = wallet.publicKey;
      tx.recentBlockhash = blockhash;
      tx.lastValidBlockHeight = lastValidBlockHeight;
      
      const signed = await wallet.signTransaction(tx);
      console.log("ixn count", tx.instructions.length);

      try {
        const signature = await connection.sendRawTransaction(signed.serialize());
        await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});

        console.log("signature", signature);
      } catch (e) {
        if (e instanceof anchor.web3.SendTransactionError) {
          console.log(e.logs);
        }
        throw e;
      }
  })

});
