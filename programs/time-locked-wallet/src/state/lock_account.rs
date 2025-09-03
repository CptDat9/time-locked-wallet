use anchor_lang::prelude::*;
use crate::constant::MAX_DESCRIPTION_LENGTH;

#[account]
#[derive(Default)]
pub struct LockAccount {
    /// Người gửi
    pub owner: Pubkey,
    /// Người thụ hưởng
    pub beneficiary: Pubkey,
    /// Mint token nếu là SPL (None = SOL)
    pub mint: Option<Pubkey>,
    /// Số lượng token/SOL lock
    pub amount: u64,
    /// Thời gian unlock (timestamp)
    pub unlock_timestamp: i64,
    /// Metadata: lý do gửi tiền
    pub description: String,
    /// Đánh dấu đã rút chưa
    pub withdrawn: bool,
    /// Bump PDA
    pub bump: u8,
}

/// Tính toán dung lượng cần allocate cho account
pub const LOCK_ACCOUNT_SIZE: usize =
    8 +  // discriminator
    32 + // owner
    32 + // beneficiary
    (1 + 32) + // Option<Pubkey> mint
    8 +  // amount
    8 +  // unlock_timestamp
    (4 + MAX_DESCRIPTION_LENGTH) + // description
    1 +  // withdrawn
    1;   // bump