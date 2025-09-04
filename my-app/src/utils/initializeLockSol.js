import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL, Keypair } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();
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
async function initializeLockSol(amount, unlockTimestamp, description, beneficiaryAddress) {
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
    if (balance < amount * LAMPORTS_PER_SOL + 0.01 * LAMPORTS_PER_SOL) {
      throw new Error(`Số dư ví không đủ để khóa ${amount} SOL và trả phí giao dịch`);
    }    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    console.log("Program ID:", programId.toBase58());
    const program = new Program(idl, anchorProvider);
    const amountInLamports = new BN(amount * LAMPORTS_PER_SOL);
    const unlockTimestampBN = new BN(unlockTimestamp);
    const lockAccountPDA = getLockAccountPDA(wallet.publicKey, unlockTimestamp, programId);
    const beneficiary = new PublicKey(beneficiaryAddress);
    console.log("Beneficiary Public Key:", beneficiary.toBase58());
    const tx = await program.methods
      .initializeLockSol(amountInLamports, unlockTimestampBN, description)
      .accounts({
        payer: wallet.publicKey,
        lock_account: lockAccountPDA,
        beneficiary: beneficiary,
        system_program: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();

    console.log("Khởi tạo ví khóa thời gian thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Khởi tạo ví khóa thời gian thất bại:", err);
    throw err;
  }
}

(async () => {
  try {
    const tx = await initializeLockSol(
      1, 
      20000000, 
      "Ví khóa thời gian cho tiết kiệm", 
      "4TzcyfrwkN4grMdKFCrEcw4ApUnEL6pkUxJPQMhr2zSf" 
    );
    console.log("Giao dịch:", tx);
  } catch (err) {
    console.error("Lỗi khi chạy:", err);
  }
})();
export default initializeLockSol;