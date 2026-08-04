import type { Config } from 'tailwindcss'

/**
 * CMSCK / Praise Arena design system.
 *
 * Palette is taken straight from the ministry logo: the navy roundel is
 * `primary`, the teal wave is `accent`. Every pairing below was chosen to clear
 * WCAG AA at 16px, because the site has to work for children and for older
 * members. See `styles/globals.css` for why `accent` and `accent-ink` are
 * separate tokens.
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './content/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    /**
     * An extra step so card grids can add a column on very wide monitors.
     *
     * `2xl` is 1600px rather than Tailwind's default 1536px, so it lines up
     * exactly with where the container below grows to 1600px. When those two
     * disagreed, every viewport between 1536 and 1599 gave `2xl:` utilities
     * room the container had not yet provided — which is precisely how the
     * header came to overflow and put a horizontal scrollbar on the site.
     * Keep them in step.
     */
    screens: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1600px',
      '3xl': '1800px',
    },
    /*
     * The container used to cap at 1280px, which left a 1920px desktop with
     * roughly 320px of dead space down each side. It now grows to 1600px and
     * the side padding grows with it, so wide screens feel filled rather than
     * letterboxed.
     *
     * Note this is the *page* width. Long-form reading columns stay narrow via
     * `max-w-3xl` on the article itself — line length is a readability limit,
     * not a layout one, and widening those would make the prose worse.
     */
    container: {
      center: true,
      padding: {
        DEFAULT: '1.25rem',
        sm: '1.5rem',
        lg: '2rem',
        xl: '2.5rem',
        '2xl': '3rem',
      },
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1600px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          soft: 'hsl(var(--primary-soft))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
          soft: 'hsl(var(--accent-soft))',
          /** Deep teal for text and icons on light surfaces. */
          ink: 'hsl(var(--accent-ink))',
          /** Lifted teal for fills on translucent tracks over navy. */
          bright: 'hsl(var(--accent-bright))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-sans)', 'sans-serif'],
      },
      fontSize: {
        // Base bumped to 17px — the plan asks for a 16px floor, this gives headroom.
        base: ['1.0625rem', { lineHeight: '1.7' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 1px 2px hsl(var(--shadow-color) / 0.04), 0 4px 12px hsl(var(--shadow-color) / 0.06)',
        lifted:
          '0 2px 4px hsl(var(--shadow-color) / 0.05), 0 12px 28px -8px hsl(var(--shadow-color) / 0.16)',
        glow: '0 18px 48px -12px hsl(var(--primary) / 0.45)',
      },
      backgroundImage: {
        // The logo's navy roundel, deepened towards the edges.
        'royal-gradient':
          'linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(240 52% 25%) 55%, hsl(243 62% 16%) 100%)',
        // The logo's teal wave.
        'accent-gradient': 'linear-gradient(100deg, hsl(186 72% 52%), hsl(191 78% 40%))',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        shimmer: 'shimmer 2.4s linear infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
