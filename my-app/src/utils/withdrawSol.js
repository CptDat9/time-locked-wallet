// import { Connection, PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
// import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
// import { Buffer } from "buffer";
// import idl from "../idl/time_locked_wallet.json" with { type: "json" };
// import BN from "bn.js";
// import dotenv from "dotenv";
// import bs58 from "bs58";
// dotenv.config();
// function getLockAccountPDA(owner, unlockTimestamp, programId) {
//   const unlockTimestampBN = new BN(unlockTimestamp);
//   const [pda, bump] = PublicKey.findProgramAddressSync(
//     [
//       Buffer.from("vault"), 
//       owner.toBuffer(),
//       unlockTimestampBN.toArrayLike(Buffer, "le", 8),
//     ],
//     programId
//   );
//   console.log("PDA for lock_account:", pda.toBase58());
//   console.log("Bump:", bump);
//   console.log("Seeds used:");
//   console.log("  VAULT_SEED:", Buffer.from("vault").toString("hex"));
//   console.log("  Owner Public Key:", owner.toBase58());
//   console.log("  Unlock Timestamp Bytes:", unlockTimestampBN.toArrayLike(Buffer, "le", 8).toString("hex"));
//   return pda;
// }


// async function withdrawSol(lockAccountOwner, unlockTimestamp, beneficiaryAddress) {
//   try {    
//     const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
//     const connection = new Connection(rpcUrl, "confirmed");
//     const secretKeyString = process.env.PAYER_SECRET_KEY;
//     if (!secretKeyString) {
//       throw new Error("PAYER_SECRET_KEY không được tìm thấy trong file .env");
//     }
//     let secretKey;
//     try {
//       secretKey = bs58.decode(secretKeyString);
//     } catch (err) {
//       throw new Error("PAYER_SECRET_KEY không hợp lệ (định dạng base58 không đúng): " + err.message);
//     }
//     const keypair = Keypair.fromSecretKey(secretKey);
//     const wallet = new Wallet(keypair);
//     console.log("Signer Public Key:", wallet.publicKey.toBase58());
//     const balance = await connection.getBalance(wallet.publicKey);
//     console.log("Signer Balance:", balance / LAMPORTS_PER_SOL, "SOL");
//     if (balance < 0.01 * LAMPORTS_PER_SOL) {
//       throw new Error("Số dư ví không đủ để trả phí giao dịch");
//     }
//     const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
//     const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
//     console.log("Program ID:", programId.toBase58());
//     const program = new Program(idl, anchorProvider);
//     const unlockTimestampBN = new BN(unlockTimestamp);
//     const lockAccountPDA = getLockAccountPDA(new PublicKey(lockAccountOwner), unlockTimestamp, programId);
//     const beneficiary = new PublicKey(beneficiaryAddress);
//     console.log("Beneficiary Public Key:", beneficiary.toBase58());
//     const tx = await program.methods
//       .withdrawSol()
//       .accounts({
//         lock_account: lockAccountPDA,
//         beneficiary: beneficiary,
//         signer: wallet.publicKey,
//         system_program: SystemProgram.programId,
//       })
//       .signers([keypair])
//       .rpc();

//     console.log("Rút SOL thành công! Tx ID:", tx);
//     return tx;
//   } catch (err) {
//     console.error("Rút SOL thất bại:", err);
//     throw err;
//   }
// }
// (async () => {
//   try {
//     const tx = await withdrawSol(
//       "4TzcyfrwkN4grMdKFCrEcw4ApUnEL6pkUxJPQMhr2zSf", // lockAccountOwner (ví đã tạo lock ban đầu)
//       1725445500,              // unlockTimestamp (giống khi init lock)
//       "4TzcyfrwkN4grMdKFCrEcw4ApUnEL6pkUxJPQMhr2zSf" // beneficiary
//     );
//     console.log("Giao dịch rút:", tx);
//   } catch (err) {
//     console.error("Lỗi khi rút:", err);
//   }
// })();
// export default withdrawSol;
import { Connection, PublicKey, SystemProgram, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import dotenv from "dotenv";
import bs58 from "bs58";
dotenv.config();

function getLockAccountPDA(owner, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      new PublicKey(owner).toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}

async function withdrawSol(lockAccountOwner, unlockTimestamp, beneficiaryAddress) {
  try {
    const rpcUrl = process.env.RPC_URL || "https://api.devnet.solana.com";
    const connection = new Connection(rpcUrl, "confirmed");

    // Load signer từ .env
    const secretKeyString = process.env.PAYER_SECRET_KEY;
    if (!secretKeyString) throw new Error("PAYER_SECRET_KEY không được tìm thấy trong file .env");
    const secretKey = bs58.decode(secretKeyString);
    const keypair = Keypair.fromSecretKey(secretKey);
    const wallet = new Wallet(keypair);

    console.log("Signer Public Key:", wallet.publicKey.toBase58());
    const balance = await connection.getBalance(wallet.publicKey);
    console.log("Signer Balance:", balance / LAMPORTS_PER_SOL, "SOL");

    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);

    // Tính lại PDA cho lockAccount
    const lockAccountPDA = getLockAccountPDA(lockAccountOwner, unlockTimestamp, programId);

    // Fetch lockAccount để confirm tồn tại
    const lockAccount = await program.account.lockAccount.fetch(lockAccountPDA);
    console.log("LockAccount fetched:", {
      owner: lockAccount.owner.toBase58(),
      beneficiary: lockAccount.beneficiary.toBase58(),
      unlockTimestamp: lockAccount.unlockTimestamp.toString(),
      balance: lockAccount.balance ? lockAccount.balance.toString() : "N/A"
    });

    const beneficiary = new PublicKey(beneficiaryAddress);

    // Gọi withdraw
    const tx = await program.methods
      .withdrawSol()
      .accounts({
        lockAccount: lockAccountPDA,   // camelCase theo IDL binding
        beneficiary: beneficiary,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([keypair])
      .rpc();

    console.log("Rút SOL thành công! Tx ID:", tx);
    return tx;

  } catch (err) {
    console.error("Rút SOL thất bại:", err);
    throw err;
  }
}

// Test chạy
(async () => {
  try {
    const tx = await withdrawSol(
      "4TzcyfrwkN4grMdKFCrEcw4ApUnEL6pkUxJPQMhr2zSf", // owner
      1725445500,                                     // unlockTimestamp (giống init lock)
      "4TzcyfrwkN4grMdKFCrEcw4ApUnEL6pkUxJPQMhr2zSf"  // beneficiary
    );
    console.log("Giao dịch rút:", tx);
  } catch (err) {
    console.error("Lỗi khi rút:", err);
  }
})();
