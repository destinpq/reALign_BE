import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function updateAdminPassword() {
  try {
    console.log('🔑 Updating admin password...');
    
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    const updatedUser = await prisma.user.update({
      where: { email: 'admin@realign.com' },
      data: { password: hashedPassword },
    });
    
    console.log('✅ Admin password updated successfully!');
    console.log('📧 Email: admin@realign.com');
    console.log('🔑 Password: Admin123!');
    console.log('👤 Role:', updatedUser.role);
    
  } catch (error) {
    console.error('❌ Error updating password:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateAdminPassword(); 