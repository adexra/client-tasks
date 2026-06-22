/**
 * PageHeader — compact, single-line page titles for internal tool pages.
 *
 * Replaces the old giant 60px serif hero that wrapped into 3 lines on
 * any viewport under ~900px. This keeps the Adexra brand feel
 * (eyebrow label, serif title accent) but at a scale appropriate for
 * a daily-use operational tool — not a marketing landing page.
 *
 * Usage:
 *   <PageHeader
 *     eyebrow="Brain System"          // small caps label above title
 *     title="Memory"                  // main page title
 *     description="Named knowledge…"  // optional subtitle
 *     actions={<button>…</button>}    // optional right-side actions
 *   />
 */
export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: '24px',
      flexWrap: 'wrap',
      paddingBottom: '24px',
      borderBottom: '1px solid rgba(244,244,246,0.07)',
      marginBottom: '8px',
    }}>
      {/* Left: eyebrow + title + description */}
      <div style={{ flex: '1 1 0', minWidth: 0 }}>
        {eyebrow && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '10px',
          }}>
            <span style={{
              fontSize: '10px',
              fontWeight: '700',
              color: '#6B7080',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
              whiteSpace: 'nowrap',
            }}>
              {eyebrow}
            </span>
            <div style={{ height: '1px', width: '24px', background: 'rgba(244,244,246,0.12)', flexShrink: 0 }} />
          </div>
        )}

        <h1 style={{
          fontSize: '28px',
          fontFamily: 'serif',
          fontWeight: '700',
          color: '#F4F4F6',
          letterSpacing: '-0.02em',
          lineHeight: '1.2',
          margin: 0,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {title}
        </h1>

        {description && (
          <p style={{
            fontSize: '13px',
            color: '#6B7080',
            lineHeight: '1.5',
            margin: '6px 0 0 0',
            maxWidth: '480px',
          }}>
            {description}
          </p>
        )}
      </div>

      {/* Right: actions slot */}
      {actions && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexShrink: 0,
        }}>
          {actions}
        </div>
      )}
    </div>
  );
}
