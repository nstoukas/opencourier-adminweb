import ReactMarkdown from 'react-markdown'
import { Button, Label } from '@/admin-web-components'

// `node` is pulled out so react-markdown's AST node is never spread onto the DOM element.
const MARKDOWN_COMPONENTS = {
  ul: ({ node: _node, ...props }: any) => <ul className="ml-4 list-inside list-disc" {...props} />,
  ol: ({ node: _node, ...props }: any) => <ol className="ml-4 list-inside list-decimal" {...props} />,
  li: ({ node: _node, ...props }: any) => <li className="mb-1" {...props} />,
  // A `#` heading in the text becomes an h2: the page's one h1 is its PageHeader title.
  h1: ({ children }: any) => <h2 className="mb-3 mt-6 text-2xl font-bold">{children}</h2>,
  h2: ({ children }: any) => <h2 className="mb-3 mt-5 text-xl font-semibold">{children}</h2>,
  h3: ({ children }: any) => <h3 className="mb-2 mt-4 text-lg font-semibold">{children}</h3>,
  h4: ({ children }: any) => <h4 className="mb-2 mt-3 text-base font-medium text-muted-foreground">{children}</h4>,
  a: ({ href, children }: any) => (
    <a href={href} className="text-info underline underline-offset-2" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
}

type Props = {
  title: string
  value: string
  placeholder: string
  isSaving: boolean
  onChange: (value: string) => void
  onSave: () => void
  onCancel: () => void
}

// The editor for one public page (courier rules, about the co-op, terms, privacy): markdown on
// the left, a live preview on the right, its own Save (spec 0010, AC-8). Same behaviour as the
// four copies it replaces on the old page.
export function PublicPageEditor({ title, value, placeholder, isSaving, onChange, onSave, onCancel }: Props) {
  return (
    <div className="mt-4">
      <h2 className="pb-2 text-lg font-semibold">Editing {title}</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted p-6">
          <Label htmlFor="public-page-content" className="mb-2 block">
            Content (Markdown)
          </Label>
          <textarea
            id="public-page-content"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-96 w-full resize-none rounded-md border border-input bg-background px-4 py-3 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={placeholder}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Use markdown formatting: # Headers, **bold**, *italic*, - Lists, [links](url)
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted p-6">
          <h3 className="mb-3 text-sm font-semibold">Preview</h3>
          <div className="prose prose-sm h-96 max-w-none overflow-y-auto rounded-md border border-border bg-background p-4">
            {value ? (
              <ReactMarkdown components={MARKDOWN_COMPONENTS}>{value}</ReactMarkdown>
            ) : (
              <p className="text-muted-foreground">No content yet</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <Button type="button" onClick={onSave} disabled={isSaving}>
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
