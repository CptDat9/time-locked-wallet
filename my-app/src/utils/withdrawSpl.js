import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import { Buffer } from "buffer";

function getLockAccountPDAForWithdraw(beneficiary, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      new PublicKey(beneficiary).toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}

async function withdrawSpl(unlockTimestamp, beneficiaryAddress, mintAddress) {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Cần cài đặt Phantom Wallet.");
    }
    await provider.connect();

    const wallet = {
      publicKey: provider.publicKey,
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };

    // signer phải chính là beneficiary
    if (wallet.publicKey.toBase58() !== beneficiaryAddress) {
      throw new Error("Ví hiện tại không phải beneficiary, không thể rút SPL");
    }

    const anchorProvider = new AnchorProvider(connection, wallet, {
      commitment: "confirmed",
    });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);

    // PDA lock_account
    const lockAccountPDA = getLockAccountPDAForWithdraw(
      beneficiaryAddress,
      unlockTimestamp,
      programId
    );

    // fetch để debug
    const lockAccount = await program.account.lockAccount.fetch(lockAccountPDA);
    console.log("LockAccount fetched:", {
      owner: lockAccount.owner.toBase58(),
      beneficiary: lockAccount.beneficiary.toBase58(),
      unlockTimestamp: lockAccount.unlockTimestamp.toString(),
      amount: lockAccount.amount.toString(),
      withdrawn: lockAccount.withdrawn,
    });

    const beneficiary = new PublicKey(beneficiaryAddress);
    const mint = new PublicKey(mintAddress);

    // --- Tính toán ATA ---
    const beneficiaryAta = getAssociatedTokenAddressSync(
      mint,
      beneficiary,
      false,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    const lockAta = getAssociatedTokenAddressSync(
      mint,
      lockAccountPDA,
      true,
      TOKEN_PROGRAM_ID,
      ASSOCIATED_TOKEN_PROGRAM_ID
    );

    // --- Check + tạo ATA nếu chưa tồn tại ---
    const ix = [];
    const beneficiaryAtaInfo = await connection.getAccountInfo(beneficiaryAta);
    if (!beneficiaryAtaInfo) {
      ix.push(
        createAssociatedTokenAccountInstruction(
          wallet.publicKey, // payer chịu phí
          beneficiaryAta,
          beneficiary,
          mint,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // lockAta phải tồn tại từ initializeLockSpl, nhưng check luôn
    const lockAtaInfo = await connection.getAccountInfo(lockAta);
    if (!lockAtaInfo) {
      throw new Error("Lock ATA chưa tồn tại. Có thể chưa initializeLockSpl đúng.");
    }

    // --- Gọi RPC ---
    const tx = await program.methods
      .withdrawSpl()
      .accounts({
        lockAccount: lockAccountPDA,
        beneficiary,
        signer: wallet.publicKey,
        beneficiaryAta,
        lockAta,
        mint,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .preInstructions(ix) // tạo beneficiary ATA nếu cần
      .rpc();

    console.log("Rút SPL thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Rút SPL thất bại:", err);
    throw err;
  }
}

export default withdrawSpl;
