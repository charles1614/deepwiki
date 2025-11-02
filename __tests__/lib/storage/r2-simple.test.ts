import { R2StorageService } from '@/lib/storage/r2'

// Set up environment variables for testing
beforeAll(() => {
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID = 'test-access-key'
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY = 'test-secret-key'
  process.env.CLOUDFLARE_R2_BUCKET_NAME = 'test-bucket'
  process.env.CLOUDFLARE_R2_ACCOUNT_ID = 'test-account-id'
  process.env.CLOUDFLARE_R2_ENDPOINT_URL = 'https://test.r2.cloudflarestorage.com'
})

// Simple test to verify the class can be instantiated
describe('R2StorageService - Basic', () => {
  it('should be able to import the class', () => {
    expect(R2StorageService).toBeDefined()
  })

  it('should have extractWikiTitle method', () => {
    const r2Service = new R2StorageService()
    expect(typeof r2Service.extractWikiTitle).toBe('function')
  })

  it('should have generateWikiSlug method', () => {
    const r2Service = new R2StorageService()
    expect(typeof r2Service.generateWikiSlug).toBe('function')
  })

  it('should extract title from markdown content', () => {
    const r2Service = new R2StorageService()
    const markdown = '# My Test Wiki\n\nContent here...'
    const title = r2Service.extractWikiTitle(markdown)
    expect(title).toBe('My Test Wiki')
  })

  it('should generate slug from title', () => {
    const r2Service = new R2StorageService()
    const slug = r2Service.generateWikiSlug('My Test Wiki')
    expect(slug).toBe('my-test-wiki')
  })
})