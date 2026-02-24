import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { notifyEmergencyTeam, notifyAdminHelp } from '../emergency'

describe('emergency notifications', () => {
  const originalEnv = { ...process.env }
  const originalFetch = global.fetch

  beforeEach(() => {
    delete process.env.SLACK_WEBHOOK_URL
    delete process.env.TELEGRAM_BOT_TOKEN
    delete process.env.TELEGRAM_CHAT_ID
    delete process.env.EMERGENCY_NOTIFICATION_EMAIL

    global.fetch = vi.fn()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = { ...originalEnv }
    global.fetch = originalFetch
    vi.restoreAllMocks()
  })

  describe('notifyEmergencyTeam', () => {
    it('runs without error when no channels are configured', async () => {
      await expect(notifyEmergencyTeam('+5511999999999')).resolves.toBeUndefined()
    })

    it('calls Slack when SLACK_WEBHOOK_URL is set', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test'

      vi.mocked(global.fetch).mockResolvedValue(
        new Response(null, { status: 200 })
      )

      await notifyEmergencyTeam('+5511999999999')

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/services/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('+5511999999999'),
        })
      )
    })

    it('handles fetch errors gracefully', async () => {
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/services/test'
      process.env.TELEGRAM_BOT_TOKEN = 'bot-token'
      process.env.TELEGRAM_CHAT_ID = '12345'

      vi.mocked(global.fetch).mockRejectedValue(new Error('Network failure'))

      // Should not throw even when all fetches fail
      await expect(notifyEmergencyTeam('+5511999999999')).resolves.toBeUndefined()
    })
  })

  describe('notifyAdminHelp', () => {
    it('runs without error when no Slack is configured', async () => {
      await expect(notifyAdminHelp('+5511999999999')).resolves.toBeUndefined()

      expect(global.fetch).not.toHaveBeenCalled()
    })
  })
})
