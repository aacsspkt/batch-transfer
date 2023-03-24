use  anchor_lang::solana_program::{program::{invoke, invoke_signed}, system_instruction::transfer};
use anchor_lang::{prelude::*, solana_program::entrypoint::ProgramResult};
use anchor_spl::{
    associated_token::AssociatedToken, 
    token::{
        TokenAccount, 
        Mint, 
        Token, 
        Transfer as TokenTransfer, 
        transfer as token_transfer
    }, 
}; 

declare_id!("DwZruo6t3BW4DUtALe2i2E6ewA8b5mH1Lk2TWeyV8ymo");

#[program]
pub mod batch_transfer {

    use super::*;

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        let authority= ctx.accounts.authority.to_account_info();
        let ledger = ctx.accounts.ledger.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();

        let ix = transfer(
            &authority.key(),
            &ledger.key(),
            amount,
        );
        invoke(
            &ix,
            &[
                authority.to_account_info(),
                ledger.to_account_info(),
                system_program.to_account_info(),
            ],
        );
        
        Ok(())
    }

    pub fn sol_transfer(ctx: Context<SolTransfer>, amount: u64) -> Result<()> {
        let ledger = ctx.accounts.ledger.to_account_info();
        let system_program = ctx.accounts.system_program.to_account_info();
        let to = ctx.accounts.to.to_account_info();

        let ix = transfer(
            &ledger.key(),
            &to.key(),
            amount,
        );
        
        let authority_key = ctx.accounts.authority.key();
        let bump = ctx.bumps
            .get("ledger")
            .unwrap_or_else(|| panic!("Bump is missing."))
            .to_be_bytes();
        let signers_seeds: &[&[&[u8]]] = &[&[b"BatchTransactionLedger", authority_key.as_ref(), bump.as_ref()]];

        invoke_signed(
            &ix, 
            &[
                ledger.to_account_info(),
                to.to_account_info(),
                system_program.to_account_info()
            ], 
            signers_seeds
        );

        Ok(())
    }

    pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        let token_program = ctx.accounts.token_program.to_account_info();
        let from = ctx.accounts.from.to_account_info();
        let to = ctx.accounts.vault.to_account_info();
        let authority =ctx.accounts.authority.to_account_info();

        ctx.accounts.ledger.authority = ctx.accounts.authority.key();

        let accounts = TokenTransfer {
            from,
            to,
            authority 
        };

        let ctx = CpiContext::new(token_program, accounts);
        
        token_transfer(ctx, amount)
    }


    pub fn spl_transfer(ctx: Context<SplTransfer>, amount: u64) -> Result<()> {
        let token_program = ctx.accounts.token_program.to_account_info();
        let from = ctx.accounts.vault.to_account_info();
        let to = ctx.accounts.to.to_account_info();
        let ledger = ctx.accounts.ledger.to_account_info();
        
        let vault_amount = ctx.accounts.vault.amount;
        assert!(vault_amount > amount, "Vault amount is less than transfer amount");

        let accounts = TokenTransfer {
            from,
            to,
            authority: ledger 
        };

        let authority_key = ctx.accounts.authority.key();
        let bump = ctx.bumps
            .get("ledger")
            .unwrap_or_else(|| panic!("Bump is missing."))
            .to_be_bytes();
        let signer_seeds: &[&[&[u8]]] = &[&[b"Ledger", authority_key.as_ref(), bump.as_ref()]];

        let ctx = CpiContext::new_with_signer(
            token_program,
            accounts,
            signer_seeds
        );
        
        token_transfer(ctx, amount)
    }
}

fn create_transfer<'a>(
    from: AccountInfo<'a>,
    to: AccountInfo<'a>,
    system_program: AccountInfo<'a>,
    amount: u64,
) -> ProgramResult {
   
    anchor_lang::solana_program::program::
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"BatchTransactionLedger", authority.key().as_ref()],
        bump,
        space = 8 + 32
    )]
    pub ledger: Box<Account<'info, BatchTransactionLedger>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SolTransfer<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"Ledger", authority.key().as_ref()],
        bump,
    )]
    pub ledger: Box<Account<'info, BatchTransactionLedger>>,

    /// CHECK: receiver's account
    pub to: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = authority,
    )]
    pub from : Box<Account<'info, TokenAccount>>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"BatchTransactionLedger", authority.key().as_ref()],
        bump,
        space = 8 + 32
    )]
    pub ledger: Box<Account<'info, BatchTransactionLedger>>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = ledger,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    
    pub mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
    
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[account]
pub struct BatchTransactionLedger {
    authority: Pubkey,
}


#[derive(Accounts)]
pub struct SplTransfer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"Ledger", authority.key().as_ref()],
        bump,
    )]
    pub ledger: Box<Account<'info, BatchTransactionLedger>>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = ledger,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    
    /// CHECK: receiver's account
    pub to_owner: UncheckedAccount<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = to_owner,
    )]
    pub to: Box<Account<'info, TokenAccount>>,

    pub mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,

    pub associated_token_program: Program<'info, AssociatedToken>,
}