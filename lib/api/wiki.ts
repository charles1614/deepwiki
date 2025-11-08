// API functions for wiki version history

export interface WikiVersion {
  id: string
  version: number
  content: string
  changeLog?: string
  createdAt: string
  user: {
    id: string
    email: string
  }
}

export interface VersionComparison {
  fromVersion: number
  toVersion: number
  fromVersionData: WikiVersion
  toVersionData: WikiVersion
  differences: VersionDifference[]
  stats: {
    totalLines: number
    added: number
    removed: number
    modified: number
  }
}

export interface VersionDifference {
  type: 'added' | 'removed' | 'modified'
  line?: string
  fromLine?: string
  toLine?: string
  lineNumber: number
}

export async function getWikiVersions(wikiId: string): Promise<WikiVersion[]> {
  const response = await fetch(`/api/wiki/${wikiId}/versions`)

  if (!response.ok) {
    throw new Error('Failed to fetch wiki versions')
  }

  const data = await response.json()
  return data.versions || []
}

export async function getWikiVersion(wikiId: string, version: number): Promise<WikiVersion> {
  const response = await fetch(`/api/wiki/${wikiId}/versions/${version}`)

  if (!response.ok) {
    throw new Error('Failed to fetch wiki version')
  }

  const data = await response.json()
  return data.version
}

export async function createWikiVersion(
  wikiId: string,
  content: string,
  changeLog?: string
): Promise<WikiVersion> {
  const response = await fetch(`/api/wiki/${wikiId}/versions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ content, changeLog }),
  })

  if (!response.ok) {
    throw new Error('Failed to create wiki version')
  }

  const data = await response.json()
  return data.version
}

export async function restoreWikiVersion(
  wikiId: string,
  version: number
): Promise<{ success: boolean; message: string; version: WikiVersion }> {
  const response = await fetch(`/api/wiki/${wikiId}/versions/${version}/restore`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    throw new Error('Failed to restore wiki version')
  }

  return await response.json()
}

export async function compareWikiVersions(
  wikiId: string,
  fromVersion: number,
  toVersion: number
): Promise<{ success: boolean; comparison: VersionComparison }> {
  const response = await fetch(`/api/wiki/${wikiId}/versions/${fromVersion}/compare/${toVersion}`)

  if (!response.ok) {
    throw new Error('Failed to compare wiki versions')
  }

  return await response.json()
}