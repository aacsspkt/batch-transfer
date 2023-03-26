import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { BatchTransfer } from "../target/types/batch_transfer";

describe("batch-transfer", async () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.BatchTransfer as Program<BatchTransfer>;
  const connection = anchor.getProvider().connection;

  const owner_buffer = [
    199, 70, 8, 99, 248, 66, 30, 8, 75, 69, 185, 133, 180, 74, 109, 145, 120,
    169, 57, 112, 248, 44, 107, 35, 88, 237, 151, 106, 224, 78, 206, 131, 119,
    249, 244, 237, 207, 161, 59, 99, 84, 105, 11, 179, 7, 76, 68, 230, 58, 65,
    232, 121, 248, 108, 113, 162, 88, 226, 92, 40, 215, 99, 140, 220,
  ];
  const mint = new anchor.web3.PublicKey(
    "9xLaH2mj5mX1apnPdWfaU24x5sR9QF1wPU6gbZBAgorf"
  );
  const owner = anchor.web3.Keypair.fromSecretKey(Buffer.from(owner_buffer));

  // it("Bulk Transfer", async () => {
  //   const owner_pda = anchor.web3.PublicKey.findProgramAddressSync(
  //     [Buffer.from("batch-test"), owner.publicKey.toBuffer()],
  //     program.programId
  //   );
  //   console.log("ownder-pda", owner_pda[0].toBase58());
  //   try {
  //     await program.methods
  //       .initializeSol()
  //       .accounts({
  //         fromAuthority: owner.publicKey,
  //         fromPda: owner_pda[0],
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //       })
  //       .signers([owner])
  //       .rpc();
  //   } catch (e) {
  //     console.log(e);
  //   }

  //   // generate 10 random accounts
  //   const random_accounts: anchor.web3.PublicKey[] = [];
  //   const amounts: anchor.BN[] = [];

  //   //max 20 accounts
  //   for (let i = 0; i < 20; i++) {
  //     random_accounts.push(anchor.web3.Keypair.generate().publicKey);
  //     amounts.push(new anchor.BN(100000000));
  //   }
  //   //Array of accout metas
  //   const accounts: anchor.web3.AccountMeta[] = [];
  //   for (const account of random_accounts) {
  //     accounts.push({
  //       pubkey: account,
  //       isSigner: false,
  //       isWritable: true,
  //     });
  //   }
  //   // request air drop for all accounts
  //   for (const account of random_accounts) {
  //     console.log("airdrop");
  //     anchor.getProvider().connection.requestAirdrop(account, 1000);
  //   }

  //   accounts.push({
  //     pubkey: owner_pda[0],
  //     isSigner: false,
  //     isWritable: true,
  //   });

  //   try {
  //     // call the program
  //     const sig = await program.methods
  //       .batchSolTransfer(amounts)
  //       .accounts({
  //         from: owner_pda[0],
  //         fromAuthority: owner.publicKey,
  //         systemProgram: anchor.web3.SystemProgram.programId,
  //         rent: anchor.web3.SYSVAR_RENT_PUBKEY,
  //       })
  //       .signers([])
  //       .remainingAccounts(accounts)
  //       .rpc();
  //     console.log(sig);
  //   } catch (e) {
  //     console.log(e);
  //   }
  // });

  it("Bulk Transfer", async () => {
    const owner_pda = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("batch-token"), owner.publicKey.toBuffer()],
      program.programId
    );
    console.log("owner-pda", owner_pda[0].toBase58());

    const owner_ata_pda = getAssociatedTokenAddressSync(
      mint,
      owner_pda[0],
      true
    );

    await program.methods
      .initialize()
      .accounts({
        fromAuthority: owner.publicKey,
        fromPda: owner_pda[0],
        fromPdaTokenAccount: owner_ata_pda,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        mint: mint,
      })
      .signers([owner])
      .rpc();

    // generate 10 random accounts
    const random_accounts_ata: anchor.web3.PublicKey[] = [];
    const amounts: anchor.BN[] = [];

    // max 19 accounts
    for (let i = 0; i < 19; i++) {
      let account = anchor.web3.Keypair.generate();
      let ata = await createAssociatedTokenAccount(
        connection,
        owner,
        mint,
        account.publicKey
      );
      random_accounts_ata.push(ata);
      amounts.push(new anchor.BN(100000000));
    }

    //Array of accout metas
    const accounts: anchor.web3.AccountMeta[] = [];
    for (const account of random_accounts_ata) {
      accounts.push({
        pubkey: account,
        isSigner: false,
        isWritable: true,
      });
    }

    accounts.push(
      {
        pubkey: owner_pda[0],
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: owner_ata_pda,
        isSigner: false,
        isWritable: true,
      },
      {
        pubkey: TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      }
    );

    try {
      // call the program
      const sig = await program.methods
        .batchTokenTransfer(amounts)
        .accounts({
          from: owner_ata_pda,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          fromAuthority: owner.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          fromPda: owner_pda[0],
          mint: mint,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([])
        .remainingAccounts(accounts)
        .rpc();
      console.log(sig);
    } catch (e) {
      console.log(e);
    }
  });
});
