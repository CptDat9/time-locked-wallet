import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, SystemProgram, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { assert } from "chai";
import * as dotenv from "dotenv";
import bs58 from "bs58";

import { TimeLockedWallet } from "../target/types/time_locked_wallet";

dotenv.config();

describe("time_locked_wallet", () => {
  const provider = new anchor.AnchorProvider(
    new anchor.web3.Connection(process.env.RPC_URL!, "confirmed"),
    new anchor.Wallet(
      anchor.web3.Keypair.fromSecretKey(bs58.decode(process.env.PAYER_SECRET_KEY!))
    ),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  const program = anchor.workspace.TimeLockedWallet as Program<TimeLockedWallet>;
  const payer = provider.wallet as anchor.Wallet;

  let beneficiary: Keypair;
  let lockAccountSol: PublicKey;
  let lockAccountSpl: PublicKey;

  let rewardMint: PublicKey;
  let payerAta: PublicKey;
  let lockAta: PublicKey;
  let beneficiaryAta: PublicKey;

  const description = "Test lock";

  before(async () => {
    beneficiary = Keypair.generate();

    // Create SPL mint for testing
    rewardMint = await createMint(
      provider.connection,
      payer.payer,
      payer.publicKey,
      null,
      9
    );

    // Payer ATA
    const payerToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      rewardMint,
      payer.publicKey
    );
    payerAta = payerToken.address;

    // Beneficiary ATA
    const beneToken = await getOrCreateAssociatedTokenAccount(
      provider.connection,
      payer.payer,
      rewardMint,
      beneficiary.publicKey
    );
    beneficiaryAta = beneToken.address;

    // Lock ATA (owned by lockAccount PDA)
    const [lockPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), payer.publicKey.toBuffer(), Buffer.from(new anchor.BN(Math.floor(Date.now() / 1000) + 3).toArrayLike(Buffer, "le", 8))],
      program.programId
    );
    lockAta = getAssociatedTokenAddressSync(rewardMint, lockPda, true);

    // Mint 100 tokens to payer's ATA
    await mintTo(
      provider.connection,
      payer.payer,
      rewardMint,
      payerAta,
      payer.payer,
      100_000_000 // 100 tokens (9 decimals)
    );
  });

  it("Initialize Lock SOL", async () => {
    const unlockTs = Math.floor(Date.now() / 1000) + 3;
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), payer.publicKey.toBuffer(), Buffer.from(new anchor.BN(unlockTs).toArrayLike(Buffer, "le", 8))],
      program.programId
    );
    lockAccountSol = pda;

    const tx = await program.methods
      .initializeLockSol(amount, new anchor.BN(unlockTs), description)
      .accounts({
        payer: payer.publicKey,
        lockAccount: lockAccountSol,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer.payer])
      .rpc();

    console.log("Init SOL lock tx:", tx);

    const acc = await program.account.lockAccount.fetch(lockAccountSol);
    assert.equal(acc.owner.toString(), payer.publicKey.toString());
    assert.equal(acc.beneficiary.toString(), beneficiary.publicKey.toString());
    assert.equal(acc.amount.toString(), amount.toString());
    assert.equal(acc.description, description);
    assert.isFalse(acc.withdrawn);
  });

  it("Withdraw SOL", async () => {
    console.log("Waiting 3s for unlock...");
    await new Promise((res) => setTimeout(res, 3000));

    const beforeBalance = await provider.connection.getBalance(beneficiary.publicKey);

    const tx = await program.methods
      .withdrawSol()
      .accounts({
        lockAccount: lockAccountSol,
        beneficiary: beneficiary.publicKey,
        signer: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([beneficiary])
      .rpc();

    console.log("Withdraw SOL tx:", tx);

    const afterBalance = await provider.connection.getBalance(beneficiary.publicKey);
    assert.isTrue(afterBalance > beforeBalance, "Beneficiary did not receive SOL");

    const acc = await program.account.lockAccount.fetchNullable(lockAccountSol);
    assert.isNull(acc, "LockAccount must be closed after withdrawal");
  });

  it("Initialize Lock SPL", async () => {
    const unlockTs = Math.floor(Date.now() / 1000) + 3;
    const amount = new anchor.BN(50_000_000); // 50 tokens

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), payer.publicKey.toBuffer(), Buffer.from(new anchor.BN(unlockTs).toArrayLike(Buffer, "le", 8))],
      program.programId
    );
    lockAccountSpl = pda;

    // Create lock ATA if it doesn't exist
    const lockAta = getAssociatedTokenAddressSync(rewardMint, lockAccountSpl, true);
    const lockAtaInfo = await provider.connection.getAccountInfo(lockAta);
    if (!lockAtaInfo) {
      await getOrCreateAssociatedTokenAccount(
        provider.connection,
        payer.payer,
        rewardMint,
        lockAccountSpl,
        true
      );
    }

    const tx = await program.methods
      .initializeLockSpl(amount, new anchor.BN(unlockTs), description)
      .accounts({
        payer: payer.publicKey,
        lockAccount: lockAccountSpl,
        beneficiary: beneficiary.publicKey,
        payerAta,
        lockAta,
        mint: rewardMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer.payer])
      .rpc();

    console.log("Init SPL lock tx:", tx);

    const acc = await program.account.lockAccount.fetch(lockAccountSpl);
    assert.equal(acc.owner.toString(), payer.publicKey.toString());
    assert.equal(acc.beneficiary.toString(), beneficiary.publicKey.toString());
    assert.equal(acc.amount.toString(), amount.toString());
    assert.isFalse(acc.withdrawn);
  });

  it("Withdraw SPL", async () => {
    console.log("Waiting 3s for unlock...");
    await new Promise((res) => setTimeout(res, 3000));

    const beforeBal = (await provider.connection.getTokenAccountBalance(beneficiaryAta)).value.uiAmount!;

    const tx = await program.methods
      .withdrawSpl()
      .accounts({
        lockAccount: lockAccountSpl,
        beneficiary: beneficiary.publicKey,
        signer: beneficiary.publicKey,
        beneficiaryAta,
        lockAta,
        mint: rewardMint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: anchor.utils.token.ASSOCIATED_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([beneficiary])
      .rpc();

    console.log("Withdraw SPL tx:", tx);

    const afterBal = (await provider.connection.getTokenAccountBalance(beneficiaryAta)).value.uiAmount!;
    assert.isTrue(afterBal > beforeBal, "Beneficiary did not receive tokens");

    const acc = await program.account.lockAccount.fetchNullable(lockAccountSpl);
    assert.isNull(acc, "LockAccount must be closed after withdrawal");
  });

  it("Fails to withdraw before unlock", async () => {
    const unlockTs = Math.floor(Date.now() / 1000) + 5;
    const amount = new anchor.BN(1_000_000);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), payer.publicKey.toBuffer(), Buffer.from(new anchor.BN(unlockTs).toArrayLike(Buffer, "le", 8))],
      program.programId
    );

    await program.methods
      .initializeLockSol(amount, new anchor.BN(unlockTs), description)
      .accounts({
        payer: payer.publicKey,
        lockAccount: pda,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer.payer])
      .rpc();

    try {
      await program.methods
        .withdrawSol()
        .accounts({
          lockAccount: pda,
          beneficiary: beneficiary.publicKey,
          signer: beneficiary.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([beneficiary])
        .rpc();
      assert.fail("Withdrawal succeeded before unlock");
    } catch (err: any) {
      assert.include(
        err.toString(),
        "LockNotYetUnlocked",
        "Expected error due to premature withdrawal"
      );
    }
  });

  it("Fails unauthorized withdraw", async () => {
    const unlockTs = Math.floor(Date.now() / 1000) + 3;
    const amount = new anchor.BN(1_000_000);

    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("lock"), payer.publicKey.toBuffer(), Buffer.from(new anchor.BN(unlockTs).toArrayLike(Buffer, "le", 8))],
      program.programId
    );

    await program.methods
      .initializeLockSol(amount, new anchor.BN(unlockTs), description)
      .accounts({
        payer: payer.publicKey,
        lockAccount: pda,
        beneficiary: beneficiary.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([payer.payer])
      .rpc();

    const attacker = Keypair.generate();

    try {
      await program.methods
        .withdrawSol()
        .accounts({
          lockAccount: pda,
          beneficiary: beneficiary.publicKey,
          signer: attacker.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([attacker])
        .rpc();
      assert.fail("Withdrawal succeeded by unauthorized signer");
    } catch (err: any) {
      assert.include(
        err.toString(),
        "Unauthorized",
        "Expected error due to unauthorized signer"
      );
    }
  });
});