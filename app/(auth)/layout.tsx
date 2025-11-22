// import { getPublicSystemSettings } from '@/app/actions/public-settings'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // const settings = await getPublicSystemSettings()
  // const siteName = settings['site_name'] || 'DeepWiki'
  const siteName = 'DeepWiki'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {siteName}
          </h2>
        </div>
        {children}
      </div>
    </div>
  )
}