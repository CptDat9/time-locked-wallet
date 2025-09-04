import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import BN from "bn.js";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import  { Buffer } from "buffer";

// Hàm lấy PDA cho lock_account
function getLockAccountPDA(owner, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"), // seed b"vault"
      owner.toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}

async function withdrawSpl(lockAccountOwner, unlockTimestamp, beneficiaryAddress, mintAddress) {
  try {
    // Kết nối tới Devnet
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");

    // Phantom provider
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom Wallet chưa được cài đặt.");
    }
    if (!provider.publicKey) {
      throw new Error("Bạn chưa connect Phantom Wallet.");
    }

    // Tạo AnchorProvider
    const wallet = {
      publicKey: provider.publicKey,
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };
    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });

    // Program
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);

    // PDA lock_account
    const lockAccountPDA = getLockAccountPDA(new PublicKey(lockAccountOwner), unlockTimestamp, programId);

    // Mint + beneficiary
    const mint = new PublicKey(mintAddress);
    const beneficiary = new PublicKey(beneficiaryAddress);

    // ATA
    const beneficiaryAta = getAssociatedTokenAddressSync(mint, beneficiary);
    const lockAta = getAssociatedTokenAddressSync(mint, lockAccountPDA, true);

    // Gọi hàm withdraw
    const tx = await program.methods
      .withdrawSpl()
      .accounts({
        lock_account: lockAccountPDA,
        beneficiary,
        signer: wallet.publicKey,
        beneficiary_ata: beneficiaryAta,
        lock_ata: lockAta,
        mint,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
      })
      .rpc();

    console.log("Rút SPL thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Rút SPL thất bại:", err);
    throw err;
  }
}

export default withdrawSpl;
