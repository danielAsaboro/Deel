import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import BN from 'bn.js'
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
} from '@solana/web3.js'
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getMinimumBalanceForRentExemptMint,
  MINT_SIZE,
  createInitializeMintInstruction,
} from '@solana/spl-token'
import { assert } from 'chai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

describe('Deal Discovery Platform', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
    'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
  )

  // USDC constants
  const USDC_DECIMALS = 6
  let usdcMint: Keypair
  let usdcMintAuthority: Keypair
  let merchantUsdcAccount: PublicKey
  let userUsdcAccount: PublicKey

  let merchant: Keypair
  let user: Keypair
  let dealPda: PublicKey
  let dealTitle: string
  let dealAccount: any

  before(async () => {
    console.log('\n🔧 Setting up test environment...\n')

    // Load USDC keypairs
    const keysDir = path.join(__dirname, '..', 'keys')
    const mintPath = path.join(keysDir, 'usdc-mint.json')
    const authorityPath = path.join(keysDir, 'usdc-mint-authority.json')

    usdcMint = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(mintPath, 'utf-8')))
    )
    usdcMintAuthority = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(fs.readFileSync(authorityPath, 'utf-8')))
    )

    console.log('USDC Mint:', usdcMint.publicKey.toString())

    // Create USDC mint on-chain
    const mintExists = await provider.connection.getAccountInfo(usdcMint.publicKey)
    if (!mintExists) {
      console.log('Creating USDC mint on-chain...')
      const lamports = await getMinimumBalanceForRentExemptMint(provider.connection)
      const createMintTx = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: provider.wallet.publicKey,
          newAccountPubkey: usdcMint.publicKey,
          space: MINT_SIZE,
          lamports,
          programId: TOKEN_PROGRAM_ID,
        }),
        createInitializeMintInstruction(
          usdcMint.publicKey,
          USDC_DECIMALS,
          usdcMintAuthority.publicKey,
          null
        )
      )
      await provider.sendAndConfirm(createMintTx, [usdcMint])
      console.log('✅ USDC mint created')
    } else {
      console.log('✅ USDC mint already exists')
    }

    merchant = Keypair.generate()
    user = Keypair.generate()

    // Airdrop SOL for transaction fees
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

    console.log('✅ SOL airdropped to test wallets')

    // Create USDC token accounts for merchant and user
    merchantUsdcAccount = getAssociatedTokenAddressSync(
      usdcMint.publicKey,
      merchant.publicKey
    )

    userUsdcAccount = getAssociatedTokenAddressSync(
      usdcMint.publicKey,
      user.publicKey
    )

    const tx = new Transaction()
      .add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          merchantUsdcAccount,
          merchant.publicKey,
          usdcMint.publicKey
        )
      )
      .add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          userUsdcAccount,
          user.publicKey,
          usdcMint.publicKey
        )
      )

    await provider.sendAndConfirm(tx)
    console.log('✅ USDC token accounts created')

    // Mint USDC to test wallets (1000 USDC each)
    const mintAmount = 1000 * 10 ** USDC_DECIMALS

    const mintTx = new Transaction()
      .add(
        createMintToInstruction(
          usdcMint.publicKey,
          merchantUsdcAccount,
          usdcMintAuthority.publicKey,
          mintAmount
        )
      )
      .add(
        createMintToInstruction(
          usdcMint.publicKey,
          userUsdcAccount,
          usdcMintAuthority.publicKey,
          mintAmount
        )
      )

    await provider.sendAndConfirm(mintTx, [usdcMintAuthority])
    console.log('✅ USDC minted to test wallets (1000 USDC each)\n')
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

    // Get USDC balances before
    const userUsdcBefore = await provider.connection.getTokenAccountBalance(userUsdcAccount)
    const merchantUsdcBefore = await provider.connection.getTokenAccountBalance(merchantUsdcAccount)

    await program.methods
      .mintCoupon(dealPda, 'ipfs://test-metadata')
      .accounts({
        deal: dealPda,
        coupon: couponPda,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        metadata: metadataPda,
        userUsdcAccount,
        merchantUsdcAccount,
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

    // Verify USDC payment was transferred
    const userUsdcAfter = await provider.connection.getTokenAccountBalance(userUsdcAccount)
    const merchantUsdcAfter = await provider.connection.getTokenAccountBalance(merchantUsdcAccount)

    const paidAmount = dealAccount.priceLamports.toNumber()
    assert.equal(
      Number(userUsdcBefore.value.amount) - Number(userUsdcAfter.value.amount),
      paidAmount,
      'User should have paid correct USDC amount'
    )
    assert.equal(
      Number(merchantUsdcAfter.value.amount) - Number(merchantUsdcBefore.value.amount),
      paidAmount,
      'Merchant should have received correct USDC amount'
    )
  })

  it('Redeems a coupon', async () => {
    // Get the first coupon
    const allCoupons = await program.account.coupon.all()
    const coupon = allCoupons[0]

    // Derive staked coupon PDA (to check it's not staked)
    const [stakedCouponPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('staked_coupon'), coupon.publicKey.toBuffer()],
      program.programId
    )

    await program.methods
      .redeemCoupon()
      .accounts({
        coupon: coupon.publicKey,
        deal: dealPda,
        merchant: merchant.publicKey,
        stakedCoupon: stakedCouponPda,
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
      .mintCoupon(dealPda, 'ipfs://test-metadata')
      .accounts({
        deal: dealPda,
        coupon: couponPda,
        mint: mintKeypair.publicKey,
        tokenAccount: userTokenAccount,
        metadata: metadataPda,
        userUsdcAccount,
        merchantUsdcAccount,
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

    // Derive staked coupon PDA (to check it's not staked)
    const [stakedCouponPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('staked_coupon'), couponPda.toBuffer()],
      program.programId
    )

    await program.methods
      .transferCoupon()
      .accounts({
        coupon: couponPda,
        currentOwner: user.publicKey,
        newOwner: newOwner,
        stakedCoupon: stakedCouponPda,
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
        .mintCoupon(dealPda, 'ipfs://test-metadata')
        .accounts({
          deal: dealPda,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          userUsdcAccount,
          merchantUsdcAccount,
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
    let sellerUsdcAccount: PublicKey
    let buyerUsdcAccount: PublicKey
    let platformUsdcAccount: PublicKey

    before(async () => {
      seller = Keypair.generate()
      buyer = Keypair.generate()

      // Airdrop SOL for transaction fees
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

      // Create USDC accounts for seller and buyer
      sellerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        seller.publicKey
      )
      buyerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        buyer.publicKey
      )

      // Create platform USDC account (using admin as platform for test)
      platformUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        provider.wallet.publicKey
      )

      const createAccountsTx = new Transaction()
        .add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            sellerUsdcAccount,
            seller.publicKey,
            usdcMint.publicKey
          )
        )
        .add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            buyerUsdcAccount,
            buyer.publicKey,
            usdcMint.publicKey
          )
        )

      // Only create platform account if it doesn't exist
      const platformAccountInfo = await provider.connection.getAccountInfo(platformUsdcAccount)
      if (!platformAccountInfo) {
        createAccountsTx.add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            platformUsdcAccount,
            provider.wallet.publicKey,
            usdcMint.publicKey
          )
        )
      }

      await provider.sendAndConfirm(createAccountsTx)

      // Mint USDC to seller (needs USDC to pay for coupon) and buyer
      const mintAmount = 1000 * 10 ** USDC_DECIMALS
      const mintUsdcTx = new Transaction()
        .add(
          createMintToInstruction(
            usdcMint.publicKey,
            sellerUsdcAccount,
            usdcMintAuthority.publicKey,
            mintAmount
          )
        )
        .add(
          createMintToInstruction(
            usdcMint.publicKey,
            buyerUsdcAccount,
            usdcMintAuthority.publicKey,
            mintAmount
          )
        )

      await provider.sendAndConfirm(mintUsdcTx, [usdcMintAuthority])

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
          userUsdcAccount: sellerUsdcAccount,
          merchantUsdcAccount,
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

      // Fetch coupon to get listing_count (should be 0 for new coupon)
      const couponData = await program.account.coupon.fetch(listingCouponPda)
      const listingCountBuffer = Buffer.alloc(4)
      listingCountBuffer.writeUInt32LE(couponData.listingCount)

      listingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), listingCouponPda.toBuffer(), listingCountBuffer],
        program.programId
      )[0]
    })

    it('Lists a coupon for sale', async () => {
      const price = new BN(50_000_000) // 0.05 SOL

      // Derive staked coupon PDA
      const [stakedCouponPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), listingCouponPda.toBuffer()],
        program.programId
      )

      await program.methods
        .listCoupon(price)
        .accounts({
          coupon: listingCouponPda,
          listing: listingPda,
          seller: seller.publicKey,
          systemProgram: SystemProgram.programId,
          stakedCoupon: stakedCouponPda,
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

      // Create USDC account for anotherSeller
      const anotherSellerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        anotherSeller.publicKey
      )

      const createAtaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          anotherSellerUsdcAccount,
          anotherSeller.publicKey,
          usdcMint.publicKey
        ),
        createMintToInstruction(
          usdcMint.publicKey,
          anotherSellerUsdcAccount,
          usdcMintAuthority.publicKey,
          1000 * 10 ** USDC_DECIMALS
        )
      )
      await provider.sendAndConfirm(createAtaTx, [usdcMintAuthority])

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
          userUsdcAccount: anotherSellerUsdcAccount,
          merchantUsdcAccount,
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

      // Fetch coupon to get listing_count
      const testCoupon = await program.account.coupon.fetch(couponPda)
      const testListingCountBuffer = Buffer.alloc(4)
      testListingCountBuffer.writeUInt32LE(testCoupon.listingCount)

      const testListingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer(), testListingCountBuffer],
        program.programId
      )[0]

      const [stakedCouponPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), couponPda.toBuffer()],
        program.programId
      )

      try {
        await program.methods
          .listCoupon(new BN(0))
          .accounts({
            coupon: couponPda,
            listing: testListingPda,
            seller: anotherSeller.publicKey,
            systemProgram: SystemProgram.programId,
            stakedCoupon: stakedCouponPda,
          })
          .signers([anotherSeller])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        assert.include(error.message, 'InvalidPrice')
      }
    })

    it('Buys a listed coupon and creates Sale PDA', async () => {
      // Get USDC balances before
      const sellerUsdcBefore = await provider.connection.getTokenAccountBalance(sellerUsdcAccount)
      const buyerUsdcBefore = await provider.connection.getTokenAccountBalance(buyerUsdcAccount)
      const platformUsdcBefore = await provider.connection.getTokenAccountBalance(platformUsdcAccount)

      const listing = await program.account.listing.fetch(listingPda)

      // Fetch coupon to get sale_count
      const couponForSale = await program.account.coupon.fetch(listingCouponPda)
      const saleCountBuffer = Buffer.alloc(4)
      saleCountBuffer.writeUInt32LE(couponForSale.saleCount)

      // Derive Sale PDA using counter-based system
      const [salePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('sale'),
          listingCouponPda.toBuffer(),
          saleCountBuffer
        ],
        program.programId
      )

      await program.methods
        .buyCoupon()
        .accounts({
          listing: listingPda,
          coupon: listingCouponPda,
          sale: salePda,
          buyerUsdcAccount,
          sellerUsdcAccount,
          platformUsdcAccount,
          seller: seller.publicKey,
          buyer: buyer.publicKey,
          platformWallet: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([buyer])
        .rpc()

      // Verify ownership transferred
      const boughtCoupon = await program.account.coupon.fetch(listingCouponPda)
      assert.equal(boughtCoupon.owner.toString(), buyer.publicKey.toString())

      // Verify listing closed (account no longer exists due to close = seller)
      try {
        await program.account.listing.fetch(listingPda)
        assert.fail('Listing should be closed and not exist')
      } catch (error) {
        assert.include(error.message, 'Account does not exist')
      }

      // Verify USDC payments (seller got 97.5%, platform got 2.5%)
      const sellerUsdcAfter = await provider.connection.getTokenAccountBalance(sellerUsdcAccount)
      const buyerUsdcAfter = await provider.connection.getTokenAccountBalance(buyerUsdcAccount)
      const platformUsdcAfter = await provider.connection.getTokenAccountBalance(platformUsdcAccount)

      const totalPrice = listing.priceLamports.toNumber()
      const platformFee = (totalPrice * 25) / 1000
      const sellerAmount = totalPrice - platformFee

      // Buyer paid full price
      assert.equal(
        Number(buyerUsdcBefore.value.amount) - Number(buyerUsdcAfter.value.amount),
        totalPrice,
        'Buyer should have paid full price'
      )

      // Seller received 97.5%
      assert.equal(
        Number(sellerUsdcAfter.value.amount) - Number(sellerUsdcBefore.value.amount),
        sellerAmount,
        'Seller should have received 97.5%'
      )

      // Platform received 2.5%
      assert.equal(
        Number(platformUsdcAfter.value.amount) - Number(platformUsdcBefore.value.amount),
        platformFee,
        'Platform should have received 2.5% fee'
      )

      // Verify Sale PDA was created with correct data
      const saleAccount = await program.account.sale.fetch(salePda)
      assert.equal(saleAccount.listing.toString(), listingPda.toString())
      assert.equal(saleAccount.coupon.toString(), listingCouponPda.toString())
      assert.equal(saleAccount.seller.toString(), seller.publicKey.toString())
      assert.equal(saleAccount.buyer.toString(), buyer.publicKey.toString())
      assert.equal(saleAccount.priceLamports.toString(), listing.priceLamports.toString())
      assert.isAbove(saleAccount.soldAt.toNumber(), 0)
    })

    it('Prevents buying inactive listing', async () => {
      // The listing was already bought and closed, so this should fail
      // With counter-based PDAs and close constraint, the listing account is closed after buy
      // So trying to buy again will fail with AccountNotInitialized

      // Fetch coupon to get current sale_count
      const couponForInactiveTest = await program.account.coupon.fetch(listingCouponPda)
      const saleCountBuffer = Buffer.alloc(4)
      saleCountBuffer.writeUInt32LE(couponForInactiveTest.saleCount)

      const [salePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('sale'),
          listingCouponPda.toBuffer(),
          saleCountBuffer
        ],
        program.programId
      )

      try {
        const merchantUsdcAccount = getAssociatedTokenAddressSync(
          usdcMint.publicKey,
          merchant.publicKey
        )

        await program.methods
          .buyCoupon()
          .accounts({
            listing: listingPda,  // This listing was closed, so account doesn't exist
            coupon: listingCouponPda,
            sale: salePda,
            buyerUsdcAccount: merchantUsdcAccount,
            sellerUsdcAccount,
            platformUsdcAccount,
            seller: seller.publicKey,
            buyer: merchant.publicKey,
            platformWallet: Keypair.generate().publicKey,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([merchant])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        // With close constraint, listing account is closed, so we get AccountNotInitialized
        assert.isTrue(
          error.message.includes('AccountNotInitialized') || error.message.includes('ListingInactive') || error.message.includes('Account does not exist'),
          'Should fail when trying to buy closed listing'
        )
      }
    })

    it('Queries Sale accounts by seller (Analytics)', async () => {
      // This test verifies the analytics query works correctly
      // Query all sales where the seller is our test seller
      const sellerSales = await program.account.sale.all([
        {
          memcmp: {
            offset: 8 + 32 + 32, // Skip discriminator + listing + coupon pubkeys
            bytes: seller.publicKey.toBase58(),
          },
        },
      ])

      // Should have at least 1 sale from the previous test
      assert.isAtLeast(sellerSales.length, 1)

      // Verify the sale data
      const sale = sellerSales[0].account
      assert.equal(sale.seller.toString(), seller.publicKey.toString())
      assert.equal(sale.buyer.toString(), buyer.publicKey.toString())
      assert.isAbove(sale.priceLamports.toNumber(), 0)
      assert.isAbove(sale.soldAt.toNumber(), 0)

      // Calculate marketplace revenue (this is what analytics does)
      let totalRevenue = new BN(0)
      sellerSales.forEach((saleData) => {
        totalRevenue = totalRevenue.add(new BN(saleData.account.priceLamports))
      })

      assert.isAbove(totalRevenue.toNumber(), 0)

      // Calculate fees (2.5%)
      const fees = totalRevenue.mul(new BN(25)).div(new BN(1000))
      const netEarnings = totalRevenue.sub(fees)

      assert.isAbove(fees.toNumber(), 0)
      assert.isAbove(netEarnings.toNumber(), 0)
      assert.isTrue(netEarnings.gt(fees)) // Net should be greater than fees
    })

    it('Delists a coupon', async () => {
      // Create another listing first
      const anotherSeller = Keypair.generate()
      const airdrop = await provider.connection.requestAirdrop(
        anotherSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdrop)

      // Create USDC account for anotherSeller
      const anotherSellerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        anotherSeller.publicKey
      )

      const createAtaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          anotherSellerUsdcAccount,
          anotherSeller.publicKey,
          usdcMint.publicKey
        ),
        createMintToInstruction(
          usdcMint.publicKey,
          anotherSellerUsdcAccount,
          usdcMintAuthority.publicKey,
          1000 * 10 ** USDC_DECIMALS
        )
      )
      await provider.sendAndConfirm(createAtaTx, [usdcMintAuthority])

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
          userUsdcAccount: anotherSellerUsdcAccount,
          merchantUsdcAccount,
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

      // Fetch coupon to get listing_count
      const delistCoupon = await program.account.coupon.fetch(couponPda)
      const delistListingCountBuffer = Buffer.alloc(4)
      delistListingCountBuffer.writeUInt32LE(delistCoupon.listingCount)

      const delistListingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer(), delistListingCountBuffer],
        program.programId
      )[0]

      const [stakedCouponPdaDelist] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), couponPda.toBuffer()],
        program.programId
      )

      // List it
      await program.methods
        .listCoupon(new BN(30_000_000))
        .accounts({
          coupon: couponPda,
          listing: delistListingPda,
          seller: anotherSeller.publicKey,
          systemProgram: SystemProgram.programId,
          stakedCoupon: stakedCouponPdaDelist,
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

      // With close constraint, listing account is closed after delist
      // Verify account no longer exists
      try {
        await program.account.listing.fetch(delistListingPda)
        assert.fail('Listing account should be closed')
      } catch (error) {
        assert.include(error.message, 'Account does not exist')
      }
    })

    it('Prevents non-owner from delisting', async () => {
      // First, create a fresh listing since the original listingPda was closed in the buy test
      const freshSeller = Keypair.generate()
      const airdrop = await provider.connection.requestAirdrop(
        freshSeller.publicKey,
        2 * anchor.web3.LAMPORTS_PER_SOL
      )
      await provider.connection.confirmTransaction(airdrop)

      // Create USDC account for freshSeller
      const freshSellerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        freshSeller.publicKey
      )

      const createAtaTx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          provider.wallet.publicKey,
          freshSellerUsdcAccount,
          freshSeller.publicKey,
          usdcMint.publicKey
        ),
        createMintToInstruction(
          usdcMint.publicKey,
          freshSellerUsdcAccount,
          usdcMintAuthority.publicKey,
          1000 * 10 ** USDC_DECIMALS
        )
      )
      await provider.sendAndConfirm(createAtaTx, [usdcMintAuthority])

      // Mint a fresh coupon
      dealAccount = await program.account.deal.fetch(dealPda)
      const freshMintKeypair = Keypair.generate()

      const freshCouponPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from('coupon'),
          dealPda.toBuffer(),
          dealAccount.currentSupply.toArrayLike(Buffer, 'le', 8),
        ],
        program.programId
      )[0]

      const freshUserTokenAccount = getAssociatedTokenAddressSync(
        freshMintKeypair.publicKey,
        freshSeller.publicKey
      )

      const [freshMetadataPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from('metadata'),
          new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(),
          freshMintKeypair.publicKey.toBuffer(),
        ],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
      )

      await program.methods
        .mintCoupon(dealPda, 'ipfs://test-metadata-fresh')
        .accounts({
          deal: dealPda,
          coupon: freshCouponPda,
          mint: freshMintKeypair.publicKey,
          tokenAccount: freshUserTokenAccount,
          metadata: freshMetadataPda,
          userUsdcAccount: freshSellerUsdcAccount,
          merchantUsdcAccount,
          merchant: merchant.publicKey,
          user: freshSeller.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        })
        .signers([freshSeller, freshMintKeypair])
        .rpc()

      // Create fresh listing
      const freshCouponData = await program.account.coupon.fetch(freshCouponPda)
      const freshListingCountBuffer = Buffer.alloc(4)
      freshListingCountBuffer.writeUInt32LE(freshCouponData.listingCount)

      const freshListingPda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), freshCouponPda.toBuffer(), freshListingCountBuffer],
        program.programId
      )[0]

      const [freshStakedCouponPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), freshCouponPda.toBuffer()],
        program.programId
      )

      await program.methods
        .listCoupon(new BN(30_000_000))
        .accounts({
          coupon: freshCouponPda,
          listing: freshListingPda,
          seller: freshSeller.publicKey,
          systemProgram: SystemProgram.programId,
          stakedCoupon: freshStakedCouponPda,
        })
        .signers([freshSeller])
        .rpc()

      // Now try to delist with wrong owner (merchant instead of freshSeller)
      try {
        await program.methods
          .delistCoupon()
          .accounts({
            listing: freshListingPda,
            coupon: freshCouponPda,
            seller: merchant.publicKey,
          })
          .signers([merchant])
          .rpc()

        assert.fail('Should have thrown error')
      } catch (error) {
        assert.isTrue(
          error.message.includes('NotOwner') || error.message.includes('ConstraintRaw'),
          'Should fail with NotOwner or ConstraintRaw error'
        )
      }
    })

    it('COMPREHENSIVE: Tests full relisting flow (mint → list → buy → relist → buy)', async () => {
      console.log('\n🧪 Testing Complete Relisting Flow\n')

      // Setup wallets
      const originalSeller = Keypair.generate()
      const firstBuyer = Keypair.generate()
      const secondBuyer = Keypair.generate()

      // Airdrop SOL
      await Promise.all([
        provider.connection.requestAirdrop(originalSeller.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
        provider.connection.requestAirdrop(firstBuyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
        provider.connection.requestAirdrop(secondBuyer.publicKey, 5 * anchor.web3.LAMPORTS_PER_SOL),
      ])
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Create USDC accounts for all participants
      const originalSellerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        originalSeller.publicKey
      )
      const firstBuyerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        firstBuyer.publicKey
      )
      const secondBuyerUsdcAccount = getAssociatedTokenAddressSync(
        usdcMint.publicKey,
        secondBuyer.publicKey
      )

      const createUsdcAccountsTx = new Transaction()
        .add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            originalSellerUsdcAccount,
            originalSeller.publicKey,
            usdcMint.publicKey
          ),
          createMintToInstruction(
            usdcMint.publicKey,
            originalSellerUsdcAccount,
            usdcMintAuthority.publicKey,
            1000 * 10 ** USDC_DECIMALS
          )
        )
        .add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            firstBuyerUsdcAccount,
            firstBuyer.publicKey,
            usdcMint.publicKey
          ),
          createMintToInstruction(
            usdcMint.publicKey,
            firstBuyerUsdcAccount,
            usdcMintAuthority.publicKey,
            1000 * 10 ** USDC_DECIMALS
          )
        )
        .add(
          createAssociatedTokenAccountInstruction(
            provider.wallet.publicKey,
            secondBuyerUsdcAccount,
            secondBuyer.publicKey,
            usdcMint.publicKey
          ),
          createMintToInstruction(
            usdcMint.publicKey,
            secondBuyerUsdcAccount,
            usdcMintAuthority.publicKey,
            1000 * 10 ** USDC_DECIMALS
          )
        )

      await provider.sendAndConfirm(createUsdcAccountsTx, [usdcMintAuthority])

      // Step 1: Mint a new coupon
      console.log('1️⃣  Minting coupon...')
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
        originalSeller.publicKey
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
        .mintCoupon(dealPda, 'ipfs://relisting-test')
        .accounts({
          deal: dealPda,
          coupon: couponPda,
          mint: mintKeypair.publicKey,
          tokenAccount: userTokenAccount,
          metadata: metadataPda,
          userUsdcAccount: originalSellerUsdcAccount,
          merchantUsdcAccount,
          merchant: merchant.publicKey,
          user: originalSeller.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'),
        })
        .signers([originalSeller, mintKeypair])
        .rpc()

      let couponAccount = await program.account.coupon.fetch(couponPda)
      assert.equal(couponAccount.listingCount, 0, 'Initial listing_count should be 0')
      assert.equal(couponAccount.saleCount, 0, 'Initial sale_count should be 0')
      console.log('✅ Coupon minted')

      // Step 2: List coupon for first time (listing #0)
      console.log('2️⃣  Listing coupon (listing #0)...')
      const listing0CountBuffer = Buffer.alloc(4)
      listing0CountBuffer.writeUInt32LE(0)

      const listing0Pda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer(), listing0CountBuffer],
        program.programId
      )[0]

      const [stakedCoupon0] = PublicKey.findProgramAddressSync(
        [Buffer.from('staked_coupon'), couponPda.toBuffer()],
        program.programId
      )

      await program.methods
        .listCoupon(new BN(100_000_000)) // 0.1 SOL
        .accounts({
          coupon: couponPda,
          listing: listing0Pda,
          seller: originalSeller.publicKey,
          systemProgram: SystemProgram.programId,
          stakedCoupon: stakedCoupon0,
        })
        .signers([originalSeller])
        .rpc()

      couponAccount = await program.account.coupon.fetch(couponPda)
      assert.equal(couponAccount.listingCount, 1, 'listing_count should increment to 1')
      console.log('✅ Listed (listing_count = 1)')

      // Step 3: First buyer purchases (sale #0)
      console.log('3️⃣  First buyer purchasing (sale #0)...')
      const sale0CountBuffer = Buffer.alloc(4)
      sale0CountBuffer.writeUInt32LE(0)

      const sale0Pda = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), couponPda.toBuffer(), sale0CountBuffer],
        program.programId
      )[0]

      await program.methods
        .buyCoupon()
        .accounts({
          listing: listing0Pda,
          coupon: couponPda,
          sale: sale0Pda,
          buyerUsdcAccount: firstBuyerUsdcAccount,
          sellerUsdcAccount: originalSellerUsdcAccount,
          platformUsdcAccount,
          seller: originalSeller.publicKey,
          buyer: firstBuyer.publicKey,
          platformWallet: merchant.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([firstBuyer])
        .rpc()

      couponAccount = await program.account.coupon.fetch(couponPda)
      assert.equal(couponAccount.owner.toString(), firstBuyer.publicKey.toString(), 'Ownership should transfer to first buyer')
      assert.equal(couponAccount.saleCount, 1, 'sale_count should increment to 1')
      console.log('✅ Purchased (sale_count = 1, owner = firstBuyer)')

      // Verify listing #0 was closed
      try {
        await program.account.listing.fetch(listing0Pda)
        assert.fail('Listing #0 should be closed')
      } catch (error) {
        assert.include(error.message, 'Account does not exist')
      }
      console.log('✅ Listing #0 closed')

      // Step 4: First buyer RELISTS the coupon (listing #1)
      console.log('4️⃣  Relisting coupon (listing #1)...')
      const listing1CountBuffer = Buffer.alloc(4)
      listing1CountBuffer.writeUInt32LE(1)

      const listing1Pda = PublicKey.findProgramAddressSync(
        [Buffer.from('listing'), couponPda.toBuffer(), listing1CountBuffer],
        program.programId
      )[0]

      await program.methods
        .listCoupon(new BN(150_000_000)) // 0.15 SOL (higher price)
        .accounts({
          coupon: couponPda,
          listing: listing1Pda,
          seller: firstBuyer.publicKey,
          systemProgram: SystemProgram.programId,
          stakedCoupon: stakedCoupon0,
        })
        .signers([firstBuyer])
        .rpc()

      couponAccount = await program.account.coupon.fetch(couponPda)
      assert.equal(couponAccount.listingCount, 2, 'listing_count should increment to 2')
      console.log('✅ Relisted successfully! (listing_count = 2)')

      // Step 5: Second buyer purchases the relisted coupon (sale #1)
      console.log('5️⃣  Second buyer purchasing relisted coupon (sale #1)...')
      const sale1CountBuffer = Buffer.alloc(4)
      sale1CountBuffer.writeUInt32LE(1)

      const sale1Pda = PublicKey.findProgramAddressSync(
        [Buffer.from('sale'), couponPda.toBuffer(), sale1CountBuffer],
        program.programId
      )[0]

      await program.methods
        .buyCoupon()
        .accounts({
          listing: listing1Pda,
          coupon: couponPda,
          sale: sale1Pda,
          buyerUsdcAccount: secondBuyerUsdcAccount,
          sellerUsdcAccount: firstBuyerUsdcAccount,
          platformUsdcAccount,
          seller: firstBuyer.publicKey,
          buyer: secondBuyer.publicKey,
          platformWallet: merchant.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([secondBuyer])
        .rpc()

      couponAccount = await program.account.coupon.fetch(couponPda)
      assert.equal(couponAccount.owner.toString(), secondBuyer.publicKey.toString(), 'Ownership should transfer to second buyer')
      assert.equal(couponAccount.saleCount, 2, 'sale_count should increment to 2')
      console.log('✅ Second purchase complete (sale_count = 2, owner = secondBuyer)')

      // Verify listing #1 was closed
      try {
        await program.account.listing.fetch(listing1Pda)
        assert.fail('Listing #1 should be closed')
      } catch (error) {
        assert.include(error.message, 'Account does not exist')
      }
      console.log('✅ Listing #1 closed')

      // Step 6: Verify both sale records exist
      console.log('6️⃣  Verifying sale records...')
      const sale0 = await program.account.sale.fetch(sale0Pda)
      assert.equal(sale0.seller.toString(), originalSeller.publicKey.toString())
      assert.equal(sale0.buyer.toString(), firstBuyer.publicKey.toString())
      assert.equal(sale0.saleNumber, 0)
      console.log('✅ Sale #0 record verified')

      const sale1 = await program.account.sale.fetch(sale1Pda)
      assert.equal(sale1.seller.toString(), firstBuyer.publicKey.toString())
      assert.equal(sale1.buyer.toString(), secondBuyer.publicKey.toString())
      assert.equal(sale1.saleNumber, 1)
      console.log('✅ Sale #1 record verified')

      console.log('\n🎉 RELISTING TEST PASSED! Counter-based PDAs work perfectly!\n')
    })
  })
})
