import { PrismaClient, SubscriptionTier, SubscriptionStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function upgradeUser(email: string, tier: SubscriptionTier, months: number) {
  try {
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.error(`User with email ${email} not found`)
      process.exit(1)
    }

    const startDate = new Date()
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)

    // Update Subscription table
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        tier,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate,
        updatedAt: new Date()
      },
      create: {
        userId: user.id,
        tier,
        status: SubscriptionStatus.ACTIVE,
        startDate,
        endDate
      }
    })

    // Update User table (for better-auth)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionTier: tier
      }
    })

    console.log(`Successfully upgraded user ${email} to ${tier}`)
    console.log(`Expires at: ${endDate.toISOString()}`)
    
  } catch (error) {
    console.error('Error upgrading user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Get args
const email = process.argv[2]
const tierStr = process.argv[3]?.toUpperCase()
const months = parseInt(process.argv[4] || '1')

if (!email || !tierStr) {
  console.log('Usage: tsx scripts/upgrade-user.ts <email> <tier> [months]')
  console.log('Example: tsx scripts/upgrade-user.ts user@example.com PRO 12')
  console.log('Or from root: pnpm --filter @kirimchat/backend exec tsx scripts/upgrade-user.ts user@example.com PRO 12')
  process.exit(1)
}

if (!Object.values(SubscriptionTier).includes(tierStr as SubscriptionTier)) {
  console.error(`Invalid tier. Available tiers: ${Object.values(SubscriptionTier).join(', ')}`)
  process.exit(1)
}

upgradeUser(email, tierStr as SubscriptionTier, months)