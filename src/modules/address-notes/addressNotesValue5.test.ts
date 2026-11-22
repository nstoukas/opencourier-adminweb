import fs from 'fs'
import path from 'path'

// Spec 0053 (AC-5, AC-7, AC-9; cross check 9, 12; binding value 5):
// Value 5 guard for address notes:
// 1. AddressNoteAdminDto must NEVER contain a per-author upvote total, rank, or score.
// 2. CourierAdminDto must NEVER contain fields matching address notes or note upvotes.
// 3. AddressNoteApi.search params takes search, page, perPage and NEVER a courierId, riderId, or author filter.
// 4. No screen, component, or query in src/modules/couriers or src/modules/address-notes lists, counts, ranks, or scores riders by notes or upvotes.
describe('Value 5 guard — Address Notes (spec 0053, AC-5, AC-9; cross check 9, 12)', () => {
  const bannedAddressNotePatterns = [
    /(?:courier|rider|author)Note(?:s)?(?:Count|Total|Rate|Score|Rank|Stats)/i,
    /(?:courier|rider|author)Upvote(?:s)?(?:Count|Total|Rate|Score|Rank|Stats)/i,
    /(?:notes?|upvotes?)(?:Ranking|Leaderboard)/i,
    /\bauthorTotalUpvotes\b/i,
    /\bupvotesPerCourier\b/i,
    /\bnotesPerCourier\b/i,
    /\bnotesPerRider\b/i,
  ]

  it('ensures AddressNoteAdminDto contains note-level upvotes but NO per-author upvote total, rank, or score (cross check 12)', () => {
    const apiSourcePath = path.resolve(
      __dirname,
      '../../backend-admin-sdk/src/apis/AddressNoteApi.ts'
    )
    expect(fs.existsSync(apiSourcePath)).toBe(true)

    const content = fs.readFileSync(apiSourcePath, 'utf-8')
    const dtoMatch = content.match(/export interface AddressNoteAdminDto\s*\{([^}]+)\}/)
    expect(dtoMatch).not.toBeNull()
    const dtoBody = dtoMatch ? dtoMatch[1] : ''

    // Note-level upvotes is present
    expect(dtoBody).toMatch(/\bupvotes\s*:\s*number\b/)

    // Value 5: NO per-author upvote total or courier note count
    for (const pattern of bannedAddressNotePatterns) {
      expect(dtoBody).not.toMatch(pattern)
    }
  })

  it('ensures CourierAdminDto source file contains no field relating to address notes or note upvotes (AC-5, AC-9)', () => {
    const courierDtoPath = path.resolve(
      __dirname,
      '../../backend-admin-sdk/src/models/CourierAdminDto.ts'
    )
    expect(fs.existsSync(courierDtoPath)).toBe(true)

    const content = fs.readFileSync(courierDtoPath, 'utf-8')
    expect(content).not.toMatch(/addressNote/i)
    expect(content).not.toMatch(/locationNote/i)
    expect(content).not.toMatch(/noteCount/i)
    expect(content).not.toMatch(/noteUpvotes/i)
  })

  it('ensures AddressNoteApi search parameters has NO author, courier, or rider filter (cross check 9)', () => {
    const apiSourcePath = path.resolve(
      __dirname,
      '../../backend-admin-sdk/src/apis/AddressNoteApi.ts'
    )
    const content = fs.readFileSync(apiSourcePath, 'utf-8')

    // Find the search method signature: search(params: { ... })
    const searchSignatureMatch = content.match(/search\s*\(\s*params\s*:\s*\{([^}]+)\}/)
    expect(searchSignatureMatch).not.toBeNull()
    const paramsBody = searchSignatureMatch ? searchSignatureMatch[1] : ''

    // Allowed search params: search, page, perPage
    expect(paramsBody).toMatch(/search\??\s*:\s*string/)
    expect(paramsBody).toMatch(/page\??\s*:\s*number/)
    expect(paramsBody).toMatch(/perPage\??\s*:\s*number/)

    // Banned filter keys: no author, courier, or rider filter
    expect(paramsBody).not.toMatch(/courier/i)
    expect(paramsBody).not.toMatch(/rider/i)
    expect(paramsBody).not.toMatch(/author/i)
  })

  it('verifies that no file in src/modules/couriers/ references addressNoteApi or aggregates notes per rider', () => {
    const couriersDir = path.resolve(__dirname, '../couriers')
    if (!fs.existsSync(couriersDir)) return

    function getSourceFiles(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      const files: string[] = []
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name)
        if (entry.isDirectory()) {
          files.push(...getSourceFiles(fullPath))
        } else if (
          (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
          !entry.name.includes('.test.')
        ) {
          files.push(fullPath)
        }
      }
      return files
    }

    const files = getSourceFiles(couriersDir)
    expect(files.length).toBeGreaterThan(0)

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      expect(content).not.toMatch(/addressNoteApi/i)
      expect(content).not.toMatch(/authorTotalUpvotes/i)
      expect(content).not.toMatch(/courierNoteCount/i)
    }
  })

  it('verifies that AddressNoteRow and address-notes page do not contain banned aggregation patterns', () => {
    const rowFile = path.resolve(__dirname, 'AddressNoteRow.tsx')
    const pageFile = path.resolve(__dirname, '../../pages/address-notes/index.tsx')

    const files = [rowFile, pageFile]
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8')
      for (const pattern of bannedAddressNotePatterns) {
        expect(content).not.toMatch(pattern)
      }
    }
  })

  it('proves that a planted per-author upvote total in AddressNoteAdminDto triggers the guard (cross check 12)', () => {
    const fakeDtoWithAuthorUpvotes = `
      export interface AddressNoteAdminDto {
        id: string;
        note: string;
        upvotes: number;
        authorTotalUpvotes: number;
      }
    `
    const fires = bannedAddressNotePatterns.some((pattern) =>
      pattern.test(fakeDtoWithAuthorUpvotes)
    )
    expect(fires).toBe(true)
  })

  it('proves that a planted courierId filter in search params triggers the guard (cross check 9)', () => {
    const fakeSearchParams = `
      search(params: { search?: string; courierId?: string; page?: number; perPage?: number })
    `
    expect(fakeSearchParams).toMatch(/courier/i)
  })

  it('proves that a planted rider note ranking triggers the guard (AC-5)', () => {
    const fakeRanking = `
      export const noteLeaderboard = riders.map((r) => ({ rider: r.name, score: r.notesCount }))
    `
    const fires = bannedAddressNotePatterns.some((pattern) => pattern.test(fakeRanking))
    expect(fires).toBe(true)
  })
})
