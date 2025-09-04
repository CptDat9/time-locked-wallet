import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../idl/time_locked_wallet.json" with { type: "json" };
import BN from "bn.js";
import type { Buffer } from "buffer";

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

    console.log("Signer Public Key:", wallet.publicKey.toBase58());

    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");
    const program = new Program(idl, anchorProvider);
    const lockAccountPDA = getLockAccountPDA(lockAccountOwner, unlockTimestamp, programId);
    const lockAccount = await program.account.lockAccount.fetch(lockAccountPDA);
    console.log("LockAccount fetched:", {
      owner: lockAccount.owner.toBase58(),
      beneficiary: lockAccount.beneficiary.toBase58(),
      unlockTimestamp: lockAccount.unlockTimestamp.toString(),
    });

    const beneficiary = new PublicKey(beneficiaryAddress);
    const tx = await program.methods
      .withdrawSol()
      .accounts({
        lockAccount: lockAccountPDA,
        beneficiary: beneficiary,
        signer: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("Rút SOL thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Rút SOL thất bại:", err);
    throw err;
  }
}

export default withdrawSol;
