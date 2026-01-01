use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, SetAuthority};
use pyth_sdk_solana::{load_price_feed_from_account_info, Price};

declare_id!("CNYSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

/// CNY Stablecoin Program for Solana
/// Implements SPL Token standard with admin controls, pause, and blacklist features
#[program]
pub mod cny_stablecoin {
    use super::*;

    /// Initialize the stablecoin mint and program state
    pub fn initialize(
        ctx: Context<Initialize>,
        decimals: u8,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = ctx.accounts.admin.key();
        state.mint = ctx.accounts.mint.key();
        state.price_oracle = ctx.accounts.price_oracle.key();
        state.is_paused = false;
        state.bump = *ctx.bumps.get("state").unwrap();
        
        msg!("CNY Stablecoin initialized with admin: {}", state.admin);
        Ok(())
    }

    /// Mint new tokens (admin only)
    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        let state = &ctx.accounts.state;
        
        require!(!state.is_paused, ErrorCode::ContractPaused);
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        
        // Check if recipient is not blacklisted
        let recipient_state = &ctx.accounts.recipient_state;
        require!(!recipient_state.is_blacklisted, ErrorCode::Blacklisted);

        let seeds = &[
            b"state".as_ref(),
            &[state.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        
        token::mint_to(cpi_ctx, amount)?;
        
        emit!(MintEvent {
            recipient: ctx.accounts.recipient.key(),
            amount,
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Burn tokens (admin only)
    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let state = &ctx.accounts.state;
        
        require!(!state.is_paused, ErrorCode::ContractPaused);
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );

        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.from_token_account.to_account_info(),
            authority: ctx.accounts.from.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, amount)?;
        
        emit!(BurnEvent {
            from: ctx.accounts.from.key(),
            amount,
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Pause contract (admin only)
    pub fn pause(ctx: Context<PauseUnpause>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        require!(!state.is_paused, ErrorCode::AlreadyPaused);
        
        state.is_paused = true;
        
        emit!(PausedEvent {
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Unpause contract (admin only)
    pub fn unpause(ctx: Context<PauseUnpause>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        require!(state.is_paused, ErrorCode::NotPaused);
        
        state.is_paused = false;
        
        emit!(UnpausedEvent {
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Blacklist an address (admin only)
    pub fn blacklist_address(ctx: Context<BlacklistAddress>) -> Result<()> {
        let state = &ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        
        let user_state = &mut ctx.accounts.user_state;
        require!(!user_state.is_blacklisted, ErrorCode::AlreadyBlacklisted);
        
        user_state.is_blacklisted = true;
        user_state.user = ctx.accounts.user.key();
        
        emit!(BlacklistedEvent {
            user: ctx.accounts.user.key(),
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Unblacklist an address (admin only)
    pub fn unblacklist_address(ctx: Context<UnblacklistAddress>) -> Result<()> {
        let state = &ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        
        let user_state = &mut ctx.accounts.user_state;
        require!(user_state.is_blacklisted, ErrorCode::NotBlacklisted);
        
        user_state.is_blacklisted = false;
        
        emit!(UnblacklistedEvent {
            user: ctx.accounts.user.key(),
            admin: ctx.accounts.admin.key(),
        });
        
        Ok(())
    }

    /// Update admin address (admin only)
    pub fn update_admin(ctx: Context<UpdateAdmin>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        
        let old_admin = state.admin;
        state.admin = ctx.accounts.new_admin.key();
        
        emit!(AdminUpdatedEvent {
            old_admin,
            new_admin: state.admin,
        });
        
        Ok(())
    }

    /// Update oracle address (admin only)
    pub fn update_oracle(ctx: Context<UpdateOracle>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        
        require!(
            ctx.accounts.admin.key() == state.admin,
            ErrorCode::Unauthorized
        );
        
        let old_oracle = state.price_oracle;
        state.price_oracle = ctx.accounts.new_oracle.key();
        
        emit!(OracleUpdatedEvent {
            old_oracle,
            new_oracle: state.price_oracle,
        });
        
        Ok(())
    }

    /// Get CNY/USD price from Pyth oracle
    pub fn get_cny_price(ctx: Context<GetPrice>) -> Result<()> {
        let price_account_info = &ctx.accounts.price_oracle;
        let price_feed = load_price_feed_from_account_info(price_account_info)?;
        let current_price = price_feed.get_current_price()
            .ok_or(ErrorCode::InvalidPriceData)?;
        
        // Check price is not too old (staleness check)
        let current_timestamp = Clock::get()?.unix_timestamp;
        let price_age = current_timestamp - current_price.publish_time;
        require!(price_age < 3600, ErrorCode::StalePriceData); // 1 hour
        
        emit!(PriceUpdatedEvent {
            price: current_price.price,
            confidence: current_price.conf,
            timestamp: current_price.publish_time,
        });
        
        Ok(())
    }
}

// Account Contexts

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + ProgramState::LEN,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    /// CHECK: Price oracle account from Pyth
    pub price_oracle: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    /// CHECK: Recipient address
    pub recipient: AccountInfo<'info>,
    
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + UserState::LEN,
        seeds = [b"user", recipient.key().as_ref()],
        bump
    )]
    pub recipient_state: Account<'info, UserState>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub from_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub from: Signer<'info>,
    
    pub admin: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct PauseUnpause<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct BlacklistAddress<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    #[account(
        init_if_needed,
        payer = admin,
        space = 8 + UserState::LEN,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    
    /// CHECK: User to blacklist
    pub user: AccountInfo<'info>,
    
    #[account(mut)]
    pub admin: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnblacklistAddress<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    #[account(
        mut,
        seeds = [b"user", user.key().as_ref()],
        bump
    )]
    pub user_state: Account<'info, UserState>,
    
    /// CHECK: User to unblacklist
    pub user: AccountInfo<'info>,
    
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAdmin<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    pub admin: Signer<'info>,
    
    /// CHECK: New admin address
    pub new_admin: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct UpdateOracle<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    pub admin: Signer<'info>,
    
    /// CHECK: New oracle address
    pub new_oracle: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GetPrice<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProgramState>,
    
    /// CHECK: Pyth price oracle account
    pub price_oracle: AccountInfo<'info>,
}

// State Accounts

#[account]
pub struct ProgramState {
    pub admin: Pubkey,
    pub mint: Pubkey,
    pub price_oracle: Pubkey,
    pub is_paused: bool,
    pub bump: u8,
}

impl ProgramState {
    pub const LEN: usize = 32 + 32 + 32 + 1 + 1;
}

#[account]
pub struct UserState {
    pub user: Pubkey,
    pub is_blacklisted: bool,
}

impl UserState {
    pub const LEN: usize = 32 + 1;
}

// Events

#[event]
pub struct MintEvent {
    pub recipient: Pubkey,
    pub amount: u64,
    pub admin: Pubkey,
}

#[event]
pub struct BurnEvent {
    pub from: Pubkey,
    pub amount: u64,
    pub admin: Pubkey,
}

#[event]
pub struct PausedEvent {
    pub admin: Pubkey,
}

#[event]
pub struct UnpausedEvent {
    pub admin: Pubkey,
}

#[event]
pub struct BlacklistedEvent {
    pub user: Pubkey,
    pub admin: Pubkey,
}

#[event]
pub struct UnblacklistedEvent {
    pub user: Pubkey,
    pub admin: Pubkey,
}

#[event]
pub struct AdminUpdatedEvent {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
}

#[event]
pub struct OracleUpdatedEvent {
    pub old_oracle: Pubkey,
    pub new_oracle: Pubkey,
}

#[event]
pub struct PriceUpdatedEvent {
    pub price: i64,
    pub confidence: u64,
    pub timestamp: i64,
}

// Error Codes

#[error_code]
pub enum ErrorCode {
    #[msg("Unauthorized: caller is not admin")]
    Unauthorized,
    #[msg("Contract is paused")]
    ContractPaused,
    #[msg("Contract is already paused")]
    AlreadyPaused,
    #[msg("Contract is not paused")]
    NotPaused,
    #[msg("Address is blacklisted")]
    Blacklisted,
    #[msg("Address is already blacklisted")]
    AlreadyBlacklisted,
    #[msg("Address is not blacklisted")]
    NotBlacklisted,
    #[msg("Invalid price data from oracle")]
    InvalidPriceData,
    #[msg("Price data is too old")]
    StalePriceData,
}
