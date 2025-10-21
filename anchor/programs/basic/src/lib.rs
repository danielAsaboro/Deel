use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_metadata_accounts_v3, mpl_token_metadata::types::DataV2,
        CreateMetadataAccountsV3, Metadata,
    },
    token::{self, mint_to, Mint, MintTo, Token, TokenAccount},
};

declare_id!("GUudyUKazJCyL2f7dTG6Nm7EgUsro3acDtbbMWFuUrRd");

/// Mock USDC mint address for devnet/localnet testing
/// 6 decimals (matches real USDC on mainnet)
///
/// For PRODUCTION/MAINNET: Replace with real USDC mint address:
/// EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
#[constant]
pub const MOCK_USDC_MINT: Pubkey = pubkey!("HJbM6NHDTHuhqPMNznyrseLKzuh7w1FQe2qGUFKV5iRp");

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

    pub fn mint_coupon(ctx: Context<MintCoupon>, _deal_id: Pubkey, metadata_uri: String) -> Result<()> {
        let deal = &mut ctx.accounts.deal;

        require!(deal.is_active, DealError::DealInactive);
        require!(deal.current_supply < deal.max_supply, DealError::MaxSupplyReached);
        require!(Clock::get()?.unix_timestamp < deal.expiry_timestamp, DealError::DealExpired);

        // Transfer USDC payment from user to merchant
        if deal.price_lamports > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.user_usdc_account.to_account_info(),
                        to: ctx.accounts.merchant_usdc_account.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                deal.price_lamports, // Now represents USDC amount in base units (6 decimals)
            )?;
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
        // Truncate title to ensure name fits within 32 character limit
        let truncated_title = if deal.title.len() > 20 {
            format!("{}...", &deal.title[..17])
        } else {
            deal.title.clone()
        };
        
        let data = DataV2 {
            name: format!("{} #{}", truncated_title, deal.current_supply + 1),
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
        coupon.listing_count = 0;
        coupon.sale_count = 0;
        coupon.bump = ctx.bumps.coupon;

        deal.current_supply += 1;

        msg!("Coupon minted for deal: {}", deal.title);
        Ok(())
    }

    pub fn redeem_coupon(ctx: Context<RedeemCoupon>) -> Result<()> {
        let coupon = &mut ctx.accounts.coupon;
        let deal = &ctx.accounts.deal;

        // Check if coupon is staked
        require!(ctx.accounts.staked_coupon.data_is_empty(), DealError::CouponStaked);

        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(Clock::get()?.unix_timestamp < deal.expiry_timestamp, DealError::DealExpired);
        require!(ctx.accounts.merchant.key() == deal.merchant, DealError::UnauthorizedMerchant);

        coupon.is_redeemed = true;
        coupon.redeemed_at = Some(Clock::get()?.unix_timestamp);

        msg!("Coupon redeemed for deal: {}", deal.title);
        Ok(())
    }

    /// Transfer coupon ownership
    ///
    /// DESIGN NOTE: This updates the logical owner in the Coupon account.
    /// The actual NFT (SPL token) transfer happens separately via token::transfer
    /// in the frontend. This separation allows:
    /// - On-chain business logic (redemption, listing) to check Coupon.owner
    /// - NFTs to remain in user wallets (visible in explorers/wallets)
    /// - Marketplace to transfer both token AND coupon ownership atomically
    pub fn transfer_coupon(ctx: Context<TransferCoupon>) -> Result<()> {
        let coupon = &mut ctx.accounts.coupon;

        // Check if coupon is staked
        require!(ctx.accounts.staked_coupon.data_is_empty(), DealError::CouponStaked);

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

        // Check if this is an update or a new rating
        if deal_rating.rating != 0 {
            // User is updating their existing rating
            // Subtract old rating and add new one
            deal.rating_sum = deal.rating_sum
                .checked_sub(deal_rating.rating as u64)
                .unwrap()
                .checked_add(rating as u64)
                .unwrap();
            msg!("Rating updated: {} → {} stars", deal_rating.rating, rating);
        } else {
            // New rating
            deal.total_ratings += 1;
            deal.rating_sum += rating as u64;
            msg!("New rating: {} stars", rating);
        }

        // Store/update the user's rating
        deal_rating.deal = deal.key();
        deal_rating.user = ctx.accounts.user.key();
        deal_rating.rating = rating;
        if deal_rating.created_at == 0 {
            deal_rating.created_at = Clock::get()?.unix_timestamp;
        }
        deal_rating.bump = ctx.bumps.deal_rating;

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

    /// List coupon for sale on secondary marketplace
    ///
    /// DESIGN NOTE: Uses listing_count to prevent PDA collisions.
    /// Scenario: User lists coupon → delists → lists again
    /// Without counter: Same PDA seeds = account already exists = error
    /// With counter: Each listing gets unique PDA (listing #0, #1, #2, etc.)
    /// The counter persists even after sale, allowing unlimited re-listings.
    pub fn list_coupon(ctx: Context<ListCoupon>, price_lamports: u64) -> Result<()> {
        require!(price_lamports > 0, DealError::InvalidPrice);

        let coupon = &mut ctx.accounts.coupon;

        // Check if coupon is staked
        require!(ctx.accounts.staked_coupon.data_is_empty(), DealError::CouponStaked);

        require!(!coupon.is_redeemed, DealError::AlreadyRedeemed);
        require!(coupon.owner == ctx.accounts.seller.key(), DealError::NotOwner);

        // Store the current listing number and increment counter
        let current_listing_number = coupon.listing_count;
        coupon.listing_count += 1;

        let listing = &mut ctx.accounts.listing;
        listing.coupon = ctx.accounts.coupon.key();
        listing.seller = ctx.accounts.seller.key();
        listing.price_lamports = price_lamports;
        listing.is_active = true;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.listing_number = current_listing_number;
        listing.bump = ctx.bumps.listing;

        msg!("Coupon listed for sale at {} lamports (listing #{})", price_lamports, current_listing_number);
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

        // Transfer USDC payment from buyer to seller
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.buyer_usdc_account.to_account_info(),
                    to: ctx.accounts.seller_usdc_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            seller_amount,
        )?;

        // Transfer USDC platform fee to platform wallet
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.buyer_usdc_account.to_account_info(),
                    to: ctx.accounts.platform_usdc_account.to_account_info(),
                    authority: ctx.accounts.buyer.to_account_info(),
                },
            ),
            platform_fee,
        )?;

        // Store the current sale number and increment counter
        let current_sale_number = coupon.sale_count;
        coupon.sale_count += 1;

        // Create sale record
        let sale = &mut ctx.accounts.sale;
        sale.listing = listing.key();
        sale.coupon = coupon.key();
        sale.seller = listing.seller;
        sale.buyer = ctx.accounts.buyer.key();
        sale.price_lamports = listing.price_lamports;
        sale.sold_at = Clock::get()?.unix_timestamp;
        sale.sale_number = current_sale_number;
        sale.bump = ctx.bumps.sale;

        // Transfer ownership
        coupon.owner = ctx.accounts.buyer.key();

        // Deactivate listing (account will be closed automatically via close constraint)
        listing.is_active = false;

        msg!("Coupon purchased for {} lamports (sale #{})", listing.price_lamports, current_sale_number);
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

        // Calculate and transfer USDC rewards
        let current_time = Clock::get()?.unix_timestamp;
        let time_staked = current_time - staked_coupon.last_claim_at;
        let rewards = calculate_rewards(time_staked, ctx.accounts.rewards_pool.reward_rate_per_day)?;

        if rewards > 0 {
            // Transfer USDC rewards from pool to staker
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    token::Transfer {
                        from: ctx.accounts.rewards_pool_usdc_account.to_account_info(),
                        to: ctx.accounts.staker_usdc_account.to_account_info(),
                        authority: ctx.accounts.rewards_pool.to_account_info(),
                    },
                    &[&[b"rewards_pool", &[ctx.bumps.rewards_pool]]],
                ),
                rewards,
            )?;
        }

        let pool = &mut ctx.accounts.rewards_pool;
        pool.total_staked -= 1;

        msg!("Coupon unstaked, rewards claimed: {} USDC base units", rewards);
        Ok(())
    }

    // Initialize or update user profile
    pub fn initialize_user_profile(ctx: Context<InitializeUserProfile>) -> Result<()> {
        let profile = &mut ctx.accounts.user_profile;
        let clock = Clock::get()?;

        if profile.deals_claimed == 0 {
            profile.user = ctx.accounts.user.key();
            profile.first_deal_timestamp = clock.unix_timestamp;
        }
        profile.last_activity_timestamp = clock.unix_timestamp;
        profile.bump = ctx.bumps.user_profile;

        Ok(())
    }

    // Mint a loyalty badge for achieving milestones
    pub fn mint_loyalty_badge(
        ctx: Context<MintLoyaltyBadge>,
        badge_type: u8,
        title: String,
        description: String,
    ) -> Result<()> {
        require!(badge_type >= 1 && badge_type <= 4, DealError::InvalidBadgeType);
        
        let badge = &mut ctx.accounts.loyalty_badge;
        let clock = Clock::get()?;

        badge.user = ctx.accounts.user.key();
        badge.mint = ctx.accounts.badge_mint.key();
        badge.badge_type = badge_type;
        badge.earned_at = clock.unix_timestamp;
        badge.title = title.clone();
        badge.description = description;
        badge.bump = ctx.bumps.loyalty_badge;

        // Update user profile
        let profile = &mut ctx.accounts.user_profile;
        profile.badges_earned = profile.badges_earned.checked_add(1).unwrap();

        // Mint the NFT badge
        let cpi_accounts = MintTo {
            mint: ctx.accounts.badge_mint.to_account_info(),
            to: ctx.accounts.badge_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        mint_to(cpi_ctx, 1)?;

        msg!("Loyalty badge minted: {} (Type {})", title, badge_type);
        Ok(())
    }

    // Create a group deal
    pub fn create_group_deal(
        ctx: Context<CreateGroupDeal>,
        target_participants: u32,
        tier1_threshold: u32,
        tier1_discount: u8,
        tier2_threshold: u32,
        tier2_discount: u8,
        tier3_threshold: u32,
        tier3_discount: u8,
        expiry_timestamp: i64,
        price_lamports: u64,
    ) -> Result<()> {
        require!(tier1_discount <= 100, DealError::InvalidDiscount);
        require!(tier2_discount <= 100, DealError::InvalidDiscount);
        require!(tier3_discount <= 100, DealError::InvalidDiscount);
        require!(tier1_threshold > 0, DealError::InvalidGroupThreshold);
        require!(tier2_threshold >= tier1_threshold, DealError::InvalidGroupThreshold);
        require!(tier3_threshold >= tier2_threshold, DealError::InvalidGroupThreshold);
        require!(expiry_timestamp > Clock::get()?.unix_timestamp, DealError::InvalidExpiry);

        let group_deal = &mut ctx.accounts.group_deal;
        group_deal.deal = ctx.accounts.deal.key();
        group_deal.creator = ctx.accounts.creator.key();
        group_deal.target_participants = target_participants;
        group_deal.current_participants = 0;
        group_deal.tier1_discount = tier1_discount;
        group_deal.tier2_discount = tier2_discount;
        group_deal.tier3_discount = tier3_discount;
        group_deal.tier1_threshold = tier1_threshold;
        group_deal.tier2_threshold = tier2_threshold;
        group_deal.tier3_threshold = tier3_threshold;
        group_deal.expiry_timestamp = expiry_timestamp;
        group_deal.is_active = true;
        group_deal.price_lamports = price_lamports;
        group_deal.bump = ctx.bumps.group_deal;

        msg!("Group deal created with {} tiers", 3);
        Ok(())
    }

    // Join a group deal
    pub fn join_group_deal(ctx: Context<JoinGroupDeal>) -> Result<()> {
        let group_deal = &mut ctx.accounts.group_deal;
        let clock = Clock::get()?;

        require!(group_deal.is_active, DealError::DealInactive);
        require!(group_deal.expiry_timestamp > clock.unix_timestamp, DealError::DealExpired);
        require!(
            group_deal.current_participants < group_deal.target_participants,
            DealError::MaxSupplyReached
        );

        let participant = &mut ctx.accounts.participant;
        participant.group_deal = group_deal.key();
        participant.participant = ctx.accounts.user.key();
        participant.joined_at = clock.unix_timestamp;
        participant.has_claimed = false;
        participant.bump = ctx.bumps.participant;

        group_deal.current_participants = group_deal.current_participants.checked_add(1).unwrap();

        msg!("User joined group deal: {}/{}", group_deal.current_participants, group_deal.target_participants);
        Ok(())
    }

    // Claim coupon from group deal (once threshold is met)
    pub fn claim_group_deal_coupon(ctx: Context<ClaimGroupDealCoupon>) -> Result<()> {
        let group_deal = &ctx.accounts.group_deal;
        let participant = &mut ctx.accounts.participant;

        require!(!participant.has_claimed, DealError::AlreadyRedeemed);
        require!(
            group_deal.current_participants >= group_deal.tier1_threshold,
            DealError::GroupThresholdNotMet
        );

        // Determine discount tier
        let discount = if group_deal.current_participants >= group_deal.tier3_threshold {
            group_deal.tier3_discount
        } else if group_deal.current_participants >= group_deal.tier2_threshold {
            group_deal.tier2_discount
        } else {
            group_deal.tier1_discount
        };

        // Mark as claimed
        participant.has_claimed = true;

        msg!("Group deal coupon claimed with {}% discount", discount);
        Ok(())
    }

    pub fn claim_rewards(ctx: Context<ClaimRewardsCtx>) -> Result<()> {
        let staked_coupon = &mut ctx.accounts.staked_coupon;
        require!(staked_coupon.staker == ctx.accounts.staker.key(), DealError::NotOwner);

        let current_time = Clock::get()?.unix_timestamp;
        let time_since_claim = current_time - staked_coupon.last_claim_at;
        let rewards = calculate_rewards(time_since_claim, ctx.accounts.rewards_pool.reward_rate_per_day)?;

        require!(rewards > 0, DealError::NoRewardsToClaim);

        // Transfer USDC rewards from pool to staker
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                token::Transfer {
                    from: ctx.accounts.rewards_pool_usdc_account.to_account_info(),
                    to: ctx.accounts.staker_usdc_account.to_account_info(),
                    authority: ctx.accounts.rewards_pool.to_account_info(),
                },
                &[&[b"rewards_pool", &[ctx.bumps.rewards_pool]]],
            ),
            rewards,
        )?;

        staked_coupon.last_claim_at = current_time;

        msg!("Rewards claimed: {} USDC base units", rewards);
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

    // USDC payment accounts
    #[account(
        mut,
        constraint = user_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub user_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = merchant_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken,
        constraint = merchant_usdc_account.owner == deal.merchant @ DealError::UnauthorizedMerchant
    )]
    pub merchant_usdc_account: Account<'info, TokenAccount>,

    /// CHECK: Merchant account (wallet address, not token account)
    #[account(
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

    /// CHECK: Staked coupon PDA - checked manually to ensure coupon is not staked
    #[account(
        seeds = [b"staked_coupon", coupon.key().as_ref()],
        bump,
    )]
    pub staked_coupon: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct TransferCoupon<'info> {
    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    pub current_owner: Signer<'info>,

    /// CHECK: New owner pubkey
    pub new_owner: UncheckedAccount<'info>,

    /// CHECK: Staked coupon PDA - checked manually to ensure coupon is not staked
    #[account(
        seeds = [b"staked_coupon", coupon.key().as_ref()],
        bump,
    )]
    pub staked_coupon: UncheckedAccount<'info>,
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
        seeds = [b"listing", coupon.key().as_ref(), coupon.listing_count.to_le_bytes().as_ref()],
        bump
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub seller: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// CHECK: Staked coupon PDA - checked manually to ensure coupon is not staked
    #[account(
        seeds = [b"staked_coupon", coupon.key().as_ref()],
        bump,
    )]
    pub staked_coupon: UncheckedAccount<'info>,
}

