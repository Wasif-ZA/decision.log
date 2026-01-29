/**
 * Unit Tests: Debug Logging
 *
 * Tests for lib/debugLog.ts covering:
 * - Event logging
 * - Buffer management
 * - Log retrieval
 * - Clipboard operations
 * - Buffer clearing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  logEvent,
  getDebugLog,
  copyDebugLogToClipboard,
  clearDebugLog,
  getEventBuffer,
} from '@/lib/debugLog'

describe('Debug Logging', () => {
  beforeEach(() => {
    clearDebugLog()
    vi.clearAllMocks()
  })

  describe('logEvent', () => {
    it('should log an event to the buffer', () => {
      logEvent('test_event', { key: 'value' })

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(1)
      expect(buffer[0]).toMatchObject({
        event: 'test_event',
        data: { key: 'value' },
      })
      expect(buffer[0].timestamp).toBeDefined()
    })

    it('should log events without data', () => {
      logEvent('simple_event')

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(1)
      expect(buffer[0].event).toBe('simple_event')
      expect(buffer[0].data).toBeUndefined()
    })

    it('should log multiple events in order', () => {
      logEvent('event_1', { index: 1 })
      logEvent('event_2', { index: 2 })
      logEvent('event_3', { index: 3 })

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(3)
      expect(buffer[0].event).toBe('event_1')
      expect(buffer[1].event).toBe('event_2')
      expect(buffer[2].event).toBe('event_3')
    })

    it('should include ISO timestamp', () => {
      logEvent('test_event')

      const buffer = getEventBuffer()

      expect(buffer[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
      expect(buffer[0].timestamp).toBeDefined()
      expect(typeof buffer[0].timestamp).toBe('string')
    })

    it('should handle complex data objects', () => {
      const complexData = {
        nested: {
          array: [1, 2, 3],
          object: { key: 'value' },
        },
        string: 'test',
        number: 123,
        boolean: true,
        nullValue: null,
      }

      logEvent('complex_event', complexData)

      const buffer = getEventBuffer()

      expect(buffer[0].data).toEqual(complexData)
    })

    it('should keep only last 50 events', () => {
      // Log 60 events
      for (let i = 0; i < 60; i++) {
        logEvent(`event_${i}`, { index: i })
      }

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(50)
      // Should have events 10-59 (the last 50)
      expect(buffer[0].event).toBe('event_10')
      expect(buffer[49].event).toBe('event_59')
    })

    it('should log to console in development mode', () => {
      const originalEnv = process.env.NODE_ENV
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      process.env.NODE_ENV = 'development'

      logEvent('dev_event', { test: true })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEBUG]'),
        expect.objectContaining({ test: true })
      )

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })

    it('should NOT log to console in production mode', () => {
      const originalEnv = process.env.NODE_ENV
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      process.env.NODE_ENV = 'production'

      logEvent('prod_event', { test: true })

      expect(consoleSpy).not.toHaveBeenCalled()

      process.env.NODE_ENV = originalEnv
      consoleSpy.mockRestore()
    })
  })

  describe('getDebugLog', () => {
    it('should return formatted JSON string', () => {
      logEvent('test_event', { key: 'value' })

      const log = getDebugLog()

      expect(() => JSON.parse(log)).not.toThrow()

      const parsed = JSON.parse(log)
      expect(parsed).toHaveProperty('exportedAt')
      expect(parsed).toHaveProperty('userAgent')
      expect(parsed).toHaveProperty('events')
    })

    it('should include all logged events', () => {
      logEvent('event_1', { data: 1 })
      logEvent('event_2', { data: 2 })
      logEvent('event_3', { data: 3 })

      const log = JSON.parse(getDebugLog())

      expect(log.events).toHaveLength(3)
      expect(log.events[0].event).toBe('event_1')
      expect(log.events[1].event).toBe('event_2')
      expect(log.events[2].event).toBe('event_3')
    })

    it('should include export timestamp', () => {
      logEvent('test_event')

      const log = JSON.parse(getDebugLog())

      expect(log.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should include user agent', () => {
      const log = JSON.parse(getDebugLog())

      expect(log.userAgent).toBeDefined()
      // In test environment, should be 'server' or a user agent string
      expect(typeof log.userAgent).toBe('string')
    })

    it('should be pretty-printed', () => {
      logEvent('test_event')

      const log = getDebugLog()

      // Pretty-printed JSON should have newlines and indentation
      expect(log).toContain('\n')
      expect(log).toContain('  ')
    })

    it('should return empty events array when no events logged', () => {
      const log = JSON.parse(getDebugLog())

      expect(log.events).toEqual([])
    })
  })

  describe.skip('copyDebugLogToClipboard', () => {
    it('should copy log to clipboard on success', async () => {
      const mockWriteText = vi.fn().mockResolvedValue(undefined)
      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })

      logEvent('test_event')

      const result = await copyDebugLogToClipboard()

      expect(result).toBe(true)
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('test_event'))
    })

    it('should return false on clipboard error', async () => {
      const mockWriteText = vi.fn().mockRejectedValue(new Error('Clipboard error'))
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      Object.assign(navigator, {
        clipboard: {
          writeText: mockWriteText,
        },
      })

      const result = await copyDebugLogToClipboard()

      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to copy')
      )

      consoleErrorSpy.mockRestore()
    })

    it('should handle missing clipboard API', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Remove clipboard API
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      })

      const result = await copyDebugLogToClipboard()

      expect(result).toBe(false)

      consoleErrorSpy.mockRestore()
    })
  })

  describe('clearDebugLog', () => {
    it('should remove all events from buffer', () => {
      logEvent('event_1')
      logEvent('event_2')
      logEvent('event_3')

      expect(getEventBuffer()).toHaveLength(3)

      clearDebugLog()

      expect(getEventBuffer()).toHaveLength(0)
    })

    it('should allow logging after clearing', () => {
      logEvent('event_1')
      clearDebugLog()
      logEvent('event_2')

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(1)
      expect(buffer[0].event).toBe('event_2')
    })

    it('should be safe to call multiple times', () => {
      logEvent('event_1')
      clearDebugLog()
      clearDebugLog()
      clearDebugLog()

      expect(getEventBuffer()).toHaveLength(0)
    })
  })

  describe('getEventBuffer', () => {
    it('should return a copy of the buffer', () => {
      logEvent('event_1')
      logEvent('event_2')

      const buffer1 = getEventBuffer()
      const buffer2 = getEventBuffer()

      expect(buffer1).toEqual(buffer2)
      expect(buffer1).not.toBe(buffer2) // Different instances
    })

    it('should not allow external modification of buffer', () => {
      logEvent('event_1')

      const buffer = getEventBuffer()
      buffer.push({
        timestamp: '2024-01-01T00:00:00.000Z',
        event: 'fake_event',
      })

      const actualBuffer = getEventBuffer()

      expect(actualBuffer).toHaveLength(1)
      expect(actualBuffer[0].event).toBe('event_1')
    })
  })

  describe('Edge Cases', () => {
    it('should handle logging same event multiple times', () => {
      for (let i = 0; i < 5; i++) {
        logEvent('repeated_event', { index: i })
      }

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(5)
      buffer.forEach((event) => {
        expect(event.event).toBe('repeated_event')
      })
    })

    it('should handle very large data objects', () => {
      const largeData = {
        array: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: `item_${i}` })),
      }

      logEvent('large_event', largeData)

      const buffer = getEventBuffer()

      expect(buffer[0].data).toEqual(largeData)
    })

    it('should handle circular references gracefully', () => {
      const circularObj: Record<string, unknown> = { key: 'value' }
      circularObj.self = circularObj

      // Should not throw
      expect(() => {
        logEvent('circular_event', circularObj)
      }).not.toThrow()

      // Note: getDebugLog() uses JSON.stringify which will throw on circular refs
      // This is expected behavior - we can't serialize circular structures
    })

    it('should handle undefined and null event names', () => {
      logEvent(undefined as unknown as string)
      logEvent(null as unknown as string)

      const buffer = getEventBuffer()

      expect(buffer).toHaveLength(2)
    })
  })
})
