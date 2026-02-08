import { PrismaClient, Role } from '@prisma/client'

const prisma = new PrismaClient()

async function changeUserRole(email: string, newRole: Role) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true }
    })

    if (!user) {
      console.error(`❌ User dengan email "${email}" tidak ditemukan`)
      process.exit(1)
    }

    console.log(`\n📋 User ditemukan:`)
    console.log(`   Email: ${user.email}`)
    console.log(`   Nama: ${user.name}`)
    console.log(`   Role saat ini: ${user.role}`)

    if (user.role === newRole) {
      console.log(`\n⚠️  User sudah memiliki role ${newRole}`)
      process.exit(0)
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { role: newRole }
    })

    console.log(`\n✅ Berhasil mengubah role dari ${user.role} → ${newRole}`)
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Parse arguments
const email = process.argv[2]
const roleStr = process.argv[3]?.toUpperCase()

const availableRoles = Object.values(Role)

if (!email || !roleStr) {
  console.log(`
📝 Script untuk mengubah role user

Usage:
  tsx scripts/change-role.ts <email> <role>

Available roles:
  ${availableRoles.join(', ')}

Examples:
  tsx scripts/change-role.ts admin@example.com ADMIN
  tsx scripts/change-role.ts user@example.com BUSINESS_OWNER
  tsx scripts/change-role.ts agent@example.com AGENT

Dari root project:
  pnpm --filter @kirimchat/backend exec tsx scripts/change-role.ts admin@example.com ADMIN
`)
  process.exit(1)
}

if (!availableRoles.includes(roleStr as Role)) {
  console.error(`❌ Role tidak valid: "${roleStr}"`)
  console.error(`   Role yang tersedia: ${availableRoles.join(', ')}`)
  process.exit(1)
}

changeUserRole(email, roleStr as Role)
