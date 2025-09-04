import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";
import * as dotenv from "dotenv";
import bs58 from "bs58";
import { TimeLockedWallet } from "../target/types/time_locked_wallet";
dotenv.config();
describe("time_locked_wallet - Initialize Lock SOL", () => {
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
  let lockAccount: PublicKey;
  let unlockTs: number;
  const description = "Test lock SOL";

  before(async () => {
    beneficiary = Keypair.generate();
  });

  it("Should initialize lock SOL successfully", async () => {
    unlockTs = Math.floor(Date.now() / 1000) + 10;
    const amount = new anchor.BN(0.01 * LAMPORTS_PER_SOL);

    const seedTs = Buffer.alloc(8);
    seedTs.writeBigInt64LE(BigInt(unlockTs));

    console.log("Seed[0] VAULT_SEED:", Buffer.from("vault").toString());
    console.log("Seed[1] Payer:", payer.publicKey.toBase58());
    console.log("Seed[2] Timestamp (LE8):", seedTs.toString("hex"));
    console.log("Program ID:", program.programId.toBase58());

    [lockAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        payer.publicKey.toBuffer(),
        seedTs,
      ],
      program.programId
    );
    console.log("📌 Expected PDA:", lockAccount.toBase58());
    const payerBalanceBefore = await provider.connection.getBalance(payer.publicKey);
    console.log("Payer balance before:", payerBalanceBefore / LAMPORTS_PER_SOL, "SOL");
    const tx = await program.methods
      .initializeLockSol(amount, new anchor.BN(unlockTs), description)
      .accounts({
        payer: payer.publicKey,
        lockAccount,
        beneficiary: beneficiary.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([payer.payer])
      .rpc();
    console.log("Tx hash:", tx);
    const acc = await program.account.lockAccount.fetch(lockAccount);
    assert.equal(acc.owner.toString(), payer.publicKey.toString(), "Owner should match payer");
    assert.equal(acc.beneficiary.toString(), beneficiary.publicKey.toString(), "Beneficiary should match");
    assert.equal(acc.amount.toString(), amount.toString(), "Amount should match");
    assert.equal(acc.unlockTimestamp.toString(), unlockTs.toString(), "Unlock timestamp should match");
    assert.equal(acc.description, description, "Description should match");
    assert.isFalse(acc.withdrawn, "Withdrawn should be false");
    assert.isNull(acc.mint, "Mint should be null for SOL");
    assert.isNumber(acc.bump, "Bump should be set");
    const lockBalance = await provider.connection.getBalance(lockAccount);
    assert.equal(lockBalance, amount.toNumber(), "Lock account should hold the correct amount of SOL");
  });
});