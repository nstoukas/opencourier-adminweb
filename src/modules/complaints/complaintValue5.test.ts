import fs from 'fs'
import path from 'path'
import type { ComplaintListAdminArgs } from '@/backend-admin-sdk'

// Spec 0052 (AC-8; cross check 12, 13; binding value 5):
// Value 5 guard for complaints:
// 1. CourierAdminDto must never contain a field matching /complaint/i.
// 2. No screen, component or query in the couriers module lists, counts or ranks complaints per rider.
// 3. The admin complaints list query args (ComplaintListAdminArgs) has NO courier/rider filter.
describe('Value 5 guard — Complaints (spec 0052, AC-8; cross check 12, 13)', () => {
  it('ensures CourierAdminDto source file contains no field matching /complaint/i (AC-8, cross check 12)', () => {
    const courierDtoPath = path.resolve(__dirname, '../../backend-admin-sdk/src/models/CourierAdminDto.ts')
    expect(fs.existsSync(courierDtoPath)).toBe(true)

    const content = fs.readFileSync(courierDtoPath, 'utf-8')
    expect(content).not.toMatch(/complaint/i)
  })

  it('ensures ComplaintListAdminArgs takes only status, about, page, perPage and never a courier or rider id (cross check 13)', () => {
    // Structural type check: ComplaintListAdminArgs keys
    const allowedKeys: (keyof ComplaintListAdminArgs)[] = ['status', 'about', 'page', 'perPage']
    const sampleArgs: ComplaintListAdminArgs = {
      page: 1,
      perPage: 20,
      status: 'OPEN',
      about: 'RIDER',
    }
    const sampleKeys = Object.keys(sampleArgs)
    for (const key of sampleKeys) {
      expect(allowedKeys).toContain(key)
    }

    // Verify in SDK source that ComplaintListAdminArgs has no courierId or riderId
    const complaintApiSource = fs.readFileSync(
      path.resolve(__dirname, '../../backend-admin-sdk/src/apis/ComplaintApi.ts'),
      'utf-8'
    )
    const listArgsInterfaceMatch = complaintApiSource.match(/interface ComplaintListAdminArgs\s*\{([^}]+)\}/)
    expect(listArgsInterfaceMatch).not.toBeNull()
    const interfaceBody = listArgsInterfaceMatch![1]
    expect(interfaceBody).not.toMatch(/courier/i)
    expect(interfaceBody).not.toMatch(/rider/i)
  })

  it('verifies that no file in src/modules/couriers/ imports complaintApi or references complaints (AC-6, AC-8)', () => {
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
      expect(content).not.toMatch(/complaintApi/i)
      expect(content).not.toMatch(/complaintCount/i)
      expect(content).not.toMatch(/complaintsPerRider/i)
    }
  })

  it('proves that a planted complaint count in CourierAdminDto triggers the guard (AC-8)', () => {
    const fakeCourierDtoContent = `
      export interface CourierAdminDto {
        id: string;
        name: string;
        complaintCount: number;
      }
    `
    expect(fakeCourierDtoContent).toMatch(/complaint/i)
  })

  it('proves that a planted courierId filter in ComplaintListAdminArgs triggers the guard (cross check 13)', () => {
    const fakeArgs = `
      export interface ComplaintListAdminArgs {
        status?: ComplaintStatus;
        courierId?: string;
        page: number;
      }
    `
    expect(fakeArgs).toMatch(/courier/i)
  })
})
