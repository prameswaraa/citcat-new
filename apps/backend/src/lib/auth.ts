import { betterAuth } from "better-auth"
import { createAuthMiddleware } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"
import { emailService } from "../services/email/EmailService.js"

const prisma = new PrismaClient()

// Helper to check if user was just created (within last 60 seconds)
function isNewUser(createdAt: Date | string | null | undefined): boolean {
  if (!createdAt) return false
  const created = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - created.getTime()
  // Increased to 60 seconds to account for OAuth flow delays
  return diffMs < 60000 // 60 seconds threshold
}

// Track users who have received welcome email to prevent duplicates
const welcomeEmailSent = new Set<string>()

// Helper to create audit log
async function createAuditLog(
  action: string,
  entityType: string,
  entityId: string,
  details?: Record<string, unknown>,
  userId?: string,
  ipAddress?: string
) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        details: details ? JSON.stringify(details) : undefined,
        userId,
        ipAddress
      }
    })
  } catch (error) {
    console.error('Failed to create audit log:', error)
  }
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql"
  }),
  
  // Database hooks for detecting new user creation
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          console.log('[Database Hook] New user created:', user.email, '| Provider detection pending')
          
          // Create FREE subscription for new OAuth users
          try {
            const existingSubscription = await prisma.subscription.findUnique({
              where: { userId: user.id }
            })
            
            if (!existingSubscription) {
              await prisma.subscription.create({
                data: {
                  userId: user.id,
                  tier: 'FREE',
                  status: 'ACTIVE',
                  startDate: new Date(),
                  endDate: null, // FREE plan has no expiry
                  autoRenewEnabled: false
                }
              })
              console.log('[Database Hook] FREE subscription created for user:', user.email)
            }
          } catch (error) {
            console.error('[Database Hook] Failed to create subscription:', error)
          }
          
          // Check if this user was created via OAuth by checking accounts
          // We'll send welcome email here for all new users
          // The hook is called after user is created in database
          
          // Prevent duplicate emails using the Set
          if (!welcomeEmailSent.has(user.id)) {
            welcomeEmailSent.add(user.id)
            
            console.log('[Database Hook] Sending welcome email to new user:', user.email)
            emailService.sendWelcomeEmail({
              to: user.email,
              userName: user.name || 'Pengguna',
            }).then(() => {
              console.log('[Database Hook] Welcome email sent successfully to:', user.email)
              // Clean up after 5 minutes
              setTimeout(() => welcomeEmailSent.delete(user.id), 5 * 60 * 1000)
            }).catch((error) => {
              console.error('[Database Hook] Failed to send welcome email:', error)
              welcomeEmailSent.delete(user.id) // Allow retry on failure
            })
          }
        }
      }
    }
  },
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3005",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true, // Auto sign in after registration
    sendResetPasswordEmail: undefined, // Disable password reset
    // Use bcrypt for password hashing (compatible with OTP registration flow)
    password: {
      hash: async (password) => {
        return await bcrypt.hash(password, 12)
      },
      verify: async ({ hash, password }) => {
        return await bcrypt.compare(password, hash)
      }
    }
  },

  // Google OAuth Provider
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      // Enable account linking - allow linking Google to existing email/password accounts
      enabled: true,
    },
  },

  // Account linking configuration
  account: {
    accountLinking: {
      enabled: true, // Allow linking OAuth accounts to existing users
      trustedProviders: ["google"], // Trust Google for auto-linking
    },
  },

  // Registration is now ENABLED
  // onRequest hook removed to allow sign-up
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 24 hours
    cookieCache: {
      enabled: false,
      maxAge: 60 * 60 * 24 * 7,
    }
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "BUSINESS_OWNER",
      },
      subscriptionTier: {
        type: "string",
        required: false,
        defaultValue: "FREE",
      },
      // NOTE: whatsappAccountCount dan hasConnectedWhatsApp adalah computed fields
      // yang dihitung dari relasi whatsappAccounts, bukan disimpan di database
    },
  },
  trustedOrigins: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(",").map(origin => origin.trim())
    : [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://kirim.chat",
        "https://api.kirim.chat"
      ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,  // Always enable for cross-subdomain support
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    },
    // Use secure cookies in production
    useSecureCookies: process.env.NODE_ENV === 'production',
  },
  
  // Hooks for audit logging
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      const ip = ctx.headers?.get('x-forwarded-for')?.split(',')[0]?.trim()
        || ctx.headers?.get('x-real-ip')
        || 'unknown'
      
      // Debug logging for all paths with sessions
      if (ctx.context.newSession) {
        console.log('[Auth Hook] Path:', ctx.path, '| User:', ctx.context.newSession.user?.email)
      }
      
      // Log successful sign-in
      if (ctx.path === "/sign-in/email" && ctx.context.newSession) {
        const user = ctx.context.newSession.user
        await createAuditLog(
          'LOGIN_SUCCESS',
          'User',
          user.id,
          { email: user.email, provider: 'email' },
          user.id,
          ip
        )
      }
      
      // Log successful sign-up (welcome email is sent via databaseHooks)
      if (ctx.path === "/sign-up/email" && ctx.context.newSession) {
        const user = ctx.context.newSession.user
        await createAuditLog(
          'USER_REGISTERED',
          'User',
          user.id,
          { email: user.email, provider: 'email' },
          user.id,
          ip
        )
      }
      
      // Log Google OAuth sign-in/sign-up (welcome email for new users is sent via databaseHooks)
      const isGoogleCallback = ctx.path?.includes('google') || ctx.path?.includes('callback')
      if (isGoogleCallback && ctx.context.newSession) {
        const user = ctx.context.newSession.user
        const isFirstTimeUser = isNewUser(user.createdAt)
        
        console.log('[Google OAuth] Path:', ctx.path, '| User:', user.email, '| isNewUser:', isFirstTimeUser, '| createdAt:', user.createdAt)
        
        await createAuditLog(
          isFirstTimeUser ? 'USER_REGISTERED' : 'LOGIN_SUCCESS',
          'User',
          user.id,
          { email: user.email, provider: 'google', isNewUser: isFirstTimeUser },
          user.id,
          ip
        )
      }
      
      // Log failed sign-in (check if returned has error)
      if (ctx.path === "/sign-in/email" && !ctx.context.newSession) {
        const body = ctx.body as { email?: string } | undefined
        const email = body?.email || 'unknown'
        await createAuditLog(
          'LOGIN_FAILED',
          'User',
          email,
          { email, reason: 'Invalid credentials or account not found', provider: 'email' },
          undefined,
          ip
        )
      }
      
      // Log sign-out
      if (ctx.path === "/sign-out") {
        const session = ctx.context.session
        if (session?.user) {
          await createAuditLog(
            'LOGOUT',
            'User',
            session.user.id,
            { email: session.user.email },
            session.user.id,
            ip
          )
        }
      }
    }),
  },
})
