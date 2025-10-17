use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, Metadata,
    },
    token::{mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("GUudyUKazJCyL2f7dTG6Nm7EgUsro3acDtbbMWFuUrRd");

#[program]
pub mod basic {
    use super::*;

    pub fn create_deal(
        ctx: Context<CreateDeal>,
        title: String,
        description: String,
        discount_percent: u8,
        max_supply: u64,
        expiry_timestamp: i64,
        category: String,
        price_lamports: u64,
    ) -> Result<()> {
        require!(discount_percent <= 100, DealError::InvalidDiscount);
        require!(max_supply > 0, DealError::InvalidSupply);
        require!(expiry_timestamp > Clock::get()?.unix_timestamp, DealError::InvalidExpiry);

        let deal = &mut ctx.accounts.deal;
        deal.merchant = ctx.accounts.merchant.key();
        deal.title = title;
        deal.description = description;
        deal.discount_percent = discount_percent;
        deal.max_supply = max_supply;
        deal.current_supply = 0;
        deal.expiry_timestamp = expiry_timestamp;
        deal.category = category;
        deal.price_lamports = price_lamports;
        deal.is_active = true;
        deal.total_ratings = 0;
        deal.rating_sum = 0;
        deal.bump = ctx.bumps.deal;

        msg!("Deal created: {}", deal.title);
        Ok(())
    }

    pub fn update_deal(
        ctx: Context<UpdateDeal>,
        is_active: Option<bool>,
        price_lamports: Option<u64>,
    ) -> Result<()> {
        let deal = &mut ctx.accounts.deal;

        if let Some(active) = is_active {
            deal.is_active = active;
        }

        if let Some(price) = price_lamports {
            deal.price_lamports = price;
        }

        msg!("Deal updated: {}", deal.title);
        Ok(())
    }

    pub fn mint_coupon(ctx: Context<MintCoupon>, deal_id: Pubkey, metadata_uri: String) -> Result<()> {
        let deal = &mut ctx.accounts.deal;

        require!(deal.is_active, DealError::DealInactive);
        require!(deal.current_supply < deal.max_supply, DealError::MaxSupplyReached);
        require!(Clock::get()?.unix_timestamp < deal.expiry_timestamp, DealError::DealExpired);

        // Transfer payment from user to merchant
        if deal.price_lamports > 0 {
            let transfer_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.merchant.to_account_info(),
                },
            );
            transfer(transfer_ctx, deal.price_lamports)?;
        }

        // Mint NFT to user
        let cpi_context = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.mint.to_account_info(),
            },
        );

        mint_to(cpi_context, 1)?;

        // Create metadata with provided IPFS URI
        let data = DataV2 {
            name: format!("{} - Coupon #{}", deal.title, deal.current_supply + 1),
            symbol: "DEAL".to_string(),
            uri: metadata_uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        let cpi_context = CpiContext::new(
            ctx.accounts.token_metadata_program.to_account_info(),
            CreateMetadataAccountsV3 {
                metadata: ctx.accounts.metadata.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                mint_authority: ctx.accounts.mint.to_account_info(),
                update_authority: ctx.accounts.mint.to_account_info(),
                payer: ctx.accounts.user.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                rent: ctx.accounts.rent.to_account_info(),
            },
        );

        create_metadata_accounts_v3(cpi_context, data, true, true, None)?;

        // Initialize coupon account
        let coupon = &mut ctx.accounts.coupon;
        coupon.deal = deal.key();
        coupon.owner = ctx.accounts.user.key();
        coupon.mint = ctx.accounts.mint.key();
        coupon.is_redeemed = false;
        coupon.minted_at = Clock::get()?.unix_timestamp;
        coupon.bump = ctx.bumps.coupon;

        deal.current_supply += 1;

        msg!("Coupon minted for deal: {}", deal.title);
        Ok(())
    }

    pub fn redeem_coupon(ctx: Context<RedeemCoupon>) -> Result<()> {
        let coupon = &mut ctx.accounts.coupon;
        let deal = &ctx.accounts.deal;

        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(Clock::get()?.unix_timestamp < deal.expiry_timestamp, DealError::DealExpired);
        require!(ctx.accounts.merchant.key() == deal.merchant, DealError::UnauthorizedMerchant);

        coupon.is_redeemed = true;
        coupon.redeemed_at = Some(Clock::get()?.unix_timestamp);

        msg!("Coupon redeemed for deal: {}", deal.title);
        Ok(())
    }

    pub fn transfer_coupon(ctx: Context<TransferCoupon>) -> Result<()> {
        let coupon = &mut ctx.accounts.coupon;

        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(coupon.owner == ctx.accounts.current_owner.key(), DealError::NotOwner);

        coupon.owner = ctx.accounts.new_owner.key();

        msg!("Coupon transferred to new owner");
        Ok(())
    }

    pub fn rate_deal(ctx: Context<RateDeal>, rating: u8) -> Result<()> {
        require!(rating >= 1 && rating <= 5, DealError::InvalidRating);

        let deal = &mut ctx.accounts.deal;
        let deal_rating = &mut ctx.accounts.deal_rating;

        // If this is a new rating (account just initialized)
        deal.total_ratings += 1;
        deal.rating_sum += rating as u64;

        // Store the user's rating
        deal_rating.deal = deal.key();
        deal_rating.user = ctx.accounts.user.key();
        deal_rating.rating = rating;
        deal_rating.created_at = Clock::get()?.unix_timestamp;
        deal_rating.bump = ctx.bumps.deal_rating;

        msg!("Deal rated: {} stars", rating);
        Ok(())
    }

    pub fn add_comment(ctx: Context<AddComment>, timestamp: i64, content: String) -> Result<()> {
        require!(content.len() <= 500, DealError::CommentTooLong);

        let comment = &mut ctx.accounts.comment;
        comment.deal = ctx.accounts.deal.key();
        comment.author = ctx.accounts.author.key();
        comment.content = content;
        comment.created_at = timestamp;
        comment.bump = ctx.bumps.comment;

        msg!("Comment added to deal");
        Ok(())
    }

    pub fn list_coupon(ctx: Context<ListCoupon>, price_lamports: u64) -> Result<()> {
        require!(price_lamports > 0, DealError::InvalidPrice);

        let coupon = &ctx.accounts.coupon;
        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(coupon.owner == ctx.accounts.seller.key(), DealError::NotOwner);

        let listing = &mut ctx.accounts.listing;
        listing.coupon = ctx.accounts.coupon.key();
        listing.seller = ctx.accounts.seller.key();
        listing.price_lamports = price_lamports;
        listing.is_active = true;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.bump = ctx.bumps.listing;

        msg!("Coupon listed for sale at {} lamports", price_lamports);
        Ok(())
    }

    pub fn buy_coupon(ctx: Context<BuyCoupon>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        let coupon = &mut ctx.accounts.coupon;

        require!(listing.is_active, DealError::ListingInactive);
        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(coupon.owner == listing.seller, DealError::InvalidListing);

        // Calculate platform fee (2.5%)
        let platform_fee = (listing.price_lamports * 25) / 1000;
        let seller_amount = listing.price_lamports - platform_fee;

        // Transfer payment from buyer to seller
        let transfer_to_seller = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.seller.to_account_info(),
            },
        );
        transfer(transfer_to_seller, seller_amount)?;

        // Transfer platform fee to platform wallet
        let transfer_to_platform = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer.to_account_info(),
                to: ctx.accounts.platform_wallet.to_account_info(),
            },
        );
        transfer(transfer_to_platform, platform_fee)?;

        // Transfer ownership
        coupon.owner = ctx.accounts.buyer.key();

        // Deactivate listing
        listing.is_active = false;

        msg!("Coupon purchased for {} lamports", listing.price_lamports);
        Ok(())
    }

    pub fn delist_coupon(ctx: Context<DelistCoupon>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;

        require!(listing.is_active, DealError::ListingInactive);
        require!(listing.seller == ctx.accounts.seller.key(), DealError::NotOwner);

        listing.is_active = false;

        msg!("Coupon delisted from marketplace");
        Ok(())
    }

    pub fn initialize_rewards_pool(ctx: Context<InitializeRewardsPool>, reward_rate_per_day: u64) -> Result<()> {
        let pool = &mut ctx.accounts.rewards_pool;
        pool.total_staked = 0;
        pool.reward_rate_per_day = reward_rate_per_day;
        pool.admin = ctx.accounts.admin.key();
        pool.bump = ctx.bumps.rewards_pool;

        msg!("Rewards pool initialized with rate: {} lamports/day", reward_rate_per_day);
        Ok(())
    }

    pub fn stake_coupon(ctx: Context<StakeCouponCtx>) -> Result<()> {
        let coupon = &ctx.accounts.coupon;
        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(coupon.owner == ctx.accounts.staker.key(), DealError::NotOwner);

        let staked_coupon = &mut ctx.accounts.staked_coupon;
        let current_time = Clock::get()?.unix_timestamp;

        staked_coupon.coupon = ctx.accounts.coupon.key();
        staked_coupon.staker = ctx.accounts.staker.key();
        staked_coupon.staked_at = current_time;
        staked_coupon.last_claim_at = current_time;
        staked_coupon.bump = ctx.bumps.staked_coupon;

        let pool = &mut ctx.accounts.rewards_pool;
        pool.total_staked += 1;

        msg!("Coupon staked successfully");
        Ok(())
    }

    pub fn unstake_coupon(ctx: Context<UnstakeCouponCtx>) -> Result<()> {
        let staked_coupon = &ctx.accounts.staked_coupon;
        require!(staked_coupon.staker == ctx.accounts.staker.key(), DealError::NotOwner);

        // Calculate and transfer rewards
        let current_time = Clock::get()?.unix_timestamp;
        let time_staked = current_time - staked_coupon.last_claim_at;
        let rewards = calculate_rewards(time_staked, ctx.accounts.rewards_pool.reward_rate_per_day)?;

        if rewards > 0 {
            let transfer_ctx = CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.rewards_pool.to_account_info(),
                    to: ctx.accounts.staker.to_account_info(),
                },
            );
            transfer(transfer_ctx, rewards)?;
        }

        let pool = &mut ctx.accounts.rewards_pool;
        pool.total_staked -= 1;

        msg!("Coupon unstaked, rewards claimed: {} lamports", rewards);
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewardsCtx>) -> Result<()> {
        let staked_coupon = &mut ctx.accounts.staked_coupon;
        require!(staked_coupon.staker == ctx.accounts.staker.key(), DealError::NotOwner);

        let current_time = Clock::get()?.unix_timestamp;
        let time_since_claim = current_time - staked_coupon.last_claim_at;
        let rewards = calculate_rewards(time_since_claim, ctx.accounts.rewards_pool.reward_rate_per_day)?;

        require!(rewards > 0, DealError::NoRewardsToClaim);

        let transfer_ctx = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.rewards_pool.to_account_info(),
                to: ctx.accounts.staker.to_account_info(),
            },
        );
        transfer(transfer_ctx, rewards)?;

        staked_coupon.last_claim_at = current_time;

        msg!("Rewards claimed: {} lamports", rewards);
        Ok(())
    }
}

