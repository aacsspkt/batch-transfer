use  anchor_lang::{solana_program::{program::{invoke,}, system_instruction::transfer},};
use anchor_lang::prelude::*;
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

declare_id!("CFNXEYW8WPiSL5KFRBxSVtMrStE8WQjaekQ5vHjf14ph");

#[program]
pub mod batch_transfer {

    use super::*;

    pub fn deposit_sol(ctx: Context<DepositSol>, amount: u64) -> Result<()> {
        let authority= ctx.accounts.authority.to_account_info();
        let ledger = ctx.accounts.ledger.to_account_info();
        
        let ix = transfer(
            &authority.key(),
            &ledger.key(),
            amount,
        );
        
        _ = invoke(
            &ix, 
            &[
                authority, 
                ledger
            ]
        );

        Ok(())
    }

    pub fn sol_transfer(ctx: Context<SolTransfer>, amount: u64) -> Result<()> {
        let ledger = ctx.accounts.ledger.to_account_info();
        let to = ctx.accounts.to.to_account_info();

        let minimum_balance_for_rent_exemption = Rent::get()?.minimum_balance(ledger.data_len());
        msg!("minimum rent exemption {:?}", minimum_balance_for_rent_exemption);

        let transferable_amount = ledger.lamports().checked_sub(minimum_balance_for_rent_exemption)
            .unwrap_or_else(|| panic!("Error in deducting rent exemption"));

        require_gt!(transferable_amount, amount);
        
        **to.lamports.borrow_mut() = to.lamports().checked_add(amount)
            .unwrap_or_else(|| panic!("Error in adding transfer amount"));
        **ledger.lamports.borrow_mut() = ledger.lamports().checked_sub(amount)
            .unwrap_or_else(|| panic!("Error in substracting transfer amount"));

        Ok(())
    }

    pub fn deposit_token(ctx: Context<DepositToken>, amount: u64) -> Result<()> {
        let token_program = ctx.accounts.token_program.to_account_info();
        let from = ctx.accounts.from.to_account_info();
        let to = ctx.accounts.vault.to_account_info();
        let authority =ctx.accounts.authority.to_account_info();

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
        let signer_seeds: &[&[&[u8]]] = &[&[b"BatchTransaction", authority_key.as_ref(), bump.as_ref()]];

        let ctx = CpiContext::new_with_signer(
            token_program,
            accounts,
            signer_seeds
        );
        
        token_transfer(ctx, amount)
    }
}

#[derive(Accounts)]
pub struct DepositSol<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init_if_needed,
        payer = authority,
        seeds = [b"BatchTransaction", authority.key().as_ref()],
        bump,
        space = 0
    )]
    /// CHECK::
    pub ledger: AccountInfo<'info>,

    pub rent: Sysvar<'info, Rent>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SolTransfer<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"BatchTransaction", authority.key().as_ref()],
        bump,
    )]
    /// CHECK::
    pub ledger: AccountInfo<'info>,

    #[account(mut)]
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
        seeds = [b"BatchTransaction", authority.key().as_ref()],
        bump,
        space = 0
    )]
    /// CHECK::
    pub ledger: AccountInfo<'info>,
    
    #[account(
        init_if_needed,
        payer = authority,
        associated_token::mint = mint,
        associated_token::authority = ledger,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,
    
    pub mint: Box<Account<'info, Mint>>,

    pub rent: Sysvar<'info, Rent>,

    pub token_program: Program<'info, Token>,
    
    pub system_program: Program<'info, System>,
    
    pub associated_token_program: Program<'info, AssociatedToken>,
}


#[derive(Accounts)]
pub struct SplTransfer<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        seeds = [b"BatchTransaction", authority.key().as_ref()],
        bump,
    )]
    ///CHECK::
    pub ledger: AccountInfo<'info>,

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