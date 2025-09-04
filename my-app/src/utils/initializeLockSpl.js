import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { Buffer } from "buffer";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import dotenv from "dotenv";
import bs58 from "bs58";

// Load biến môi trường từ file .env
dotenv.config();

// Hàm để lấy địa chỉ PDA của lock_account
function getLockAccountPDA(payer, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"), // VAULT_SEED = b"vault"
      payer.toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  console.log("PDA for lock_account:", pda.toBase58());
  console.log("Bump:", bump);
  console.log("Seeds used:");
  console.log("  VAULT_SEED:", Buffer.from("vault").toString("hex"));
  console.log("  Payer Public Key:", payer.toBase58());
  console.log("  Unlock Timestamp Bytes:", unlockTimestampBN.toArrayLike(Buffer, "le", 8).toString("hex"));
  return pda;
}

// Hàm để khởi tạo ví khóa thời gian cho token SPL
async function initializeLockSpl(amount, unlockTimestamp, description, beneficiaryAddress, mintAddress) {
  try {
    const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");
    const secretKeyString = process.env.PAYER_SECRET_KEY;
    if (!secretKeyString) {
      throw new Error("PAYER_SECRET_KEY không được tìm thấy trong file .env");
    }
    let secretKey;
    try {
      secretKey = bs58.decode(secretKeyString);
    } catch (err) {
      throw new Error("PAYER_SECRET_KEY không hợp lệ (định dạng base58 không đúng): " + err.message);
    }
    const keypair = Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);
    console.log("Payer Public Key:", wallet.publicKey.toBase58());
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("Payer Balance:", balance / LAMPORTS_PER_SOL, "SOL");
    if (balance < 0.01 * LAMPORTS_PER_SOL) {
      throw new Error("Số dư ví không đủ để trả phí giao dịch");
    }
    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    console.log("Program ID:", programId.toBase58());
    const program = new Program(idl, anchorProvider);
    const amountBN = new BN(amount);
    const unlockTimestampBN = new BN(unlockTimestamp);
    const lockAccountPDA = getLockAccountPDA(wallet.publicKey, unlockTimestamp, programId);
    const mint = new PublicKey(mintAddress);
    const beneficiary = new PublicKey(beneficiaryAddress);
    console.log("Mint Public Key:", mint.toBase58());
    console.log("Beneficiary Public Key:", beneficiary.toBase58());
    const payerAta = getAssociatedTokenAddressSync(mint, wallet.publicKey);
    const lockAta = getAssociatedTokenAddressSync(mint, lockAccountPDA, true);
    console.log("Payer ATA:", payerAta.toBase58());
    console.log("Lock ATA:", lockAta.toBase58());
    const tx = await program.methods
      .initializeLockSpl(amountBN, unlockTimestampBN, description)
      .accounts({
        payer: wallet.publicKey,
        lock_account: lockAccountPDA,
        beneficiary: beneficiary,
        payer_ata: payerAta,
        lock_ata: lockAta,
        mint: mint,
        token_program: TOKEN_PROGRAM_ID,
        associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
        system_program: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();

    console.log("Khởi tạo ví khóa thời gian SPL thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Khởi tạo ví khóa thời gian SPL thất bại:", err);
    throw err;
  }
}

export default initializeLockSpl;