use anchor_lang::prelude::*;
use crate::{state::*, error::AppError, events::FundsLocked};
use crate::{
    constant::{VAULT_SEED, DEPOSIT_RECORD_SEED, BENEFICIARY_SEED, MAX_DESCRIPTION_LENGTH} 
};
#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64, description: String)]
pub struct InitializeLockSol<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = LOCK_ACCOUNT_SIZE,
        seeds = [VAULT_SEED, payer.key().as_ref(), unlock_timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub lock_account: Account<'info, LockAccount>,
    /// CHECK: Beneficiary pubkey provided as input
    pub beneficiary: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> InitializeLockSol<'info> {
    pub fn process(
        ctx: Context<Self>,
        amount: u64,
        unlock_timestamp: i64,
        description: String,
    ) -> Result<()> {
        require!(
            description.len() <= MAX_DESCRIPTION_LENGTH,
            AppError::InvalidReleaseTime
        );
        let clock = Clock::get()?;
        require!(
            unlock_timestamp > clock.unix_timestamp,
            AppError::InvalidReleaseTime
        );
        require!(amount > 0, AppError::InsufficientBalance);
        anchor_lang::system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.lock_account.to_account_info(),
                },
            ),
            amount,
        )?;
        let lock = &mut ctx.accounts.lock_account;
        lock.owner = ctx.accounts.payer.key();
        lock.beneficiary = ctx.accounts.beneficiary.key();
        lock.mint = None;
        lock.amount = amount;
        lock.unlock_timestamp = unlock_timestamp;
        lock.description = description.clone();
        lock.withdrawn = false;
        lock.bump = ctx.bumps.lock_account;
        emit!(FundsLocked {
            lock_account: lock.to_account_info().key(),
            owner: lock.owner,
            beneficiary: lock.beneficiary,
            mint: None,
            amount,
            unlock_timestamp,
            description,
        });
        msg!("VAULT_SEED: {:?}", VAULT_SEED);
        msg!("payer: {}", ctx.accounts.payer.key());
        msg!("unlock_timestamp: {}", unlock_timestamp);
        msg!("unlock_timestamp bytes: {:?}", unlock_timestamp.to_le_bytes());
        Ok(())
    }
}