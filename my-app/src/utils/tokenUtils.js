import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

/**
 * Lấy số dư SPL token của một beneficiary cho một mint nhất định
 * @param {string} beneficiaryAddress - địa chỉ ví beneficiary
 * @param {string} mintAddress - địa chỉ token mint
 * @returns {Promise<number>} số dư token (dạng số thập phân)
 */
export async function getTokenAccountBalance(beneficiaryAddress, mintAddress) {
  try {
    const beneficiary = new PublicKey(beneficiaryAddress);
    const mint = new PublicKey(mintAddress);
    const ata = await getAssociatedTokenAddress(mint, beneficiary);
    const balance = await connection.getTokenAccountBalance(ata);
    return balance.value.uiAmount ?? 0;
  } catch (err) {
    console.error("Lỗi khi lấy token balance:", err);
    return 0;
  }
}
