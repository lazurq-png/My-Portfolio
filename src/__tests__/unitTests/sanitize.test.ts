import { describe, test, expect } from 'vitest'
import { sanitizeSlug } from '../../lib/sanitize'

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
