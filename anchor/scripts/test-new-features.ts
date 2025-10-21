import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Basic } from '../target/types/basic'
import { PublicKey, Keypair, SystemProgram } from '@solana/web3.js'

/**
 * Simple smoke test for new features - just ensures accounts can be created
 */
async function main() {
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Basic as Program<Basic>
  const user = provider.wallet as anchor.Wallet

  console.log('\n🧪 Testing New Features Integration\n')
  console.log('Program ID:', program.programId.toString())
  console.log('User:', user.publicKey.toString())
  console.log('')

  try {
    // Test 1: Initialize User Profile
    console.log('1️⃣  Testing User Profile...')
    const [userProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from('user_profile'), user.publicKey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .initializeUserProfile()
        .accounts({
          userProfile: userProfilePda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log('   ✅ User profile created:', userProfilePda.toString())
    } catch (e) {
      if (e.toString().includes('already in use')) {
        console.log('   ✅ User profile already exists (OK)')
      } else {
        throw e
      }
    }

    const profile = await program.account.userProfile.fetch(userProfilePda)
    console.log('   📊 Profile stats:')
    console.log('      - Deals claimed:', profile.dealsClaimed.toNumber())
    console.log('      - Badges earned:', profile.badgesEarned)
    console.log('      - First deal:', new Date(profile.firstDealTimestamp.toNumber() * 1000).toISOString())

    // Test 2: Create a Group Deal (requires a base deal first)
    console.log('\n2️⃣  Testing Group Deals...')
    
    const dealTitle = `Test Deal ${Date.now()}`
    const [dealPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('deal'), user.publicKey.toBuffer(), Buffer.from(dealTitle)],
      program.programId
    )

    const expiryTimestamp = Math.floor(Date.now() / 1000) + 86400 * 7
    
    try {
      await program.methods
        .createDeal(
          dealTitle,
          'Test deal for group buying',
          50,
          100,
          new anchor.BN(expiryTimestamp),
          'Test',
          new anchor.BN(1000000)
        )
        .accounts({
          deal: dealPda,
          merchant: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log('   ✅ Base deal created:', dealPda.toString())
    } catch (e) {
      if (e.toString().includes('already in use')) {
        console.log('   ✅ Deal already exists (OK)')
      } else {
        throw e
      }
    }

    const [groupDealPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('group_deal'), dealPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    )

    const groupExpiryTimestamp = Math.floor(Date.now() / 1000) + 86400 * 3

    try {
      await program.methods
        .createGroupDeal(
          20,  // target 20 participants
          5,   // tier1: 5 people = 10%
          10,
          10,  // tier2: 10 people = 20%
          20,
          15,  // tier3: 15 people = 30%
          30,
          new anchor.BN(groupExpiryTimestamp),
          new anchor.BN(5000000)
        )
        .accounts({
          deal: dealPda,
          groupDeal: groupDealPda,
          creator: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log('   ✅ Group deal created:', groupDealPda.toString())
    } catch (e) {
      if (e.toString().includes('already in use')) {
        console.log('   ✅ Group deal already exists (OK)')
      } else {
        throw e
      }
    }

    const groupDeal = await program.account.groupDeal.fetch(groupDealPda)
    console.log('   📊 Group deal config:')
    console.log('      - Target participants:', groupDeal.targetParticipants)
    console.log('      - Current participants:', groupDeal.currentParticipants)
    console.log('      - Tier 1:', `${groupDeal.tier1Threshold} people = ${groupDeal.tier1Discount}%`)
    console.log('      - Tier 2:', `${groupDeal.tier2Threshold} people = ${groupDeal.tier2Discount}%`)
    console.log('      - Tier 3:', `${groupDeal.tier3Threshold} people = ${groupDeal.tier3Discount}%`)
    console.log('      - Status:', groupDeal.isActive ? 'Active' : 'Inactive')

    // Test 3: Join the group deal
    console.log('\n3️⃣  Testing Group Deal Participation...')
    
    const [participantPda] = PublicKey.findProgramAddressSync(
      [Buffer.from('group_participant'), groupDealPda.toBuffer(), user.publicKey.toBuffer()],
      program.programId
    )

    try {
      await program.methods
        .joinGroupDeal()
        .accounts({
          groupDeal: groupDealPda,
          participant: participantPda,
          user: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      console.log('   ✅ Joined group deal:', participantPda.toString())
    } catch (e) {
      if (e.toString().includes('already in use')) {
        console.log('   ✅ Already participating (OK)')
      } else {
        throw e
      }
    }

    const participant = await program.account.groupParticipant.fetch(participantPda)
    const updatedGroupDeal = await program.account.groupDeal.fetch(groupDealPda)
    console.log('   📊 Participation:')
    console.log('      - Joined at:', new Date(participant.joinedAt.toNumber() * 1000).toISOString())
    console.log('      - Has claimed:', participant.hasClaimed)
    console.log('      - Total participants:', updatedGroupDeal.currentParticipants)

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('✅ ALL NEW FEATURES WORKING!')
    console.log('='.repeat(60))
    console.log('\n✨ Successfully tested:')
    console.log('   ✓ User Profiles (on-chain user stats)')
    console.log('   ✓ Group Deals (tiered discount campaigns)')
    console.log('   ✓ Group Participation (join and track)')
    console.log('\n💡 Next: Test loyalty badges via UI or separate script')
    console.log('   (Badge minting requires NFT creation which is best done via UI)\n')

  } catch (error) {
    console.error('\n❌ Error:', error)
    process.exit(1)
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error)
    process.exit(1)
  }
)


