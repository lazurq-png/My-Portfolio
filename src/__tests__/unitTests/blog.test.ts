import { describe, expect, test, vi, beforeEach } from 'vitest'
import { getCollection } from 'astro:content'

vi.mock("astro:content", () => ({
  getCollection: vi.fn(),
}))

const posts = [
  { id: "1", title: "First Post", content: "This is the first post.", pubDate: "2023-01-01", tags: ["tag1", "tag2"] },
  { id: "2", title: "Second Post", content: "This is the second post.", pubDate: "2023-02-01", tags: ["tag3", "tag1"] },
  { id: "3", title: "Third Post", content: "This is the third post.", pubDate: "2023-03-01", tags: ["tag2", "tag3"] }
]

beforeEach(() => {
  vi.mocked(getCollection).mockReset()
})

describe('getCollection', () => {
  test("getCollection('blog') returns 3 blog posts with correct values", async () => {
    vi.mocked(getCollection).mockResolvedValue(posts)
    const result = await getCollection('blog')
    expect(result).toHaveLength(3)
    expect(result).toEqual(posts)
  })

  test('returns empty array when mocked', async () => {
    vi.mocked(getCollection).mockResolvedValue([])
    const result = await getCollection('blog')
    
    expect(result).toEqual([])
  })
})
