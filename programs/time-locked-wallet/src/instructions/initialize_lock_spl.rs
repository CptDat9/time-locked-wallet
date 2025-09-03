use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{state::*, error::AppError, constant::MAX_DESCRIPTION_LENGTH, events::FundsLocked};

#[derive(Accounts)]
#[instruction(unlock_timestamp: i64)]
pub struct InitializeLockSpl<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = LOCK_ACCOUNT_SIZE,
        seeds = [b"lock", payer.key().as_ref(), unlock_timestamp.to_le_bytes().as_ref()],
        bump
    )]
    pub lock_account: Account<'info, LockAccount>,
    /// CHECK: Beneficiary pubkey provided as input
    pub beneficiary: UncheckedAccount<'info>,
    /// CHECK: payer ATA (sẽ validate runtime)
    #[account(mut)]
    pub payer_ata: UncheckedAccount<'info>,

    /// CHECK: lock ATA (sẽ validate runtime)
    #[account(mut)]
    pub lock_ata: UncheckedAccount<'info>,

    /// CHECK: mint token (validate runtime)
    pub mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}


impl<'info> InitializeLockSpl<'info> {
    pub fn process(
        ctx: Context<Self>,
        amount: u64,
        unlock_timestamp: i64,
        description: String,
    ) -> Result<()> {
        require!(description.len() <= MAX_DESCRIPTION_LENGTH, AppError::InvalidDescription);

        let clock = Clock::get()?;
        require!(unlock_timestamp > clock.unix_timestamp, AppError::InvalidReleaseTime);
        require!(amount > 0, AppError::InsufficientBalance);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_ata.to_account_info(),
                    to: ctx.accounts.lock_ata.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        let lock = &mut ctx.accounts.lock_account;
        lock.owner = ctx.accounts.payer.key();
        lock.beneficiary = ctx.accounts.beneficiary.key();
        lock.mint = Some(ctx.accounts.mint.key());
        lock.amount = amount;
        lock.unlock_timestamp = unlock_timestamp;
        lock.description = description.clone();
        lock.withdrawn = false;
        lock.bump = ctx.bumps.lock_account;

        emit!(FundsLocked {
            lock_account: lock.key(),
            owner: lock.owner,
            beneficiary: lock.beneficiary,
            mint: lock.mint,
            amount,
            unlock_timestamp,
            description,
        });

        Ok(())
    }
}
