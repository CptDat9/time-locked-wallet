import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

async function getQuestionPda(programId, questionId) {
    const questionSeed = Buffer.from("question");
    const idBuffer = Buffer.alloc(8);
    idBuffer.writeBigInt64LE(BigInt(questionId));

    const [questionPda] = await PublicKey.findProgramAddress(
        [questionSeed, idBuffer],
        programId
    );
    return questionPda;
}

function deserializeQuestion(data) {
    try {
        let offset = 8; // Skip discriminator
        
        // Ensure we have minimum required data
        if (data.length < 100) {
            throw new Error("Account data too small to be a question");
        }
        
        // Read id (u64)
        const id = data.readBigUInt64LE(offset);
        offset += 8;
        
        // Read nft_address (32 bytes)
        const nftAddress = new PublicKey(data.slice(offset, offset + 32)).toString();
        offset += 32;
        
        // Read title
        const titleLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Validate title length
        if (titleLength > 1000 || offset + titleLength > data.length) {
            throw new Error("Invalid title length");
        }
        
        const title = data.slice(offset, offset + titleLength).toString('utf-8');
        offset += titleLength;
        
        // Read image_uri
        if (offset + 4 > data.length) {
            throw new Error("Invalid data structure for image URI");
        }
        
        const imageUriLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Validate image URI length
        if (imageUriLength > 1000 || offset + imageUriLength > data.length) {
            throw new Error("Invalid image URI length");
        }
        
        const imageUri = data.slice(offset, offset + imageUriLength).toString('utf-8');
        offset += imageUriLength;
        
        // Read choices
        if (offset + 4 > data.length) {
            throw new Error("Invalid data structure for choices");
        }
        
        const choicesLength = data.readUInt32LE(offset);
        offset += 4;
        
        // Validate choices length
        if (choicesLength > 20) {
            throw new Error("Too many choices");
        }
        
        const choices = [];
        for (let i = 0; i < choicesLength; i++) {
            if (offset + 4 > data.length) {
                throw new Error(`Invalid choice ${i} structure`);
            }
            
            const choiceDescLength = data.readUInt32LE(offset);
            offset += 4;
            
            if (choiceDescLength > 500 || offset + choiceDescLength + 1 > data.length) {
                throw new Error(`Invalid choice ${i} description length`);
            }
            
            const description = data.slice(offset, offset + choiceDescLength).toString('utf-8');
            offset += choiceDescLength;
            const totalVotes = data.readUInt8(offset);
            offset += 1;
            choices.push({ description, totalVotes });
        }
        
        // Read remaining fields
        if (offset + 25 > data.length) { // 1 + 8 + 8 + 8 = 25 bytes remaining
            throw new Error("Insufficient data for remaining fields");
        }
        
        // Read is_active (bool)
        const isActive = data.readUInt8(offset) === 1;
        offset += 1;
        
        // Read deadline (i64)
        const deadline = data.readBigInt64LE(offset);
        offset += 8;
        
        // Read reward_per_vote (u64)
        const rewardPerVote = data.readBigUInt64LE(offset);
        offset += 8;
        
        // Read total_votes (u64)
        const totalVotes = data.readBigUInt64LE(offset);
        
        return {
            id: Number(id),
            nftAddress,
            title,
            imageUri,
            choices,
            isActive,
            deadline: Number(deadline),
            rewardPerVote: Number(rewardPerVote),
            totalVotes: Number(totalVotes)
        };
    } catch (error) {
        throw new Error(`Deserialization failed: ${error.message}`);
    }
}

function deserializeIsActive(data){
    const isActive = data.readUInt8(100) === 1;

    return isActive;
}


async function getAllActiveQuestions() {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const programId = new PublicKey("5Whv2g9gDJZnj9nsh2DFgQS9KQek7PZT4CJZeGxB1RxY");

    try {
        // Get all accounts owned by the program
        const accounts = await connection.getProgramAccounts(programId);

        const activeQuestions = [];

        for (const account of accounts) {
            try {
                if (account.account.data.length < 100) continue;
                
                const questionData = deserializeQuestion(account.account.data);
                if (questionData.isActive) {
                    activeQuestions.push(questionData);
                }
            } catch (error) {
                continue;
            }
        }

        return activeQuestions;
    } catch (error) {
        console.error("Error fetching active questions:", error);
        throw error;
    }
}

export default getAllActiveQuestions ;