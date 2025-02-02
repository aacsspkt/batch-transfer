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

  it("deposit token!", async () => {
    
    const associatedTokenProgram = anchor.utils.token.ASSOCIATED_PROGRAM_ID;
    const tokenProgram = anchor.utils.token.TOKEN_PROGRAM_ID;
    const systemProgram = anchor.web3.SystemProgram.programId;

    const authority = wallet.publicKey;
    const mint = new anchor.web3.PublicKey("AbLwGR8A1wvsiLWrzzA5eYPoQw51NVMcMMTPvAv5LTJ");
    const from = anchor.utils.token.associatedAddress({mint, owner: authority})
    const [ledger] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("BatchTransaction"), authority.toBuffer()], 
      program.programId
      );
    const vault = anchor.utils.token.associatedAddress({mint, owner: ledger});
    const amount = new BN("1000").mul(new BN(anchor.web3.LAMPORTS_PER_SOL));
    
    const tx = await program.methods.depositToken(amount)
    .accounts({
      associatedTokenProgram,
      authority,
      from,
      ledger,
      mint,
      systemProgram,
      tokenProgram,
      vault
    }).transaction();


    const {blockhash, lastValidBlockHeight} = await connection.getLatestBlockhash();
    tx.feePayer = wallet.publicKey;
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;

    const signed = await wallet.signTransaction(tx);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction({blockhash, lastValidBlockHeight, signature});
    console.log("Your transaction signature", signature);
  });


  it("spl transfer", async ()=> {
    const associatedTokenProgram = anchor.utils.token.ASSOCIATED_PROGRAM_ID;
    const tokenProgram = anchor.utils.token.TOKEN_PROGRAM_ID;
    const systemProgram = anchor.web3.SystemProgram.programId;

    const authority = wallet.publicKey;
    const mint = new anchor.web3.PublicKey("AbLwGR8A1wvsiLWrzzA5eYPoQw51NVMcMMTPvAv5LTJ");
    const [ledger] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("BatchTransaction"), authority.toBuffer()], 
      program.programId
      );
    const vault = anchor.utils.token.associatedAddress({mint, owner: ledger});
    
    const toOwner = new anchor.web3.PublicKey("8ctxLVXqJjttevpURSnrX5DDMuSgNDAyVjwHoSfccrTE");
    const to = anchor.utils.token.associatedAddress({mint, owner: toOwner})
    const amount = new BN("1").mul(new BN(anchor.web3.LAMPORTS_PER_SOL));
    
    const ix = await program.methods
      .splTransfer(amount)
      .accounts({
        associatedTokenProgram,
        authority,
        ledger,
        mint,
        systemProgram,
        to,
        tokenProgram,
        toOwner,
        vault
      }).instruction();

      const tx = new anchor.web3.Transaction();
      
      let MAX_IX_COUNT = 28
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
