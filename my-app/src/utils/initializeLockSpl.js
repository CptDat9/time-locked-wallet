import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import  { Buffer } from "buffer";

function getLockAccountPDA(payer, unlockTimestamp, programId) {
  const unlockTimestampBN = new BN(unlockTimestamp);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("vault"),
      payer.toBuffer(),
      unlockTimestampBN.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
  return pda;
}
async function initializeLockSpl(amount, unlockTimestamp, description, beneficiaryAddress, mintAddress) {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Cần cài đặt Phantom Wallet.");
    }
    const resp = await provider.connect();
    const wallet = {
      publicKey: resp.publicKey,
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };

    console.log("User Public Key:", wallet.publicKey.toBase58());

    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);

    const amountBN = new BN(amount);
    const unlockTimestampBN = new BN(unlockTimestamp);
    const lockAccountPDA = getLockAccountPDA(wallet.publicKey, unlockTimestamp, programId);

    const mint = new PublicKey(mintAddress);
    const beneficiary = new PublicKey(beneficiaryAddress);

    const payerAta = getAssociatedTokenAddressSync(mint, wallet.publicKey);
    const lockAta = getAssociatedTokenAddressSync(mint, lockAccountPDA, true);

    console.log("Lock Account PDA:", lockAccountPDA.toBase58());
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
      .rpc();

    console.log("Khởi tạo ví khóa SPL thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Khởi tạo ví khóa SPL thất bại:", err);
    throw err;
  }
}

export default initializeLockSpl;