// Helper function to calculate rewards
fn calculate_rewards(time_seconds: i64, rate_per_day: u64) -> Result<u64> {
    const SECONDS_PER_DAY: i64 = 86400;

    if time_seconds <= 0 {
        return Ok(0);
    }

    let days_staked = time_seconds / SECONDS_PER_DAY;
    let rewards = (days_staked as u64) * rate_per_day;

    Ok(rewards)
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct CreateDeal<'info> {
    #[account(
        init,
        payer = merchant,
        space = 8 + Deal::INIT_SPACE,
        seeds = [b"deal", merchant.key().as_ref(), title.as_bytes()],
        bump
    )]
    pub deal: Account<'info, Deal>,

    #[account(mut)]
    pub merchant: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateDeal<'info> {
    #[account(
        mut,
        has_one = merchant
    )]
    pub deal: Account<'info, Deal>,

    pub merchant: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(deal_id: Pubkey)]
pub struct MintCoupon<'info> {
    #[account(mut)]
    pub deal: Account<'info, Deal>,

    #[account(
        init,
        payer = user,
        space = 8 + Coupon::INIT_SPACE,
        seeds = [b"coupon", deal.key().as_ref(), deal.current_supply.to_le_bytes().as_ref()],
        bump
    )]
    pub coupon: Account<'info, Coupon>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = mint,
        mint::freeze_authority = mint,
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = mint,
        associated_token::authority = user,
    )]
    pub token_account: Account<'info, TokenAccount>,

    /// CHECK: Metadata account
    #[account(mut)]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: Merchant account to receive payment
    #[account(
        mut,
        constraint = merchant.key() == deal.merchant @ DealError::UnauthorizedMerchant
    )]
    pub merchant: UncheckedAccount<'info>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_metadata_program: Program<'info, Metadata>,
}