/// Buy coupon from secondary marketplace
///
/// DESIGN NOTE: Creates permanent Sale PDA using sale_count.
/// Similar to listing_count, this prevents collisions when the same coupon
/// is traded multiple times. Sale records are never deleted, creating an
/// immutable on-chain history of all secondary market transactions.
/// Seeds: [b"sale", coupon, sale_count] ensures each trade gets unique PDA.
#[derive(Accounts)]
pub struct BuyCoupon<'info> {
    #[account(
        mut,
        close = seller
    )]
    pub listing: Account<'info, Listing>,

    #[account(mut)]
    pub coupon: Account<'info, Coupon>,

    #[account(
        init,
        payer = buyer,
        space = 8 + Sale::INIT_SPACE,
        seeds = [
            b"sale",
            coupon.key().as_ref(),
            coupon.sale_count.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub sale: Account<'info, Sale>,

    // USDC payment accounts
    #[account(
        mut,
        constraint = buyer_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub buyer_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = seller_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken,
        constraint = seller_usdc_account.owner == listing.seller @ DealError::InvalidListing
    )]
    pub seller_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = platform_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub platform_usdc_account: Account<'info, TokenAccount>,

    /// CHECK: Seller wallet address (receives rent when listing closes)
    #[account(
        mut,
        constraint = seller.key() == listing.seller @ DealError::InvalidListing
    )]
    pub seller: UncheckedAccount<'info>,

    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: Platform wallet address
    pub platform_wallet: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DelistCoupon<'info> {
    #[account(
        mut,
        close = seller
    )]
    pub listing: Account<'info, Listing>,

    pub coupon: Account<'info, Coupon>,

    #[account(mut)]
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

    #[account(mut, seeds = [b"rewards_pool"], bump)]
    pub rewards_pool: Account<'info, RewardsPool>,

    // USDC reward accounts
    #[account(
        mut,
        constraint = rewards_pool_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub rewards_pool_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = staker_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub staker_usdc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimRewardsCtx<'info> {
    #[account(mut)]
    pub staked_coupon: Account<'info, StakedCoupon>,

    #[account(mut, seeds = [b"rewards_pool"], bump)]
    pub rewards_pool: Account<'info, RewardsPool>,

    // USDC reward accounts
    #[account(
        mut,
        constraint = rewards_pool_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub rewards_pool_usdc_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = staker_usdc_account.mint == MOCK_USDC_MINT @ DealError::InvalidPaymentToken
    )]
    pub staker_usdc_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub staker: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

