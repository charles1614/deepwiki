'use server'

import { prisma } from '@/lib/database'
import { Role } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'

export async function getUsers() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      _count: {
        select: { wikis: true }
      }
    }
  })
}

export async function updateUserRole(userId: string, role: Role) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.user.update({
    where: { id: userId },
    data: { role }
  })

  revalidatePath('/admin/users')
}

export async function deleteUser(userId: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.user.delete({
    where: { id: userId }
  })

  revalidatePath('/admin/users')
}