#[derive(Accounts)]
pub struct RedeemCoupon<'info> {
    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    pub deal: Account<'info, Deal>,

    pub merchant: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferCoupon<'info> {
    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    pub current_owner: Signer<'info>,

    /// CHECK: New owner pubkey
    pub new_owner: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RateDeal<'info> {
    #[account(mut)]
    pub deal: Account<'info, Deal>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + DealRating::INIT_SPACE,
        seeds = [b"rating", deal.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub deal_rating: Account<'info, DealRating>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(timestamp: i64)]
pub struct AddComment<'info> {
    pub deal: Account<'info, Deal>,

    #[account(
        init,
        payer = author,
        space = 8 + Comment::INIT_SPACE,
        seeds = [b"comment", deal.key().as_ref(), author.key().as_ref(), &timestamp.to_le_bytes()],
        bump
    )]
    pub comment: Account<'info, Comment>,

    #[account(mut)]
    pub author: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ListCoupon<'info> {
    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    #[account(
        init,
        payer = seller,
        space = 8 + Listing::INIT_SPACE,
        seeds = [b"listing", coupon.key().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct BuyCoupon<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    /// CHECK: Seller receiving payment
    #[account(
        mut,
        constraint = seller.key() == listing.seller @ DealError::InvalidListing
    )]
    pub seller: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Platform wallet receiving fees
    #[account(mut)]
    pub platform_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DelistCoupon<'info> {
    #[account(mut)]
    pub listing: Account<'info, Listing>,

    pub coupon: Account<'info, Coupon>,

    pub seller: Signer<'info>,
}

