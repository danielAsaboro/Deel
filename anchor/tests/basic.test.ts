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
  })
})
