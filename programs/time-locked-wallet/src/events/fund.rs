use anchor_lang::prelude::*;

#[event]
pub struct FundsLocked {
    pub lock_account: Pubkey,
    pub owner: Pubkey,
    pub beneficiary: Pubkey,
    pub mint: Option<Pubkey>,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub description: String,
}

#[event]
pub struct FundsWithdrawn {
    pub lock_account: Pubkey,
    pub beneficiary: Pubkey,
    pub mint: Option<Pubkey>,
    pub amount: u64,
}