use anchor_lang::prelude::*;
pub mod instructions;
pub mod state;
pub mod events;
pub use events::*;
pub use state::*;
pub use instructions::*;
mod constant;
mod error;
declare_id!("DJoq887gWARUoPt8fuQikwDYe1f8jTbJ3PmWrxZ9fj2Y");

#[program]
pub mod time_locked_wallet {
    use super::*;

    pub fn initialize_lock_spl(
        ctx: Context<InitializeLockSpl>,
        amount: u64,
        unlock_timestamp: i64,
        description: String,
    ) -> Result<()> {
        InitializeLockSpl::process(ctx, amount, unlock_timestamp, description)
    }

    pub fn initialize_lock_sol(
        ctx: Context<InitializeLockSol>,
        amount: u64,
        unlock_timestamp: i64,
        description: String,
    ) -> Result<()> {
        InitializeLockSol::process(ctx, amount, unlock_timestamp, description)
    }

    pub fn withdraw_spl(ctx: Context<WithdrawSpl>) -> Result<()> {
        WithdrawSpl::process(ctx)
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>) -> Result<()> {
        WithdrawSol::process(ctx)
    }
}
