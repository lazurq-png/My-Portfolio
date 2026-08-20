import { describe, test, expect } from 'vitest'
import { sanitizeSlug, sanitizeContentForDisplay } from '../../lib/sanitize'

describe('Test sanitizeSlug method', () => {
  test('sanitize special characters while keeping letters, numbers and hyphens', () => {
    const input = 'my-post!@#$%^&*()_title'

    const result = sanitizeSlug(input)

    expect(result).toBe('my-post-title')
  })

  test('collapses multiple hyphens into a single hyphen', () => {
    const input = 'my---post----and---more'

    const result = sanitizeSlug(input)

    expect(result).toBe('my-post-and-more')
  })

  test('removes leading and trailing hyphens', () => {
    const input1 = '---my-post'
    const input2 = 'my-post---'
    const input3 = '---my---post---'

    const result1 = sanitizeSlug(input1)
    const result2 = sanitizeSlug(input2)
    const result3 = sanitizeSlug(input3)

    expect(result1).toBe('my-post')
    expect(result2).toBe('my-post')
    expect(result3).toBe('my-post')
  })

  test('removes directory traversal attempts', () => {
    const input = '../../../etc/passwd'
    
    const result = sanitizeSlug(input)
    
    expect(result).toBe('etc-passwd')
  })

  test('handles empty input', () => {
    const input = ''
    
    const result = sanitizeSlug(input)
    
    expect(result).toBe('')
  })

  test('handles already clean input', () => {
    const input = 'clean-post-title'
    
    const result = sanitizeSlug(input)
    
    expect(result).toBe('clean-post-title')
  })
})

describe('Test the sanitizeContentForDisplay method', () => {
  test('escapes HTML special characters', () => {
    const input = 'Hello &amp; World <script>alert("xss")</script>'
    
    const result = sanitizeContentForDisplay(input)
    
    expect(result).toContain('&amp;amp;')
    expect(result).toContain('&lt;script&gt;')
  })

  test('strips script tags', () => {
    const input = '<div>Safe content</div><script>alert("xss")</script><div>More safe</div>'
    
    const result = sanitizeContentForDisplay(input)
    
    expect(result).not.toContain('<script>')
    expect(result).toContain('Safe content')
  })

  test('removes event handler attributes', () =>
    () => {
      const input = '<img src="test.jpg" onerror="alert(\'xss\')" alt="test">'
      
      const result = sanitizeContentForDisplay(input)
      
      expect(result).not.toContain('onerror=')
      expect(result).toContain('src="test.jpg"')
    })

  test('handles non-string input', () => {
    const input1 = 123
    const input2 = null
    const input3 = undefined
    
    const result1 = sanitizeContentForDisplay(input1)
    const result2 = sanitizeContentForDisplay(input2)
    const result3 = sanitizeContentForDisplay(input3)
    
    expect(result1).toBe(123)
    expect(result2).toBe(null)
    expect(result3).toBe(undefined)
  })
})
