import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/database.js';
import { emailService } from './email/EmailService.js';
import { teamService } from './team-service.js';
import { invitationEmailTemplate } from './email/templates/index.js';
import { PLAN_LIMITS } from '../config/plans.js';

/**
 * Invitation status enum (mirrors Prisma enum)
 */
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED' | 'FAILED';

/**
 * Invitation with business owner details
 */
export interface InvitationWithOwner {
  id: string;
  businessOwnerId: string;
  email: string;
  token: string;
  status: InvitationStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  cancelledAt: Date | null;
  emailSentAt: Date | null;
  emailError: string | null;
  createdAt: Date;
  businessOwner: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * User data for accepting invitation (new user)
 */
export interface AcceptInvitationUserData {
  name: string;
  password: string;
}

/**
 * Get agent limit from centralized PLAN_LIMITS config
 * This ensures consistency across the application
 */
function getAgentLimitFromPlan(tier: string): number {
  const planLimit = PLAN_LIMITS[tier as keyof typeof PLAN_LIMITS];
  return planLimit?.maxTeamMembers ?? 0;
}

/**
 * Maximum pending invitations per business owner
 */
const MAX_PENDING_INVITATIONS = 10;

/**
 * Invitation expiry in days
 */
const INVITATION_EXPIRY_DAYS = 7;


/**
 * InvitationService
 * 
 * Handles agent invitation lifecycle: creation, validation, acceptance, and cancellation.
 * Integrates with email service for sending invitation emails.
 * 
 * Requirements: 2.1, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class InvitationService {
  /**
   * Generate a secure invitation token
   * Uses crypto.randomBytes for cryptographic security
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

/**
   * Get agent limit for a subscription tier
   * Uses centralized PLAN_LIMITS from config/plans.ts
   */
  getAgentLimit(tier: string): number {
    return getAgentLimitFromPlan(tier);
  }

  /**
   * Check if business owner can invite more agents
   * 
   * @param businessOwnerId - The business owner's user ID
   * @returns Object with canInvite flag and limit info
   * Requirements: 7.1, 7.2
   */
  async checkAgentLimit(businessOwnerId: string): Promise<{
    canInvite: boolean;
    currentCount: number;
    limit: number;
    tier: string;
  }> {
    const user = await prisma.user.findUnique({
      where: { id: businessOwnerId },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier ?? 'FREE';
    const limit = this.getAgentLimit(tier);
    const currentCount = await teamService.getActiveAgentCount(businessOwnerId);

    return {
      canInvite: currentCount < limit,
      currentCount,
      limit,
      tier,
    };
  }

  /**
   * Create and send an invitation
   * 
   * @param businessOwnerId - The business owner's user ID
   * @param email - The invitee's email address
   * @returns The created invitation
   * @throws Error if limit reached, duplicate invitation, or email fails
   * Requirements: 2.1, 2.2, 2.3, 2.4
   */
  async createInvitation(businessOwnerId: string, email: string): Promise<InvitationWithOwner> {
    const normalizedEmail = email.toLowerCase().trim();

    // Check agent limit
    const limitCheck = await this.checkAgentLimit(businessOwnerId);
    if (!limitCheck.canInvite) {
      throw new Error('AGENT_LIMIT_REACHED');
    }

    // Check pending invitations limit
    const pendingCount = await prisma.invitation.count({
      where: {
        businessOwnerId,
        status: 'PENDING',
      },
    });

    if (pendingCount >= MAX_PENDING_INVITATIONS) {
      throw new Error('MAX_PENDING_INVITATIONS_REACHED');
    }

    // Check for existing invitation to same email
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        businessOwnerId,
        email: normalizedEmail,
      },
    });

    if (existingInvitation) {
      // If pending, don't allow duplicate
      if (existingInvitation.status === 'PENDING') {
        throw new Error('INVITATION_EXISTS');
      }

      // If cancelled, expired, or failed - delete old record to allow re-invite
      if (['CANCELLED', 'EXPIRED', 'FAILED'].includes(existingInvitation.status)) {
        await prisma.invitation.delete({
          where: { id: existingInvitation.id },
        });
      }

      // If accepted, user is already an agent (will be caught by ALREADY_AGENT check below)
    }