// New account contexts for loyalty badges and group deals

#[derive(Accounts)]
pub struct InitializeUserProfile<'info> {
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserProfile::INIT_SPACE,
        seeds = [b"user_profile", user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, UserProfile>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(badge_type: u8)]
pub struct MintLoyaltyBadge<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + LoyaltyBadge::INIT_SPACE,
        seeds = [b"loyalty_badge", user.key().as_ref(), &[badge_type]],
        bump
    )]
    pub loyalty_badge: Account<'info, LoyaltyBadge>,

    #[account(mut)]
    pub user_profile: Account<'info, UserProfile>,

    #[account(
        init,
        payer = user,
        mint::decimals = 0,
        mint::authority = user,
        mint::freeze_authority = user,
    )]
    pub badge_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = user,
        associated_token::mint = badge_mint,
        associated_token::authority = user,
    )]
    pub badge_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct CreateGroupDeal<'info> {
    pub deal: Account<'info, Deal>,

    #[account(
        init,
        payer = creator,
        space = 8 + GroupDeal::INIT_SPACE,
        seeds = [b"group_deal", deal.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub group_deal: Account<'info, GroupDeal>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct JoinGroupDeal<'info> {
    #[account(mut)]
    pub group_deal: Account<'info, GroupDeal>,

    #[account(
        init,
        payer = user,
        space = 8 + GroupParticipant::INIT_SPACE,
        seeds = [b"group_participant", group_deal.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub participant: Account<'info, GroupParticipant>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimGroupDealCoupon<'info> {
    pub group_deal: Account<'info, GroupDeal>,

    #[account(mut)]
    pub participant: Account<'info, GroupParticipant>,

    pub user: Signer<'info>,
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
    pub listing_count: u32,  // Tracks how many times this coupon has been listed
    pub sale_count: u32,     // Tracks how many times this coupon has been sold
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
    pub listing_number: u32,  // Which listing this is (1st, 2nd, 3rd...)
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Sale {
    pub listing: Pubkey,
    pub coupon: Pubkey,
    pub seller: Pubkey,
    pub buyer: Pubkey,
    pub price_lamports: u64,
    pub sold_at: i64,
    pub sale_number: u32,  // Which sale this is (1st, 2nd, 3rd...)
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

/// User Profile - tracks user activity and achievements
#[account]
#[derive(InitSpace)]
pub struct UserProfile {
    pub user: Pubkey,
    pub deals_claimed: u64,
    pub total_spent_lamports: u64,
    pub badges_earned: u32,
    pub first_deal_timestamp: i64,
    pub last_activity_timestamp: i64,
    pub total_savings_lamports: u64,  // Total discount value earned
    pub referrals_made: u32,
    pub bump: u8,
}

/// Loyalty Badge - NFT achievement for user milestones
#[account]
#[derive(InitSpace)]
pub struct LoyaltyBadge {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub badge_type: u8,  // 1=Bronze, 2=Silver, 3=Gold, 4=Platinum
    pub earned_at: i64,
    #[max_len(50)]
    pub title: String,
    #[max_len(200)]
    pub description: String,
    pub bump: u8,
}

/// Group Deal - collaborative buying with tiered discounts
#[account]
#[derive(InitSpace)]
pub struct GroupDeal {
    pub deal: Pubkey,
    pub creator: Pubkey,
    pub target_participants: u32,
    pub current_participants: u32,
    pub tier1_discount: u8,  // Discount at tier 1 (e.g., 5 people)
    pub tier2_discount: u8,  // Discount at tier 2 (e.g., 10 people)
    pub tier3_discount: u8,  // Discount at tier 3 (e.g., 20 people)
    pub tier1_threshold: u32,
    pub tier2_threshold: u32,
    pub tier3_threshold: u32,
    pub expiry_timestamp: i64,
    pub is_active: bool,
    pub price_lamports: u64,
    pub bump: u8,
}

/// Group Deal Participant
#[account]
#[derive(InitSpace)]
pub struct GroupParticipant {
    pub group_deal: Pubkey,
    pub participant: Pubkey,
    pub joined_at: i64,
    pub has_claimed: bool,
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
    #[msg("Coupon is currently staked and cannot be redeemed, transferred, or listed")]
    CouponStaked,
    #[msg("Invalid payment token - must use platform USDC")]
    InvalidPaymentToken,
    #[msg("Invalid badge type (must be 1-4)")]
    InvalidBadgeType,
    #[msg("Invalid group threshold configuration")]
    InvalidGroupThreshold,
    #[msg("Group deal threshold not yet met")]
    GroupThresholdNotMet,
}
