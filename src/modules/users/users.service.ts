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
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create a unique session ID for this user
    const sessionId = `${userId}-${Date.now()}`;

    // Use the existing AvatarGeneration model to store session data
    const avatarSession = await this.prisma.avatarGeneration.upsert({
      where: { sessionId: `session-${userId}` }, // Use a consistent session ID for updates
      update: {
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
        metadata: {
          colorOverrides: sessionData.colorOverrides || {},
          style: sessionData.style || '',
          lastSaved: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
      create: {
        sessionId: `session-${userId}`,
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
    const avatarSession = await this.prisma.avatarGeneration.findUnique({
      where: { sessionId: `session-${userId}` },
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
} 