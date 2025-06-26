import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        credits: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
        subscriptions: {
          select: {
            type: true,
            status: true,
            creditsIncluded: true,
            creditsUsed: true,
            endDate: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        credits: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateProfile(userId: string, updateData: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  }) {
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        role: true,
        credits: true,
        isActive: true,
        isEmailVerified: true,
        updatedAt: true,
      },
    });
  }

  async deductCredits(userId: string, amount: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.credits < amount) {
      throw new Error('Insufficient credits');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { credits: { decrement: amount } },
      select: { credits: true },
    });
  }

  async addCredits(userId: string, amount: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    });
  }

  async getUserStats(userId: string) {
    const [user, photoCount, customizationCount] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          credits: true,
          createdAt: true,
        },
      }),
      this.prisma.photo.count({
        where: { userId },
      }),
      this.prisma.avatarCustomization.count({
        where: { userId },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      credits: user.credits,
      photosUploaded: photoCount,
      customizationsCreated: customizationCount,
      memberSince: user.createdAt,
    };
  }

  async saveAvatarSession(userId: string, sessionData: any) {
    console.log('🔧 saveAvatarSession called with userId:', userId);
    
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 🔥 FIX: Add proper user isolation - delete ALL old sessions for this user first
    await this.prisma.avatarGeneration.deleteMany({
      where: { 
        sessionId: { startsWith: `session-${userId}` }
      }
    });

    // Create a unique session ID for this user with timestamp
    const sessionId = `session-${userId}-${Date.now()}`;

    // Use the existing AvatarGeneration model to store session data
    const avatarSession = await this.prisma.avatarGeneration.create({
      data: {
        sessionId: sessionId, // 🔥 FIX: Use unique timestamped session ID
        userImage: sessionData.uploadedImage || '',
        selectedWearables: sessionData.selectedItems || {},
        selectedScenery: sessionData.selectedScenery || '',
        userDetails: {
          gender: sessionData.gender,
          name: sessionData.name,
          age: sessionData.age,
          ethnicity: sessionData.ethnicity,
          hairColor: sessionData.hairColor,
          eyeColor: sessionData.eyeColor,
          userDetails: sessionData.userDetails,
        },
        generatedPrompt: sessionData.customPrompt || '',
        status: 'DRAFT', // Mark as draft session
        metadata: {
          colorOverrides: sessionData.colorOverrides || {},
          style: sessionData.style || '',
          lastSaved: new Date().toISOString(),
        },
      },
    });

    return avatarSession;
  }

  async getAvatarSession(userId: string) {
    // 🔥 FIX: Get the LATEST session for this specific user
    const avatarSession = await this.prisma.avatarGeneration.findFirst({
      where: { 
        sessionId: { startsWith: `session-${userId}` }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!avatarSession) {
      return {
        sessionData: null,
        timestamp: null,
      };
    }

    // Convert back to the format expected by the frontend
    const sessionData = {
      uploadedImage: avatarSession.userImage,
      selectedItems: avatarSession.selectedWearables,
      selectedScenery: avatarSession.selectedScenery,
      gender: (avatarSession.userDetails as any)?.gender,
      name: (avatarSession.userDetails as any)?.name,
      age: (avatarSession.userDetails as any)?.age,
      ethnicity: (avatarSession.userDetails as any)?.ethnicity,
      hairColor: (avatarSession.userDetails as any)?.hairColor,
      eyeColor: (avatarSession.userDetails as any)?.eyeColor,
      userDetails: (avatarSession.userDetails as any)?.userDetails,
      customPrompt: avatarSession.generatedPrompt,
      colorOverrides: (avatarSession.metadata as any)?.colorOverrides || {},
      style: (avatarSession.metadata as any)?.style || '',
      generatedAvatar: avatarSession.generatedImageUrl,
    };

    return {
      sessionData,
      timestamp: avatarSession.updatedAt.toISOString(),
    };
  }

  async clearAvatarSession(userId: string) {
    // 🔥 FIX: Clear ALL sessions for this specific user
    await this.prisma.avatarGeneration.deleteMany({
      where: { 
        sessionId: { startsWith: `session-${userId}` }
      }
    });
    
    console.log(`🗑️ Cleared all avatar sessions for user: ${userId}`);
    return { success: true };
  }
} 