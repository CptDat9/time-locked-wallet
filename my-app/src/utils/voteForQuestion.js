import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Buffer } from "buffer";
import idl from "../idl/news_quest.json" assert { type: "json" };
import BN from "bn.js";

function getQuestionPDA(questionId, programId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("question"), questionId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];
}

function getVoteRecordPDA(userPubkey, questionId, programId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote_record"), userPubkey.toBuffer(), questionId.toArrayLike(Buffer, "le", 8)],
    programId
  )[0];
}

async function voteForQuestion(questionIdRaw, choice) {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const provider = window.solana;
    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom Wallet chưa được cài đặt.");
    }
    const wallet = {
      publicKey: provider.publicKey,
      signTransaction: provider.signTransaction,
      signAllTransactions: provider.signAllTransactions,
    };
    const anchorProvider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    const programId = new PublicKey("5Whv2g9gDJZnj9nsh2DFgQS9KQek7PZT4CJZeGxB1RxY");
    const program = new Program(idl,anchorProvider);
    const questionId = new BN(questionIdRaw);
    const questionPDA = getQuestionPDA(questionId, programId);
    const voteRecordPDA = getVoteRecordPDA(wallet.publicKey, questionId, programId);
    const tx = await program.methods
      .vote(questionId, choice)
      .accounts({
        user: wallet.publicKey,
        question: questionPDA,
        voteRecord: voteRecordPDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([]) 
      .rpc();

    console.log("Vote thành công! Tx ID:", tx);
    return tx;
  } catch (err) {
    console.error("Vote thất bại:", err);
  }
}
// voteForQuestion(1, 1);

export default voteForQuestion;
