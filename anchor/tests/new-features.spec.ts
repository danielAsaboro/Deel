import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import BN from 'bn.js'
import { PublicKey, Keypair, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js'
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount
} from '@solana/spl-token'
import { assert } from 'chai'

describe('New Features: Loyalty Badges, User Profiles & Group Deals', () => {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  
  // Test accounts
  const merchant = Keypair.generate()
  const user1 = Keypair.generate()
  const user2 = Keypair.generate()
  const user3 = Keypair.generate()
  
  let usdcMint: PublicKey
  let dealPda: PublicKey
  let userProfilePda: PublicKey
  let loyaltyBadgePda: PublicKey
  let groupDealPda: PublicKey

  before(async () => {
    // Airdrop SOL to test accounts
    const airdropAmount = 10 * anchor.web3.LAMPORTS_PER_SOL
    
    await Promise.all([
      provider.connection.requestAirdrop(merchant.publicKey, airdropAmount),
      provider.connection.requestAirdrop(user1.publicKey, airdropAmount),
      provider.connection.requestAirdrop(user2.publicKey, airdropAmount),
      provider.connection.requestAirdrop(user3.publicKey, airdropAmount),
    ])

    // Wait for airdrops
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Create mock USDC mint
    usdcMint = await createMint(
      provider.connection,
      merchant,
      merchant.publicKey,
      null,
      6 // USDC has 6 decimals
    )

    console.log('✓ Test accounts funded')
    console.log('✓ Mock USDC mint created:', usdcMint.toString())
  })

  describe('1. User Profile System', () => {
    it('Initializes user profile', async () => {
      [userProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), user1.publicKey.toBuffer()],
        program.programId
      )

      const tx = await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile: userProfilePda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      console.log('  ✓ User profile initialized:', tx)

      const profile = await program.account.userProfile.fetch(userProfilePda)
      
      assert.equal(profile.user.toString(), user1.publicKey.toString())
      assert.equal(profile.dealsClaimed.toNumber(), 0)
      assert.equal(profile.badgesEarned, 0)
      assert.isTrue(profile.firstDealTimestamp.toNumber() > 0)
      
      console.log('  ✓ Profile data:', {
        dealsClaimed: profile.dealsClaimed.toNumber(),
        badgesEarned: profile.badgesEarned,
        firstDealTimestamp: new Date(profile.firstDealTimestamp.toNumber() * 1000).toISOString()
      })
    })

    it('Updates user profile on subsequent calls', async () => {
      const profileBefore = await program.account.userProfile.fetch(userProfilePda)
      
      await new Promise(resolve => setTimeout(resolve, 1000))

      await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile: userProfilePda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      const profileAfter = await program.account.userProfile.fetch(userProfilePda)
      
      assert.isTrue(profileAfter.lastActivityTimestamp.toNumber() > profileBefore.lastActivityTimestamp.toNumber())
      console.log('  ✓ Profile activity timestamp updated')
    })
  })

  describe('2. Loyalty Badge System', () => {
    it('Mints Bronze badge (type 1)', async () => {
      const badgeType = 1
      const badgeMint = Keypair.generate()
      
      [loyaltyBadgePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('loyalty_badge'), user1.publicKey.toBuffer(), Buffer.from([badgeType])],
        program.programId
      )

      const badgeTokenAccount = getAssociatedTokenAddressSync(
        badgeMint.publicKey,
        user1.publicKey
      )

      const tx = await program.methods
        .mintLoyaltyBadge(
          badgeType,
          'Bronze Achiever',
          'Claimed your first 5 deals'
        )
        .accounts({
          loyaltyBadge: loyaltyBadgePda,
          userProfile: userProfilePda,
          badgeMint: badgeMint.publicKey,
          badgeTokenAccount,
          user: user1.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1, badgeMint])
        .rpc()

      console.log('  ✓ Bronze badge minted:', tx)

      const badge = await program.account.loyaltyBadge.fetch(loyaltyBadgePda)
      
      assert.equal(badge.user.toString(), user1.publicKey.toString())
      assert.equal(badge.badgeType, 1)
      assert.equal(badge.title, 'Bronze Achiever')
      assert.equal(badge.description, 'Claimed your first 5 deals')
      
      const profile = await program.account.userProfile.fetch(userProfilePda)
      assert.equal(profile.badgesEarned, 1)
      
      console.log('  ✓ Badge data:', {
        type: badge.badgeType,
        title: badge.title,
        earnedAt: new Date(badge.earnedAt.toNumber() * 1000).toISOString()
      })
    })

    it('Mints Silver badge (type 2)', async () => {
      const badgeType = 2
      const badgeMint = Keypair.generate()
      
      const [silverBadgePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('loyalty_badge'), user1.publicKey.toBuffer(), Buffer.from([badgeType])],
        program.programId
      )

      const badgeTokenAccount = getAssociatedTokenAddressSync(
        badgeMint.publicKey,
        user1.publicKey
      )

      await program.methods
        .mintLoyaltyBadge(
          badgeType,
          'Silver Saver',
          'Saved over $100 with deals'
        )
        .accounts({
          loyaltyBadge: silverBadgePda,
          userProfile: userProfilePda,
          badgeMint: badgeMint.publicKey,
          badgeTokenAccount,
          user: user1.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user1, badgeMint])
        .rpc()

      const profile = await program.account.userProfile.fetch(userProfilePda)
      assert.equal(profile.badgesEarned, 2)
      
      console.log('  ✓ Silver badge minted, total badges:', profile.badgesEarned)
    })

    it('Rejects invalid badge type', async () => {
      const badgeType = 5 // Invalid (must be 1-4)
      const badgeMint = Keypair.generate()
      
      const [invalidBadgePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('loyalty_badge'), user1.publicKey.toBuffer(), Buffer.from([badgeType])],
        program.programId
      )

      const badgeTokenAccount = getAssociatedTokenAddressSync(
        badgeMint.publicKey,
        user1.publicKey
      )

      try {
        await program.methods
          .mintLoyaltyBadge(
            badgeType,
            'Invalid Badge',
            'Should not work'
          )
          .accounts({
            loyaltyBadge: invalidBadgePda,
            userProfile: userProfilePda,
            badgeMint: badgeMint.publicKey,
            badgeTokenAccount,
            user: user1.publicKey,
            rent: SYSVAR_RENT_PUBKEY,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user1, badgeMint])
          .rpc()
        
        assert.fail('Should have thrown error for invalid badge type')
      } catch (err) {
        assert.include(err.toString(), 'InvalidBadgeType')
        console.log('  ✓ Correctly rejected invalid badge type')
      }
    })
  })

  describe('3. Group Deals System', () => {
    before(async () => {
      // Create a regular deal first
      const title = 'Group Deal Test'
      
      ;[dealPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('deal'), merchant.publicKey.toBuffer(), Buffer.from(title)],
        program.programId
      )

      const expiryTimestamp = Math.floor(Date.now() / 1000) + 86400 * 7 // 7 days
      
      await program.methods
        .createDeal(
          title,
          'Amazing group deal - more buyers = better discount!',
          50, // 50% base discount
          100, // max supply
          new BN(expiryTimestamp),
          'Electronics',
          new BN(1000000) // 1 USDC (6 decimals)
        )
        .accounts({
          deal: dealPda,
          merchant: merchant.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([merchant])
        .rpc()

      console.log('  ✓ Base deal created for group deal testing')
    })

    it('Creates a group deal with tiered discounts', async () => {
      [groupDealPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_deal'), dealPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      )

      const expiryTimestamp = Math.floor(Date.now() / 1000) + 86400 * 3 // 3 days

      const tx = await program.methods
        .createGroupDeal(
          20, // target 20 participants
          5,  // tier1 threshold: 5 people
          10, // tier1 discount: 10%
          10, // tier2 threshold: 10 people
          20, // tier2 discount: 20%
          15, // tier3 threshold: 15 people
          30, // tier3 discount: 30%
          new BN(expiryTimestamp),
          new BN(5000000) // 5 USDC
        )
        .accounts({
          deal: dealPda,
          groupDeal: groupDealPda,
          creator: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      console.log('  ✓ Group deal created:', tx)

      const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
      
      assert.equal(groupDeal.deal.toString(), dealPda.toString())
      assert.equal(groupDeal.creator.toString(), user1.publicKey.toString())
      assert.equal(groupDeal.targetParticipants, 20)
      assert.equal(groupDeal.currentParticipants, 0)
      assert.equal(groupDeal.tier1Discount, 10)
      assert.equal(groupDeal.tier2Discount, 20)
      assert.equal(groupDeal.tier3Discount, 30)
      assert.isTrue(groupDeal.isActive)
      
      console.log('  ✓ Group deal config:', {
        target: groupDeal.targetParticipants,
        tier1: `${groupDeal.tier1Threshold} people = ${groupDeal.tier1Discount}%`,
        tier2: `${groupDeal.tier2Threshold} people = ${groupDeal.tier2Discount}%`,
        tier3: `${groupDeal.tier3Threshold} people = ${groupDeal.tier3Discount}%`,
      })
    })

    it('First user joins group deal', async () => {
      const [participantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .joinGroupDeal()
        .accounts({
          groupDeal: groupDealPda,
          participant: participantPda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
      assert.equal(groupDeal.currentParticipants, 1)
      
      const participant = await program.account.groupParticipant.fetch(participantPda)
      assert.equal(participant.participant.toString(), user1.publicKey.toString())
      assert.isFalse(participant.hasClaimed)
      
      console.log('  ✓ User 1 joined (1/20 participants)')
    })

    it('Second and third users join', async () => {
      // User 2 joins
      const [participant2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user2.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .joinGroupDeal()
        .accounts({
          groupDeal: groupDealPda,
          participant: participant2Pda,
          user: user2.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc()

      // User 3 joins
      const [participant3Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user3.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .joinGroupDeal()
        .accounts({
          groupDeal: groupDealPda,
          participant: participant3Pda,
          user: user3.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user3])
        .rpc()

      const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
      assert.equal(groupDeal.currentParticipants, 3)
      
      console.log('  ✓ Users 2 & 3 joined (3/20 participants)')
    })

    it('Cannot claim before threshold is met', async () => {
      const [participantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      )

      try {
        await program.methods
          .claimGroupDealCoupon()
          .accounts({
            groupDeal: groupDealPda,
            participant: participantPda,
            user: user1.publicKey,
          })
          .signers([user1])
          .rpc()
        
        assert.fail('Should not allow claim before threshold')
      } catch (err) {
        assert.include(err.toString(), 'GroupThresholdNotMet')
        console.log('  ✓ Correctly blocked claim (need 5 people, have 3)')
      }
    })

    it('Simulates reaching tier 1 threshold (5 people)', async () => {
      // Add 2 more users to reach tier 1 threshold
      const tempUsers = [Keypair.generate(), Keypair.generate()]
      
      for (const tempUser of tempUsers) {
        await provider.connection.requestAirdrop(tempUser.publicKey, anchor.web3.LAMPORTS_PER_SOL)
        await new Promise(resolve => setTimeout(resolve, 500))
        
        const [participantPda] = PublicKey.findProgramAddressSync(
          [Buffer.from('group_participant'), groupDealPda.toBuffer(), tempUser.publicKey.toBuffer()],
          program.programId
        )

        await program.methods
          .joinGroupDeal()
          .accounts({
            groupDeal: groupDealPda,
            participant: participantPda,
            user: tempUser.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .signers([tempUser])
          .rpc()
      }

      const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
      assert.equal(groupDeal.currentParticipants, 5)
      
      console.log('  ✓ Tier 1 threshold reached! (5/20 participants)')
      console.log('  ✓ Unlocked discount: 10%')
    })

    it('Claims coupon at tier 1 discount', async () => {
      const [participantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .claimGroupDealCoupon()
        .accounts({
          groupDeal: groupDealPda,
          participant: participantPda,
          user: user1.publicKey,
        })
        .signers([user1])
        .rpc()

      const participant = await program.account.groupParticipant.fetch(participantPda)
      assert.isTrue(participant.hasClaimed)
      
      console.log('  ✓ User 1 claimed group deal coupon with 10% discount!')
    })

    it('Cannot claim twice', async () => {
      const [participantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      )

      try {
        await program.methods
          .claimGroupDealCoupon()
          .accounts({
            groupDeal: groupDealPda,
            participant: participantPda,
            user: user1.publicKey,
          })
          .signers([user1])
          .rpc()
        
        assert.fail('Should not allow double claim')
      } catch (err) {
        assert.include(err.toString(), 'AlreadyRedeemed')
        console.log('  ✓ Correctly blocked double claim')
      }
    })
  })

  describe('4. Integration Test: Complete User Journey', () => {
    it('New user: Profile → Deal → Badge → Group Deal', async () => {
      const newUser = Keypair.generate()
      await provider.connection.requestAirdrop(newUser.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL)
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('\n  🚀 NEW USER JOURNEY TEST')
      console.log('  ========================')

      // Step 1: Initialize profile
      const [newProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('user_profile'), newUser.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile: newProfilePda,
          user: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc()

      console.log('  ✓ Step 1: User profile created')

      // Step 2: Join existing group deal
      const [newParticipantPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('group_participant'), groupDealPda.toBuffer(), newUser.publicKey.toBuffer()],
        program.programId
      )

      await program.methods
        .joinGroupDeal()
        .accounts({
          groupDeal: groupDealPda,
          participant: newParticipantPda,
          user: newUser.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([newUser])
        .rpc()

      const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
      console.log(`  ✓ Step 2: Joined group deal (${groupDeal.currentParticipants}/20)`)

      // Step 3: Earn first badge
      const badgeType = 1
      const badgeMint = Keypair.generate()
      
      const [newBadgePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('loyalty_badge'), newUser.publicKey.toBuffer(), Buffer.from([badgeType])],
        program.programId
      )

      const badgeTokenAccount = getAssociatedTokenAddressSync(
        badgeMint.publicKey,
        newUser.publicKey
      )

      await program.methods
        .mintLoyaltyBadge(
          badgeType,
          'First Timer',
          'Welcome to the platform!'
        )
        .accounts({
          loyaltyBadge: newBadgePda,
          userProfile: newProfilePda,
          badgeMint: badgeMint.publicKey,
          badgeTokenAccount,
          user: newUser.publicKey,
          rent: SYSVAR_RENT_PUBKEY,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([newUser, badgeMint])
        .rpc()

      console.log('  ✓ Step 3: Earned Bronze "First Timer" badge')

      // Verify final state
      const finalProfile = await program.account.userProfile.fetch(newProfilePda)
      const badge = await program.account.loyaltyBadge.fetch(newBadgePda)
      
      console.log('\n  📊 FINAL USER STATS:')
      console.log('  -------------------')
      console.log('  Badges earned:', finalProfile.badgesEarned)
      console.log('  Latest badge:', badge.title)
      console.log('  Group deals joined: 1')
      console.log('  ✅ COMPLETE USER JOURNEY SUCCESSFUL!\n')
      
      assert.equal(finalProfile.badgesEarned, 1)
      assert.equal(badge.badgeType, 1)
    })
  })
})

