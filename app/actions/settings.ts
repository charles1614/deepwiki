'use server'

import { prisma } from '@/lib/database'
import { revalidatePath } from 'next/cache'
import { auth } from '@/lib/auth'
import { SystemSetting } from '@prisma/client'

export async function getSystemSettings() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  const settings = await prisma.systemSetting.findMany()
  return settings.reduce((acc: Record<string, string>, setting: SystemSetting) => {
    acc[setting.key] = setting.value
    return acc
  }, {} as Record<string, string>)
}



export async function updateSystemSetting(key: string, value: string) {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    throw new Error('Unauthorized')
  }

  await prisma.systemSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })

  revalidatePath('/admin/settings')
}
