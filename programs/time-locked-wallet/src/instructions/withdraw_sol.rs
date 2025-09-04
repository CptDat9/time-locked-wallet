use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

use crate::{state::*, error::AppError, events::FundsWithdrawn};
use crate::{
    constant::{VAULT_SEED, DEPOSIT_RECORD_SEED, BENEFICIARY_SEED, MAX_DESCRIPTION_LENGTH} 
};
#[derive(Accounts)]
pub struct WithdrawSol<'info> {
    #[account(
        mut,
        seeds = [VAULT_SEED, lock_account.owner.as_ref(), lock_account.unlock_timestamp.to_le_bytes().as_ref()],
        bump = lock_account.bump,
        close = beneficiary
    )]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut)]
    /// CHECK: Validated manually
    pub beneficiary: AccountInfo<'info>,
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawSol<'info> {
    pub fn process(ctx: Context<Self>) -> Result<()> {
        let lock = &mut ctx.accounts.lock_account;

        // check auth
        require!(
            ctx.accounts.signer.key() == lock.owner || ctx.accounts.signer.key() == lock.beneficiary,
            AppError::Unauthorized
        );
        require!(
            ctx.accounts.beneficiary.key() == lock.beneficiary,
            AppError::Unauthorized
        );

        // check lock is SOL (mint must be None)
        require!(lock.mint.is_none(), AppError::FundsLocked);

        // check time
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= lock.unlock_timestamp, AppError::FundsLocked);

        // check status
        require!(!lock.withdrawn, AppError::AlreadyWithdrawn);
        require!(lock.amount > 0, AppError::NothingToWithdraw);

        // mark withdrawn
        lock.withdrawn = true;

        emit!(FundsWithdrawn {
            lock_account: lock.key(),
            beneficiary: lock.beneficiary,
            mint: None,
            amount: lock.amount,
        });

        Ok(())
    }
}
