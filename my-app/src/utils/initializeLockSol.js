// src/utils/initializeLockSol.js
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import { Buffer } from "buffer";
function getLockAccountPDA(payer, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      payer.toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}

async function initializeLockSol(amount, unlockTimestamp, description, beneficiaryAddress) {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom Wallet chưa được cài đặt.");
    }
    if (!provider.publicKey) {
      throw new Error("Bạn chưa connect Phantom Wallet.");
    }
    const wallet = {
      publicKey: provider.publicKey,
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };
    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);
    const amountInLamports = new BN(amount * LAMPORTS_PER_SOL);
    const unlockTimestampBN = new BN(unlockTimestamp);
    const lockAccountPDA = getLockAccountPDA(wallet.publicKey, unlockTimestamp, programId);
    const beneficiary = new PublicKey(beneficiaryAddress);
    const tx = await program.methods
      .initializeLockSol(amountInLamports, unlockTimestampBN, description)
      .accounts({
        payer: wallet.publicKey,
        lock_account: lockAccountPDA,
        beneficiary,
        system_program: SystemProgram.programId,
      })
      .rpc();

    console.log("Khởi tạo ví khóa thời gian thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Khởi tạo ví khóa thời gian thất bại:", err);
    throw err;
  }
}

export default initializeLockSol;
