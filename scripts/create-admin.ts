import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { config } from 'dotenv';

// Load environment variables
config();

const prisma = new PrismaClient();

async function createInitialAdmin() {
  try {
    console.log('🚀 Creating initial admin account...');

    // Check if any admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      },
    });

    if (existingAdmin) {
      console.log('❌ Admin account already exists:', existingAdmin.email);
      console.log('If you need to create another admin, use the admin panel or API.');
      return;
    }

    // Admin account details
    const adminData = {
      email: 'admin@realign-photomaker.com',
      password: 'AdminPassword123!', // Change this in production
      firstName: 'System',
      lastName: 'Administrator',
      role: UserRole.SUPER_ADMIN,
    };

    // Hash the password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Create the admin user
    const admin = await prisma.user.create({
      data: {
        email: adminData.email,
        password: hashedPassword,
        firstName: adminData.firstName,
        lastName: adminData.lastName,
        role: adminData.role,
        isEmailVerified: true, // Pre-verify admin email
        isActive: true,
        credits: 10000, // Give admin plenty of credits for testing
        subscriptionType: 'ENTERPRISE',
      },
    });

    // Create audit log for admin creation
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'admin.initial_admin_created',
        entityType: 'User',
        entityId: admin.id,
        source: 'SYSTEM',
        metadata: {
          adminEmail: admin.email,
          adminRole: admin.role,
          createdBy: 'system_script',
          initialSetup: true,
        },
      },
    });

    console.log('✅ Initial admin account created successfully!');
    console.log('📧 Email:', adminData.email);
    console.log('🔑 Password:', adminData.password);
    console.log('👤 Role:', adminData.role);
    console.log('💳 Credits:', 10000);
    console.log('');
    console.log('⚠️  IMPORTANT SECURITY NOTICE:');
    console.log('   Please change the default password immediately after first login!');
    console.log('   You can do this through the admin panel or API.');
    console.log('');
    console.log('🔗 Admin Panel Access:');
    console.log('   Development: http://localhost:3000/admin');
    console.log('   Production: https://realign-photomaker.com/admin');
    console.log('');
    console.log('📚 Admin API Endpoints:');
    console.log('   POST /admin/create-admin - Create additional admins');
    console.log('   GET /admin/dashboard - Admin dashboard');
    console.log('   GET /admin/users - User management');
    console.log('   GET /admin/system-stats - System statistics');
    console.log('   See API_REFERENCE.md for complete list');

  } catch (error) {
    console.error('❌ Failed to create admin account:', error);
    
    if (error.code === 'P2002') {
      console.log('Email already exists. Admin might already be created.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Additional utility functions
async function createTestAdmin() {
  try {
    console.log('🧪 Creating test admin account...');

    const testAdminData = {
      email: 'test-admin@realign-photomaker.com',
      password: 'TestAdmin123!',
      firstName: 'Test',
      lastName: 'Admin',
      role: UserRole.ADMIN,
    };

    const hashedPassword = await bcrypt.hash(testAdminData.password, 12);

    const testAdmin = await prisma.user.create({
      data: {
        email: testAdminData.email,
        password: hashedPassword,
        firstName: testAdminData.firstName,
        lastName: testAdminData.lastName,
        role: testAdminData.role,
        isEmailVerified: true,
        isActive: true,
        credits: 5000,
        subscriptionType: 'PREMIUM',
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: testAdmin.id,
        action: 'admin.test_admin_created',
        entityType: 'User',
        entityId: testAdmin.id,
        source: 'SYSTEM',
        metadata: {
          adminEmail: testAdmin.email,
          adminRole: testAdmin.role,
          createdBy: 'system_script',
          testAccount: true,
        },
      },
    });

    console.log('✅ Test admin account created successfully!');
    console.log('📧 Email:', testAdminData.email);
    console.log('🔑 Password:', testAdminData.password);
    console.log('👤 Role:', testAdminData.role);

  } catch (error) {
    console.error('❌ Failed to create test admin:', error);
  }
}

async function listAdmins() {
  try {
    console.log('👥 Listing all admin accounts...');

    const admins = await prisma.user.findMany({
      where: {
        role: { in: [UserRole.ADMIN, UserRole.SUPER_ADMIN] },
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        credits: true,
        createdAt: true,
        lastLoginAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (admins.length === 0) {
      console.log('❌ No admin accounts found.');
      return;
    }

    console.log(`✅ Found ${admins.length} admin account(s):`);
    console.log('');

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.firstName} ${admin.lastName}`);
      console.log(`   📧 Email: ${admin.email}`);
      console.log(`   👤 Role: ${admin.role}`);
      console.log(`   🟢 Active: ${admin.isActive ? 'Yes' : 'No'}`);
      console.log(`   💳 Credits: ${admin.credits}`);
      console.log(`   📅 Created: ${admin.createdAt.toLocaleDateString()}`);
      console.log(`   🔐 Last Login: ${admin.lastLoginAt ? admin.lastLoginAt.toLocaleDateString() : 'Never'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Failed to list admins:', error);
  }
}

// Command line interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case 'create':
      await createInitialAdmin();
      break;
    case 'create-test':
      await createTestAdmin();
      break;
    case 'list':
      await listAdmins();
      break;
    case 'help':
    default:
      console.log('📋 Admin Management Script');
      console.log('');
      console.log('Usage:');
      console.log('  npm run admin:create       - Create initial super admin');
      console.log('  npm run admin:create-test  - Create test admin');
      console.log('  npm run admin:list         - List all admin accounts');
      console.log('  npm run admin:help         - Show this help');
      console.log('');
      console.log('Examples:');
      console.log('  cd backend && npm run admin:create');
      console.log('  cd backend && npx ts-node scripts/create-admin.ts create');
      console.log('  cd backend && npx ts-node scripts/create-admin.ts list');
      break;
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { createInitialAdmin, createTestAdmin, listAdmins }; 