    // Check if email is already an active agent of this business owner
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          agentUserId: existingUser.id,
          businessOwnerId,
          status: 'ACTIVE',
        },
      });

      if (existingMembership) {
        throw new Error('ALREADY_AGENT');
      }
    }

    // Get business owner details for email
    const businessOwner = await prisma.user.findUnique({
      where: { id: businessOwnerId },
      select: { id: true, name: true, email: true },
    });

    if (!businessOwner) {
      throw new Error('BUSINESS_OWNER_NOT_FOUND');
    }

    // Generate token and expiry
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        businessOwnerId,
        email: normalizedEmail,
        token,
        status: 'PENDING',
        expiresAt,
      },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send invitation email
    try {
      await this.sendInvitationEmail(invitation);

      // Update email sent timestamp
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { emailSentAt: new Date() },
      });
    } catch (error) {
      // Mark as failed if email fails
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'FAILED',
          emailError: error instanceof Error ? error.message : 'Email send failed',
        },
      });
      throw new Error('EMAIL_SEND_FAILED');
    }

    return invitation as InvitationWithOwner;
  }


  /**
   * Send invitation email
   */
  private async sendInvitationEmail(invitation: InvitationWithOwner): Promise<void> {
    // Include locale prefix in the invitation link (default to 'en')
    const locale = process.env.DEFAULT_LOCALE || 'en';
    const invitationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/${locale}/accept-invitation?token=${invitation.token}`;

    const template = invitationEmailTemplate({
      businessOwnerName: invitation.businessOwner.name,
      inviteeEmail: invitation.email,
      invitationLink,
      expiresAt: invitation.expiresAt,
    });

    const result = await emailService.send({
      to: invitation.email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to send email');
    }
  }

  /**
   * Validate an invitation token
   * 
   * @param token - The invitation token
   * @returns The invitation if valid, null otherwise
   * Requirements: 3.1, 3.2
   */
  async validateToken(token: string): Promise<InvitationWithOwner | null> {
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invitation) {
      return null;
    }

    // Check if expired
    if (new Date() > invitation.expiresAt) {
      // Update status to expired if not already
      if (invitation.status === 'PENDING') {
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: 'EXPIRED' },
        });
      }
      return null;
    }

    // Only return if pending
    if (invitation.status !== 'PENDING') {
      return null;
    }

    return invitation as InvitationWithOwner;
  }

  /**
   * Accept an invitation
   * Creates a new user or links existing user as agent
   * 
   * @param token - The invitation token
   * @param userData - Optional user data for new user registration
   * @returns The created/linked user
   * Requirements: 3.3, 3.4, 3.5
   */
  async acceptInvitation(
    token: string,
    userData?: AcceptInvitationUserData
  ): Promise<{ userId: string; isNewUser: boolean }> {
    const invitation = await this.validateToken(token);

    if (!invitation) {
      throw new Error('INVITATION_INVALID');
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    let userId: string;
    let isNewUser = false;

    if (existingUser) {
      // Link existing user as agent
      // Check if already an agent of another business owner
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          agentUserId: existingUser.id,
          status: 'ACTIVE',
        },
      });

      if (existingMembership) {
        throw new Error('ALREADY_AGENT_OF_ANOTHER');
      }

      // Update user role to AGENT if not already
      if (existingUser.role !== 'AGENT') {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: { role: 'AGENT' },
        });
      }

      userId = existingUser.id;
    } else {
      // Create new user
      if (!userData) {
        throw new Error('USER_DATA_REQUIRED');
      }

      // Hash password using bcrypt
      const passwordHash = await bcrypt.hash(userData.password, 10);

      const newUser = await prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            email: invitation.email,
            name: userData.name,
            role: 'AGENT',
            emailVerified: true, // Verified via invitation
            emailVerifiedAt: new Date(),
          },
        });

        // Create account with password
        await tx.account.create({
          data: {
            id: `acc_${createdUser.id}`,
            userId: createdUser.id,
            accountId: createdUser.id,
            providerId: 'credential',
            password: passwordHash,
          },
        });

        // Create FREE subscription for new user
        await tx.subscription.create({
          data: {
            userId: createdUser.id,
            tier: 'FREE',
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: null, // FREE plan has no expiry
            autoRenewEnabled: false
          }
        });

        return createdUser;
      });

      userId = newUser.id;
      isNewUser = true;
    }

    // Create team member record
    await prisma.teamMember.create({
      data: {
        businessOwnerId: invitation.businessOwnerId,
        agentUserId: userId,
        status: 'ACTIVE',
        joinedAt: new Date(),
      },
    });

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      },
    });

    return { userId, isNewUser };
  }


  /**
   * Cancel an invitation
   * 
   * @param businessOwnerId - The business owner's user ID
   * @param invitationId - The invitation ID
   * Requirements: 4.5
   */
  async cancelInvitation(businessOwnerId: string, invitationId: string): Promise<void> {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        businessOwnerId,
        status: 'PENDING',
      },
    });

    if (!invitation) {
      throw new Error('INVITATION_NOT_FOUND');
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  }

  /**
   * Resend an invitation email
   * 
   * @param businessOwnerId - The business owner's user ID
   * @param invitationId - The invitation ID
   * Requirements: 2.5
   */
  async resendInvitation(businessOwnerId: string, invitationId: string): Promise<void> {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        businessOwnerId,
        status: { in: ['PENDING', 'FAILED'] },
      },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!invitation) {
      throw new Error('INVITATION_NOT_FOUND');
    }

    // Generate new token and extend expiry
    const newToken = this.generateToken();
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + INVITATION_EXPIRY_DAYS);

    // Update invitation with new token
    const updatedInvitation = await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        token: newToken,
        expiresAt: newExpiresAt,
        status: 'PENDING',
        emailError: null,
      },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send email
    try {
      await this.sendInvitationEmail(updatedInvitation as InvitationWithOwner);

      await prisma.invitation.update({
        where: { id: invitationId },
        data: { emailSentAt: new Date() },
      });
    } catch (error) {
      await prisma.invitation.update({
        where: { id: invitationId },
        data: {
          status: 'FAILED',
          emailError: error instanceof Error ? error.message : 'Email send failed',
        },
      });
      throw new Error('EMAIL_SEND_FAILED');
    }
  }

  /**
   * Get pending invitations for a business owner
   * 
   * @param businessOwnerId - The business owner's user ID
   * @returns Array of pending invitations
   * Requirements: 4.4
   */
  async getPendingInvitations(businessOwnerId: string): Promise<InvitationWithOwner[]> {
    const invitations = await prisma.invitation.findMany({
      where: {
        businessOwnerId,
        status: { in: ['PENDING', 'FAILED'] },
      },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invitations as InvitationWithOwner[];
  }

  /**
   * Cleanup expired invitations
   * Should be called by a cron job
   */
  async cleanupExpiredInvitations(): Promise<number> {
    const result = await prisma.invitation.updateMany({
      where: {
        status: 'PENDING',
        expiresAt: { lt: new Date() },
      },
      data: {
        status: 'EXPIRED',
      },
    });

    return result.count;
  }

  /**
   * Get invitation by ID
   * 
   * @param invitationId - The invitation ID
   * @param businessOwnerId - The business owner's user ID (for authorization)
   */
  async getInvitationById(
    invitationId: string,
    businessOwnerId: string
  ): Promise<InvitationWithOwner | null> {
    const invitation = await prisma.invitation.findFirst({
      where: {
        id: invitationId,
        businessOwnerId,
      },
      include: {
        businessOwner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return invitation as InvitationWithOwner | null;
  }

  /**
   * Check if a user with the given email already exists and their auth method
   * Used to determine whether to show login prompt, password form, or OAuth button
   * 
   * @param email - The email to check
   * @returns Object with exists flag and hasPassword flag, or null if user doesn't exist
   * Requirements: 3.4
   */
  async checkUserAuthInfo(email: string): Promise<{
    exists: boolean;
    hasPassword: boolean;
  }> {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        accounts: {
          select: {
            providerId: true,
            password: true,
          }
        }
      },
    });

    if (!user) {
      return { exists: false, hasPassword: false };
    }

    // Check if user has a credential account with password
    const hasPassword = user.accounts.some(
      account => account.providerId === 'credential' && account.password
    );

    return { exists: true, hasPassword };
  }

  /**
   * Check if a user with the given email already exists
   * Used to determine whether to show login prompt or registration form
   * 
   * @param email - The email to check
   * @returns true if user exists, false otherwise
   * Requirements: 3.4
   * @deprecated Use checkUserAuthInfo instead for more detailed auth info
   */
  async checkUserExists(email: string): Promise<boolean> {
    const result = await this.checkUserAuthInfo(email);
    return result.exists;
  }
}

// Export singleton instance
export const invitationService = new InvitationService();
