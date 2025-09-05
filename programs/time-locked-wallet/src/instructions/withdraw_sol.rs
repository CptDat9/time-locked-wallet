use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

use crate::{state::*, error::AppError, events::FundsWithdrawn};
use crate::constant::VAULT_SEED;

#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        seeds = [
            VAULT_SEED, 
            lock_account.beneficiary.as_ref(), 
            lock_account.unlock_timestamp.to_le_bytes().as_ref()
        ],
        bump = lock_account.bump,
        close = beneficiary
    )]
    pub lock_account: Account<'info, LockAccount>,

    /// CHECK: chỉ cần pubkey beneficiary
    #[account(mut)]
    pub beneficiary: AccountInfo<'info>,

    pub signer: Signer<'info>, // phải là beneficiary
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawSol<'info> {
    pub fn process(ctx: Context<Self>) -> Result<()> {
        let lock = &mut ctx.accounts.lock_account;

        // Chỉ beneficiary mới được phép rút
        require!(
            ctx.accounts.signer.key() == lock.beneficiary,
            AppError::Unauthorized
        );

        // Đảm bảo account beneficiary truyền vào đúng
        require!(
            ctx.accounts.beneficiary.key() == lock.beneficiary,
            AppError::Unauthorized
        );

        // lock này phải là SOL (mint = None)
        require!(lock.mint.is_none(), AppError::FundsLocked);

        // Kiểm tra thời gian
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= lock.unlock_timestamp,
            AppError::FundsLocked
        );

        // Kiểm tra trạng thái
        require!(!lock.withdrawn, AppError::AlreadyWithdrawn);
        require!(lock.amount > 0, AppError::NothingToWithdraw);

        // Mark withdrawn
        lock.withdrawn = true;

        // Emit event
        emit!(FundsWithdrawn {
            lock_account: lock.key(),
            beneficiary: lock.beneficiary,
            mint: None,
            amount: lock.amount,
        });

        Ok(())
    }
}
