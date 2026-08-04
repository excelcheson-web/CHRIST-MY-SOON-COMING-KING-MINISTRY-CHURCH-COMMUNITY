import { Children, isValidElement, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { cn } from '@/lib/utils'

function toText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === 'boolean') return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(toText).join('')
  if (isValidElement(node)) return toText((node.props as { children?: ReactNode }).children)
  return ''
}

function slugify(node: ReactNode): string {
  return toText(node)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Renders page copy authored in Markdown (from the database, or the bundled
 * fallback). Headings get stable ids so the on-page contents list can link to
 * them, and outbound links are given safe rel attributes.
 *
 * react-markdown does not execute raw HTML unless `rehype-raw` is added — it
 * deliberately is not, so admin-authored content cannot inject scripts.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('prose-church', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children: content }) => <h2 id={slugify(content)}>{content}</h2>,
          h2: ({ children: content }) => <h2 id={slugify(content)}>{content}</h2>,
          h3: ({ children: content }) => <h3 id={slugify(content)}>{content}</h3>,
          a: ({ href, children: content }) => {
            const external = Boolean(href && /^https?:\/\//.test(href))
            return (
              <a
                href={href}
                {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
              >
                {content}
              </a>
            )
          },
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}

/** Pulls `## ` headings out of Markdown for the sticky contents list. */
export function extractHeadings(markdown: string) {
  return markdown
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => {
      const label = line.replace(/^##\s+/, '').trim()
      return { label, id: slugify(label) }
    })
}

/** Shared by `Markdown` and `extractHeadings` so ids always agree. */
export { slugify }
