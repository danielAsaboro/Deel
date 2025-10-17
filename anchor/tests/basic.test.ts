import * as anchor from '@coral-xyz/anchor'
import { Program, BN } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token'
import { assert } from 'chai'

describe('Deal Discovery Platform', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  )

  let merchant: Keypair
  let user: Keypair
  let dealPda: PublicKey
  let dealTitle: string
  let dealAccount: any

  before(async () => {
    merchant = Keypair.generate()
    user = Keypair.generate()

    // Airdrop SOL to merchant and user
    const merchantAirdrop = await provider.connection.requestAirdrop(
      merchant.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    )
    const userAirdrop = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    )

    await provider.connection.confirmTransaction(merchantAirdrop)
    await provider.connection.confirmTransaction(userAirdrop)
  })

  it('Creates a deal', async () => {
    dealTitle = `Pizza Deal ${Date.now()}`
    const description = '50% off any large pizza'
    const discountPercent = 50
    const maxSupply = new BN(100)
    const expiryTimestamp = new BN(Math.floor(Date.now() / 1000) + 86400 * 30) // 30 days
    const category = 'Food & Dining'
    const priceLamports = new BN(100_000_000) // 0.1 SOL

    ;[dealPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('deal'), merchant.publicKey.toBuffer(), Buffer.from(dealTitle)],
      program.programId
    )

    await program.methods
      .createDeal(
        dealTitle,
        description,
        discountPercent,
        maxSupply,
        expiryTimestamp,
        category,
        priceLamports
      )
      .accounts({
        deal: dealPda,
        merchant: merchant.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([merchant])
      .rpc()

    dealAccount = await program.account.deal.fetch(dealPda)

    assert.equal(dealAccount.title, dealTitle)
    assert.equal(dealAccount.description, description)
    assert.equal(dealAccount.discountPercent, discountPercent)
    assert.equal(dealAccount.maxSupply.toString(), maxSupply.toString())
    assert.equal(dealAccount.currentSupply.toString(), '0')
    assert.equal(dealAccount.category, category)
    assert.equal(dealAccount.priceLamports.toString(), priceLamports.toString())
    assert.isTrue(dealAccount.isActive)
    assert.equal(dealAccount.merchant.toString(), merchant.publicKey.toString())
  })

  it('Updates a deal', async () => {
    const newPrice = new BN(50_000_000) // 0.05 SOL

    await program.methods
      .updateDeal(false, newPrice)
      .accounts({
        deal: dealPda,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc()

    dealAccount = await program.account.deal.fetch(dealPda)
    assert.isFalse(dealAccount.isActive)
    assert.equal(dealAccount.priceLamports.toString(), newPrice.toString())

    // Reactivate for next tests
    await program.methods
      .updateDeal(true, null)
      .accounts({
        deal: dealPda,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc()
  })

  it('Mints a coupon NFT', async () => {
    dealAccount = await program.account.deal.fetch(dealPda)

    const mintKeypair = Keypair.generate()
    const [couponPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('coupon'),
        dealPda.toBuffer(),
        dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    const userTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      user.publicKey
    )

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )

    const userBalanceBefore = await provider.connection.getBalance(user.publicKey)
    const merchantBalanceBefore = await provider.connection.getBalance(merchant.publicKey)

    await program.methods
      .mintCoupon(dealPda)
      .accounts({
        deal: dealPda,
        coupon: couponPda,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        metadata: metadataPda,
        merchant: merchant.publicKey,
        user: user.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([user, mintKeypair])
      .rpc()

    // Verify coupon account
    const couponAccount = await program.account.coupon.fetch(couponPda)
    assert.equal(couponAccount.deal.toString(), dealPda.toString())
    assert.equal(couponAccount.owner.toString(), user.publicKey.toString())
    assert.equal(couponAccount.mint.toString(), mintKeypair.publicKey.toString())
    assert.isFalse(couponAccount.isRedeemed)

    // Verify deal supply increased
    const updatedDealAccount = await program.account.deal.fetch(dealPda)
    assert.equal(updatedDealAccount.currentSupply.toString(), '1')

    // Verify payment was transferred (approximately, accounting for transaction fees)
    const userBalanceAfter = await provider.connection.getBalance(user.publicKey)
    const merchantBalanceAfter = await provider.connection.getBalance(merchant.publicKey)

    assert.isTrue(userBalanceAfter < userBalanceBefore - dealAccount.priceLamports.toNumber())
    assert.equal(merchantBalanceAfter - merchantBalanceBefore, dealAccount.priceLamports.toNumber())
  })

  it('Redeems a coupon', async () => {
    // Get the first coupon
    const allCoupons = await program.account.coupon.all()
    const coupon = allCoupons[0]

    await program.methods
      .redeemCoupon()
      .accounts({
        coupon: coupon.publicKey,
        deal: dealPda,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc()

    const couponAccount = await program.account.coupon.fetch(coupon.publicKey)
    assert.isTrue(couponAccount.isRedeemed)
    assert.isNotNull(couponAccount.redeemedAt)
  })

  it('Transfers a coupon to new owner', async () => {
    // Mint another coupon first
    dealAccount = await program.account.deal.fetch(dealPda)
    const mintKeypair = Keypair.generate()
    const [couponPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('coupon'),
        dealPda.toBuffer(),
        dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    const userTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      user.publicKey
    )

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )

    await program.methods
      .mintCoupon(dealPda)
      .accounts({
        deal: dealPda,
        coupon: couponPda,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        metadata: metadataPda,
        merchant: merchant.publicKey,
        user: user.publicKey,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      })
      .signers([user, mintKeypair])
      .rpc()

    // Transfer to merchant
    const newOwner = merchant.publicKey

    await program.methods
      .transferCoupon()
      .accounts({
        coupon: couponPda,
        currentOwner: user.publicKey,
        newOwner: newOwner,
      })
      .signers([user])
      .rpc()

    const couponAccount = await program.account.coupon.fetch(couponPda)
    assert.equal(couponAccount.owner.toString(), newOwner.toString())
  })

  it('Prevents non-merchant from redeeming', async () => {
    const allCoupons = await program.account.coupon.all()
    const unredeemed = allCoupons.find((c) => !c.account.isRedeemed)

    if (!unredeemed) {
      console.log('No unredeemed coupons available for this test')
      return
    }

    try {
      await program.methods
        .redeemCoupon()
        .accounts({
          coupon: unredeemed.publicKey,
          deal: dealPda,
          merchant: user.publicKey, // Wrong merchant!
        })
        .signers([user])
        .rpc()

      assert.fail('Should have thrown error')
    } catch (error) {
      assert.include(error.message, 'UnauthorizedMerchant')
    }
  })

  it('Prevents minting when deal is inactive', async () => {
    // Deactivate deal
    await program.methods
      .updateDeal(false, null)
      .accounts({
        deal: dealPda,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc()

    dealAccount = await program.account.deal.fetch(dealPda)
    const mintKeypair = Keypair.generate()
    const [couponPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('coupon'),
        dealPda.toBuffer(),
        dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    const userTokenAccount = getAssociatedTokenAddressSync(
      mintKeypair.publicKey,
      user.publicKey
    )

    const [metadataPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    )

    try {
      await program.methods
        .mintCoupon(dealPda)
        .accounts({
          deal: dealPda,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          merchant: merchant.publicKey,
          user: user.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
        })
        .signers([user, mintKeypair])
        .rpc()

      assert.fail('Should have thrown error')
    } catch (error) {
      assert.include(error.message, 'DealInactive')
    }

    // Reactivate for rating/comment tests
    await program.methods
      .updateDeal(true, null)
      .accounts({
        deal: dealPda,
        merchant: merchant.publicKey,
      })
      .signers([merchant])
      .rpc()
  })

  it('Rates a deal', async () => {
    const rating = 5

    const [ratingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('rating'), dealPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    )

    await program.methods
      .rateDeal(rating)
      .accounts({
        deal: dealPda,
        dealRating: ratingPda,
        user: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc()

    // Verify rating account
    const ratingAccount = await program.account.dealRating.fetch(ratingPda)
    assert.equal(ratingAccount.deal.toString(), dealPda.toString())
    assert.equal(ratingAccount.user.toString(), user.publicKey.toString())
    assert.equal(ratingAccount.rating, rating)
    assert.isAbove(ratingAccount.createdAt.toNumber(), 0)

    // Verify deal ratings updated
    const updatedDeal = await program.account.deal.fetch(dealPda)
    assert.equal(updatedDeal.totalRatings.toString(), '1')
    assert.equal(updatedDeal.ratingSum.toString(), '5')
  })

  it('Adds another rating from different user', async () => {
    const user2 = Keypair.generate()

    // Airdrop to user2
    const airdrop = await provider.connection.requestAirdrop(
      user2.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdrop)

    const rating = 4

    const [ratingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('rating'), dealPda.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    )

    await program.methods
      .rateDeal(rating)
      .accounts({
        deal: dealPda,
        dealRating: ratingPda,
        user: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc()

    // Verify deal ratings aggregated correctly
    const updatedDeal = await program.account.deal.fetch(dealPda)
    assert.equal(updatedDeal.totalRatings.toString(), '2')
    assert.equal(updatedDeal.ratingSum.toString(), '9') // 5 + 4

    // Calculate average: 9 / 2 = 4.5
    const avgRating = updatedDeal.ratingSum.toNumber() / updatedDeal.totalRatings.toNumber()
    assert.equal(avgRating, 4.5)
  })

  it('Prevents invalid ratings', async () => {
    const invalidRating = 6 // Out of range

    const [ratingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('rating'), dealPda.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .rateDeal(invalidRating)
        .accounts({
          deal: dealPda,
          dealRating: ratingPda,
          user: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc()

      assert.fail('Should have thrown error')
    } catch (error) {
      assert.include(error.message, 'InvalidRating')
    }
  })

  it('Adds a comment to a deal', async () => {
    const commentContent = 'This is a great deal! I saved a lot of money.'
    const timestamp = new BN(Date.now())

    const [commentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('comment'),
        dealPda.toBuffer(),
        user.publicKey.toBuffer(),
        timestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    await program.methods
      .addComment(timestamp, commentContent)
      .accounts({
        deal: dealPda,
        comment: commentPda,
        author: user.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user])
      .rpc()

    // Verify comment account
    const commentAccount = await program.account.comment.fetch(commentPda)
    assert.equal(commentAccount.deal.toString(), dealPda.toString())
    assert.equal(commentAccount.author.toString(), user.publicKey.toString())
    assert.equal(commentAccount.content, commentContent)
    assert.equal(commentAccount.createdAt.toString(), timestamp.toString())
  })

  it('Adds multiple comments to same deal', async () => {
    const user2 = Keypair.generate()

    // Airdrop to user2
    const airdrop = await provider.connection.requestAirdrop(
      user2.publicKey,
      1 * anchor.web3.LAMPORTS_PER_SOL
    )
    await provider.connection.confirmTransaction(airdrop)

    const commentContent = 'Merchant was very friendly!'
    const timestamp = new BN(Date.now())

    const [commentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('comment'),
        dealPda.toBuffer(),
        user2.publicKey.toBuffer(),
        timestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    await program.methods
      .addComment(timestamp, commentContent)
      .accounts({
        deal: dealPda,
        comment: commentPda,
        author: user2.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc()

    // Verify we can fetch all comments for this deal
    const allComments = await program.account.comment.all([
      {
        memcmp: {
          offset: 8, // After discriminator
          bytes: dealPda.toBase58(),
        },
      },
    ])

    assert.isAtLeast(allComments.length, 2)
  })

  it('Prevents comments that are too long', async () => {
    const longComment = 'a'.repeat(501) // 501 characters, exceeds 500 limit
    const timestamp = new BN(Date.now())

    const [commentPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('comment'),
        dealPda.toBuffer(),
        merchant.publicKey.toBuffer(),
        timestamp.toArrayLike(Buffer, 'le', 8),
      ],
      program.programId
    )

    try {
      await program.methods
        .addComment(timestamp, longComment)
        .accounts({
          deal: dealPda,
          comment: commentPda,
          author: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc()

      assert.fail('Should have thrown error')
    } catch (error) {
      assert.include(error.message, 'CommentTooLong')
    }
  })

  it('Prevents rating below minimum (0)', async () => {
    const invalidRating = 0

    const [ratingPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('rating'), dealPda.toBuffer(), merchant.publicKey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .rateDeal(invalidRating)
        .accounts({
          deal: dealPda,
          dealRating: ratingPda,
          user: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc()

      assert.fail('Should have thrown error')
    } catch (error) {
      assert.include(error.message, 'InvalidRating')
    }
  })

  // Marketplace Tests
  describe('Secondary Marketplace', () => {
    let listingCouponPda: PublicKey
    let listingPda: PublicKey
    let seller: Keypair
    let buyer: Keypair

    before(async () => {
      seller = Keypair.generate()
      buyer = Keypair.generate()

      // Airdrop to both
      const sellerAirdrop = await provider.connection.requestAirdrop(
        seller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
      const buyerAirdrop = await provider.connection.requestAirdrop(
        buyer.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )

      await provider.connection.confirmTransaction(sellerAirdrop)
      await provider.connection.confirmTransaction(buyerAirdrop)

      // Mint a coupon for the seller
      dealAccount = await program.account.deal.fetch(dealPda)
      const mintKeypair = Keypair.generate()

      listingCouponPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from('coupon'),
          dealPda.toBuffer(),
          dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )[0]

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        seller.publicKey
      )

      const [metadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )

      await program.methods
        .mintCoupon(dealPda, 'ipfs://test-metadata')
        .accounts({
          deal: dealPda,
          coupon: listingCouponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          merchant: merchant.publicKey,
          user: seller.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        })
        .signers([seller, mintKeypair])
        .rpc()

      listingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), listingCouponPda.toBuffer()],
        program.programId
      )[0]
    })

    it('Lists a coupon for sale', async () => {
      const price = new BN(50_000_000) // 0.05 SOL

      await program.methods
        .listCoupon(price)
        .accounts({
          coupon: listingCouponPda,
          listing: listingPda,
          seller: seller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([seller])
        .rpc()

      const listing = await program.account.listing.fetch(listingPda)
      assert.equal(listing.coupon.toString(), listingCouponPda.toString())
      assert.equal(listing.seller.toString(), seller.publicKey.toString())
      assert.equal(listing.priceLamports.toString(), price.toString())
      assert.isTrue(listing.isActive)
    })

    it('Prevents listing with zero price', async () => {
      const anotherSeller = Keypair.generate()
      const airdrop = await provider.connection.requestAirdrop(
        anotherSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdrop)

      // Mint another coupon
      dealAccount = await program.account.deal.fetch(dealPda)
      const mintKeypair = Keypair.generate()

      const couponPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from('coupon'),
          dealPda.toBuffer(),
          dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )[0]

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        anotherSeller.publicKey
      )

      const [metadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )

      await program.methods
        .mintCoupon(dealPda, 'ipfs://test-metadata-2')
        .accounts({
          deal: dealPda,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          merchant: merchant.publicKey,
          user: anotherSeller.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        })
        .signers([anotherSeller, mintKeypair])
        .rpc()

      const testListingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer()],
        program.programId
      )[0]

      try {
        await program.methods
          .listCoupon(new BN(0))
          .accounts({
            coupon: couponPda,
            listing: testListingPda,
            seller: anotherSeller.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([anotherSeller])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        assert.include(error.message, 'InvalidPrice')
      }
    })

    it('Buys a listed coupon', async () => {
      const platformWallet = Keypair.generate().publicKey

      const sellerBalanceBefore = await provider.connection.getBalance(seller.publicKey)
      const buyerBalanceBefore = await provider.connection.getBalance(buyer.publicKey)

      const listing = await program.account.listing.fetch(listingPda)

      await program.methods
        .buyCoupon()
        .accounts({
          listing: listingPda,
          coupon: listingCouponPda,
          seller: seller.publicKey,
          buyer: buyer.publicKey,
          platformWallet: platformWallet,
          systemProgram: SystemProgram.programId,
        })
        .signers([buyer])
        .rpc()

      // Verify ownership transferred
      const coupon = await program.account.coupon.fetch(listingCouponPda)
      assert.equal(coupon.owner.toString(), buyer.publicKey.toString())

      // Verify listing deactivated
      const updatedListing = await program.account.listing.fetch(listingPda)
      assert.isFalse(updatedListing.isActive)

      // Verify payments (seller got 97.5%, platform got 2.5%)
      const sellerBalanceAfter = await provider.connection.getBalance(seller.publicKey)
      const platformFee = (listing.priceLamports.toNumber() * 25) / 1000
      const sellerAmount = listing.priceLamports.toNumber() - platformFee

      assert.equal(sellerBalanceAfter - sellerBalanceBefore, sellerAmount)
    })

    it('Prevents buying inactive listing', async () => {
      try {
        await program.methods
          .buyCoupon()
          .accounts({
            listing: listingPda,
            coupon: listingCouponPda,
            seller: seller.publicKey,
            buyer: merchant.publicKey,
            platformWallet: Keypair.generate().publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([merchant])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        assert.include(error.message, 'ListingInactive')
      }
    })

    it('Delists a coupon', async () => {
      // Create another listing first
      const anotherSeller = Keypair.generate()
      const airdrop = await provider.connection.requestAirdrop(
        anotherSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdrop)

      // Mint coupon
      dealAccount = await program.account.deal.fetch(dealPda)
      const mintKeypair = Keypair.generate()

      const couponPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from('coupon'),
          dealPda.toBuffer(),
          dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )[0]

      const userTokenAccount = getAssociatedTokenAddressSync(
        mintKeypair.publicKey,
        anotherSeller.publicKey
      )

      const [metadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          mintKeypair.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )

      await program.methods
        .mintCoupon(dealPda, 'ipfs://test-metadata-3')
        .accounts({
          deal: dealPda,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          merchant: merchant.publicKey,
          user: anotherSeller.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        })
        .signers([anotherSeller, mintKeypair])
        .rpc()

      const delistListingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer()],
        program.programId
      )[0]

      // List it
      await program.methods
        .listCoupon(new BN(30_000_000))
        .accounts({
          coupon: couponPda,
          listing: delistListingPda,
          seller: anotherSeller.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([anotherSeller])
        .rpc()

      // Now delist
      await program.methods
        .delistCoupon()
        .accounts({
          listing: delistListingPda,
          coupon: couponPda,
          seller: anotherSeller.publicKey,
        })
        .signers([anotherSeller])
        .rpc()

      const listing = await program.account.listing.fetch(delistListingPda)
      assert.isFalse(listing.isActive)
    })

    it('Prevents non-owner from delisting', async () => {
      try {
        await program.methods
          .delistCoupon()
          .accounts({
            listing: listingPda,
            coupon: listingCouponPda,
            seller: merchant.publicKey,
          })
          .signers([merchant])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        assert.include(error.message, 'NotOwner')
      }
    })
  })
})