#[derive(Accounts)]
pub struct InitializeRewardsPool<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + RewardsPool::INIT_SPACE,
        seeds = [b"rewards_pool"],
        bump
    )]
    pub rewards_pool: Account<'info, RewardsPool>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct StakeCouponCtx<'info> {
    pub coupon: Account<'info, Coupon>,

    #[account(
        init,
        payer = staker,
        space = 8 + StakedCoupon::INIT_SPACE,
        seeds = [b"staked_coupon", coupon.key().as_ref()],
        bump
    )]
    pub staked_coupon: Account<'info, StakedCoupon>,

    #[account(mut)]
    pub rewards_pool: Account<'info, RewardsPool>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnstakeCouponCtx<'info> {
    #[account(
        mut,
        close = staker
    )]
    pub staked_coupon: Account<'info, StakedCoupon>,

    pub coupon: Account<'info, Coupon>,

    #[account(mut)]
    pub rewards_pool: Account<'info, RewardsPool>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimRewardsCtx<'info> {
    #[account(mut)]
    pub staked_coupon: Account<'info, StakedCoupon>,

    #[account(mut)]
    pub rewards_pool: Account<'info, RewardsPool>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct Deal {
    pub merchant: Pubkey,
    #[max_len(100)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    pub discount_percent: u8,
    pub max_supply: u64,
    pub current_supply: u64,
    pub expiry_timestamp: i64,
    #[max_len(50)]
    pub category: String,
    pub price_lamports: u64,
    pub is_active: bool,
    pub total_ratings: u64,
    pub rating_sum: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Coupon {
    pub deal: Pubkey,
    pub owner: Pubkey,
    pub mint: Pubkey,
    pub is_redeemed: bool,
    pub minted_at: i64,
    pub redeemed_at: Option<i64>,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct DealRating {
    pub deal: Pubkey,
    pub user: Pubkey,
    pub rating: u8, // 1-5 stars
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Comment {
    pub deal: Pubkey,
    pub author: Pubkey,
    #[max_len(500)]
    pub content: String,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub coupon: Pubkey,
    pub seller: Pubkey,
    pub price_lamports: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct RewardsPool {
    pub total_staked: u64,
    pub reward_rate_per_day: u64,
    pub admin: Pubkey,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakedCoupon {
    pub coupon: Pubkey,
    pub staker: Pubkey,
    pub staked_at: i64,
    pub last_claim_at: i64,
    pub bump: u8,
}

#[error_code]
pub enum DealError {
    #[msg("Invalid discount percentage")]
    InvalidDiscount,
    #[msg("Invalid supply amount")]
    InvalidSupply,
    #[msg("Invalid expiry timestamp")]
    InvalidExpiry,
    #[msg("Deal is not active")]
    DealInactive,
    #[msg("Maximum supply reached")]
    MaxSupplyReached,
    #[msg("Deal has expired")]
    DealExpired,
    #[msg("Coupon already redeemed")]
    AlreadyRedeemed,
    #[msg("Not the owner of this coupon")]
    NotOwner,
    #[msg("Unauthorized merchant")]
    UnauthorizedMerchant,
    #[msg("Invalid rating value (must be 1-5)")]
    InvalidRating,
    #[msg("Comment too long")]
    CommentTooLong,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Listing is not active")]
    ListingInactive,
    #[msg("Invalid listing")]
    InvalidListing,
    #[msg("No rewards to claim")]
    NoRewardsToClaim,
}
