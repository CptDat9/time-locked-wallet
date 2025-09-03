use anchor_lang::prelude::*;

#[error_code]
pub enum AppError {
    #[msg("Unauthorized: Only the owner can perform this action.")]
    Unauthorized,

    #[msg("The release time must be in the future.")]
    InvalidReleaseTime,

    #[msg("No funds available for withdrawal yet.")]
    NothingToWithdraw,

    #[msg("Funds are still locked.")]
    FundsLocked,

    #[msg("Insufficient balance.")]
    InsufficientBalance,

    #[msg("Deposit record not found.")]
    DepositNotFound,

    #[msg("This deposit has already been withdrawn.")]
    AlreadyWithdrawn,

    #[msg("Invalid description.")]
    InvalidDescription,
}
