import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
// create PDA
async function getQuestionPda(programId, questionId) {
  const questionSeed = Buffer.from("question");
  const idBuffer = Buffer.alloc(8);
  idBuffer.writeBigUInt64LE(BigInt(questionId));

  const [questionPda] = await PublicKey.findProgramAddress(
    [questionSeed, idBuffer],
    programId
  );
  return questionPda;
}

function deserializeQuestion(data) {
  let offset = 8; // skip discriminator (8 bytes)

  const id = data.readBigUInt64LE(offset);
  offset += 8;

  const nftAddress = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const titleLength = data.readUInt32LE(offset);
  offset += 4;
  const title = data.slice(offset, offset + titleLength).toString();
  offset += titleLength;

  const imageUriLength = data.readUInt32LE(offset);
  offset += 4;
  const imageUri = data.slice(offset, offset + imageUriLength).toString();
  offset += imageUriLength;

  const choicesLength = data.readUInt32LE(offset);
  offset += 4;
  const choices = [];
  for (let i = 0; i < choicesLength; i++) {
    const descriptionLength = data.readUInt32LE(offset);
    offset += 4;
    const description = data.slice(offset, offset + descriptionLength).toString();
    offset += descriptionLength;
    const totalVotes = data.readUInt8(offset);
    offset += 1;
    choices.push({ description, totalVotes });
  }

  const isActive = data.readUInt8(offset) === 1;
  offset += 1;

  const deadline = data.readBigInt64LE(offset);
  offset += 8;

  const rewardPerVote = data.readBigUInt64LE(offset);
  offset += 8;


  return {
    id: Number(id),
    nftAddress: nftAddress.toString(),
    title,
    imageUri,
    choices,
    isActive,
    deadline: Number(deadline),
    rewardPerVote: Number(rewardPerVote),
  };
}

async function viewQuestionVoter(questionId) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("6LWu2MDNZyBkkJ2gr6KL2hPqkRmDUac6VNNuw4TCdKEX");

  const questionPda = await getQuestionPda(programId, questionId);
  const accountInfo = await connection.getAccountInfo(questionPda);

  if (!accountInfo) {
    throw new Error("Not found this ID.");
  }

  const questionData = deserializeQuestion(accountInfo.data);
  return questionData;
}

export default viewQuestionVoter;