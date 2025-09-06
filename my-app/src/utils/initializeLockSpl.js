import { Connection, PublicKey, SystemProgram, Transaction} from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
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

async function initializeLockSpl(
  amount,
  unlockTimestamp,
  description,
  beneficiaryAddress,
  mintAddress
) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const provider = window.solana;
  if (!provider || !provider.isPhantom) {
    throw new Error("Cần cài đặt Phantom Wallet.");
  }
  await provider.connect();

  const anchorProvider = new AnchorProvider(connection, provider, {
    commitment: "confirmed",
  });

  const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
  const program = new Program(idl, anchorProvider);

  const amountBN = new BN(amount);
  const unlockTimestampBN = new BN(unlockTimestamp);

  const wallet = anchorProvider.wallet.publicKey;
  const lockAccountPDA = getLockAccountPDA(wallet, unlockTimestamp, programId);

  const mint = new PublicKey(mintAddress);
  const beneficiary = new PublicKey(beneficiaryAddress);

  // --- Tính toán ATA ---
  const payerAta = getAssociatedTokenAddressSync(
    mint,
    wallet,
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
  const payerAtaInfo = await connection.getAccountInfo(payerAta);
  if (!payerAtaInfo) {
    ix.push(
      createAssociatedTokenAccountInstruction(
        wallet,       // payer chịu phí
        payerAta,     // ata
        wallet,       // owner
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  const lockAtaInfo = await connection.getAccountInfo(lockAta);
  if (!lockAtaInfo) {
    ix.push(
      createAssociatedTokenAccountInstruction(
        wallet,         // payer chịu phí
        lockAta,        // ata
        lockAccountPDA, // owner = PDA
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );
  }

  // Nếu cần tạo ATA → gửi tx tạo trước
  if (ix.length > 0) {
    const txAta = new Transaction().add(...ix);
    await anchorProvider.sendAndConfirm(txAta);
  }

  // --- Gọi RPC ---
  const tx = await program.methods
  .initializeLockSpl(amountBN, unlockTimestampBN, description)
  .accounts({
    payer: wallet,
    lockAccount: lockAccountPDA,
    beneficiary,
    payerAta,
    lockAta,
    mint,
    tokenProgram: TOKEN_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .preInstructions(ix)
  .rpc();

  return tx;
}
export default initializeLockSpl;
