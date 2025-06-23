
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        username: 'testuser',
        role: 'USER',
        credits: 1000,
        emailVerified: true,
      },
    });
    
    console.log('✅ Test user created:', user.email);
    console.log('📧 Email: test@example.com');
    console.log('🔑 Password: password123');
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('ℹ️ Test user already exists');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();

