use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token::{self, Mint, Token, TokenAccount, Transfer},
};

use crate::{state::*, error::AppError, events::FundsWithdrawn};

#[derive(Accounts)]
pub struct WithdrawSpl<'info> {
    #[account(
        mut,
        seeds = [b"lock", lock_account.owner.as_ref(), lock_account.unlock_timestamp.to_le_bytes().as_ref()],
        bump = lock_account.bump,
        close = beneficiary
    )]
    pub lock_account: Account<'info, LockAccount>,
    #[account(mut)]
    /// CHECK: This account is validated manually to be the correct beneficiary.
    pub beneficiary: UncheckedAccount<'info>,
    pub signer: Signer<'info>,
    #[account(mut)]
    pub beneficiary_ata: UncheckedAccount<'info>,
    #[account(mut)]
    pub lock_ata: UncheckedAccount<'info>,
    pub mint: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> WithdrawSpl<'info> {
    pub fn process(ctx: Context<Self>) -> Result<()> {
        let lock_account_info = ctx.accounts.lock_account.to_account_info();
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
        // check lock is SPL
        require!(lock.mint.is_some(), AppError::FundsLocked);
        require!(ctx.accounts.mint.key() == lock.mint.unwrap(), AppError::Unauthorized);
        // check time
        let clock = Clock::get()?;
        require!(clock.unix_timestamp >= lock.unlock_timestamp, AppError::FundsLocked);

        // check status
        require!(!lock.withdrawn, AppError::AlreadyWithdrawn);
        require!(lock.amount > 0, AppError::NothingToWithdraw);
        // PDA signer seeds
        let seeds = &[
            b"lock".as_ref(),
            lock.owner.as_ref(),
            &lock.unlock_timestamp.to_le_bytes(),
            &[lock.bump],
        ];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.lock_ata.to_account_info(),
                    to: ctx.accounts.beneficiary_ata.to_account_info(),
                    authority: lock_account_info.clone(),
                },
                &[seeds],
            ),
            lock.amount,
        )?;
        lock.withdrawn = true;
        emit!(FundsWithdrawn {
            lock_account: lock.key(),
            beneficiary: lock.beneficiary,
            mint: lock.mint,
            amount: lock.amount,
        });

        Ok(())
    }
}
