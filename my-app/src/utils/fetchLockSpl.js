// src/utils/fetchLockSpl.js
import { Connection, PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import BN from "bn.js";

const PROGRAM_ID = new PublicKey("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");

// Hàm deserialize LockAccount (tái sử dụng cho SPL)
function deserializeLockAccount(data) {
  let offset = 8; // skip discriminator

  const owner = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  const beneficiary = new PublicKey(data.slice(offset, offset + 32));
  offset += 32;

  // Option<Pubkey> mint
  const hasMint = data.readUInt8(offset);
  offset += 1;
  let mint = null;
  if (hasMint === 1) {
    mint = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
  }

  const amount = new BN(data.slice(offset, offset + 8), "le").toNumber();
  offset += 8;

  const unlockTimestamp = new BN(data.slice(offset, offset + 8), "le").toNumber();
  offset += 8;

  const descLength = data.readUInt32LE(offset);
  offset += 4;
  const description = data.slice(offset, offset + descLength).toString("utf-8");
  offset += descLength;

  const withdrawn = data.readUInt8(offset) === 1;
  offset += 1;

  const bump = data.readUInt8(offset);

  return {
    owner: owner.toBase58(),
    beneficiary: beneficiary.toBase58(),
    mint: mint ? mint.toBase58() : null,
    amount, // giữ nguyên số SPL (đơn vị nhỏ nhất)
    unlockTimestamp,
    description,
    withdrawn,
    bump,
  };
}

async function fetchLockSpl(beneficiaryAddress) {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");
  const beneficiary = new PublicKey(beneficiaryAddress);

  // Lấy toàn bộ account do program quản lý
  const accounts = await connection.getProgramAccounts(PROGRAM_ID);

  const result = [];
  const now = Math.floor(Date.now() / 1000);

  for (const account of accounts) {
    try {
      const data = account.account.data;
      if (data.length < 100) continue;

      const lock = deserializeLockAccount(data);

      if (lock.beneficiary === beneficiary.toBase58() && lock.mint !== null) {
        const countdown = Math.max(0, lock.unlockTimestamp - now);
        result.push({
          ...lock,
          countdown,
          lockAccount: account.pubkey.toBase58(),
        });
      }
    } catch (e) {
      console.warn("Deserialize error:", e);
      continue;
    }
  }

  return result;
}

export default fetchLockSpl;
