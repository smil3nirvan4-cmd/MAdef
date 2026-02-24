import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import path from 'path'

// Mock fs so we don't touch the real filesystem
vi.mock('fs', () => ({
  existsSync: vi.fn(() => false),
  readFileSync: vi.fn(),
}))

import { resolveBridgeConfig } from '../bridge-config'
import { existsSync, readFileSync } from 'fs'

describe('resolveBridgeConfig', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Strip all WA_* env vars before each test
    delete process.env.WA_BRIDGE_HOST
    delete process.env.WA_BRIDGE_PORT
    delete process.env.WA_BRIDGE_URL
    delete process.env.WA_BRIDGE_PORT_FILE
    delete process.env.WA_STANDALONE

    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(readFileSync).mockReturnValue('')
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    vi.restoreAllMocks()
  })

  it('returns default config when no env vars set', () => {
    const config = resolveBridgeConfig()

    expect(config.host).toBe('127.0.0.1')
    expect(config.port).toBe('4000')
    expect(config.bridgeUrl).toBe('http://127.0.0.1:4000')
    expect(config.portFile).toBe(path.resolve(process.cwd(), '.wa-bridge-port'))
  })

  it('uses WA_BRIDGE_URL when set', () => {
    process.env.WA_BRIDGE_URL = 'http://custom-bridge:9999'

    const config = resolveBridgeConfig()

    expect(config.bridgeUrl).toBe('http://custom-bridge:9999')
  })

  it('uses custom host and port from env', () => {
    process.env.WA_BRIDGE_HOST = '192.168.1.50'
    process.env.WA_BRIDGE_PORT = '5555'

    const config = resolveBridgeConfig()

    expect(config.host).toBe('192.168.1.50')
    expect(config.port).toBe('5555')
    // bridgeUrl should be derived from custom host+port when WA_BRIDGE_URL is not set
    expect(config.bridgeUrl).toBe('http://192.168.1.50:5555')
  })

  it("returns 'npm run dev' as default recommended command", () => {
    const config = resolveBridgeConfig()

    expect(config.recommendedCommand).toBe('npm run dev')
  })

  it("returns 'npm run whatsapp' when WA_STANDALONE=true", () => {
    process.env.WA_STANDALONE = 'true'

    const config = resolveBridgeConfig()

    expect(config.recommendedCommand).toBe('npm run whatsapp')
  })
})
