import { prisma } from '@/lib/database'
import { NextResponse } from 'next/server'
import { SystemSetting } from '@prisma/client'

export async function GET() {
  try {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: ['site_name', 'welcome_message', 'registration_enabled']
        }
      }
    })

    const formattedSettings = settings.reduce((acc: Record<string, string>, setting: SystemSetting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json(formattedSettings)
  } catch (error) {
    console.error('Failed to fetch public settings:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
