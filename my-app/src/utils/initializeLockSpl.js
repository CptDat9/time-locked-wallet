import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
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

  // AnchorProvider wrapper cho Phantom
  const anchorProvider = new AnchorProvider(connection, provider, {
    commitment: "confirmed",
  });

  const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
  const program = new Program(idl, programId, anchorProvider);

  const amountBN = new BN(amount);
  const unlockTimestampBN = new BN(unlockTimestamp);

  const wallet = anchorProvider.wallet.publicKey;
  const lockAccountPDA = getLockAccountPDA(wallet, unlockTimestamp, programId);

  const mint = new PublicKey(mintAddress);
  const beneficiary = new PublicKey(beneficiaryAddress);

  // Tính toán ATA
  const payerAta = getAssociatedTokenAddressSync(mint, wallet);
  const lockAta = getAssociatedTokenAddressSync(mint, lockAccountPDA, true);

  // Gọi RPC
  const tx = await program.methods
    .initializeLockSpl(amountBN, unlockTimestampBN, description)
    .accounts({
      payer: wallet,
      lock_account: lockAccountPDA,
      beneficiary,
      payer_ata: payerAta,
      lock_ata: lockAta,
      mint,
      token_program: TOKEN_PROGRAM_ID,
      associated_token_program: ASSOCIATED_TOKEN_PROGRAM_ID,
      system_program: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export default initializeLockSpl;
