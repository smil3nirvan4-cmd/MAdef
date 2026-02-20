# Mãos Amigas — Brand Spec (extracted from maosamigas.com)

## Color Palette

### Primary (Teal)
| Token | Hex | Usage |
|---|---|---|
| `--ma-primary-50` | #E6F7F7 | Subtle backgrounds, active sidebar |
| `--ma-primary-100` | #B3E8E8 | Filter chips active bg |
| `--ma-primary-200` | #80D9D9 | Light accents |
| `--ma-primary-300` | #4DC9C9 | Secondary hover |
| `--ma-primary-400` | #2DA8A8 | **Brand primary** (headers, logo) |
| `--ma-primary-500` | #24A8A8 | Gradient start |
| `--ma-primary-600` | #1F9494 | Buttons, active states |
| `--ma-primary-700` | #1A7F7F | Hover states |
| `--ma-primary-800` | #156B6B | Pressed states |
| `--ma-primary-900` | #0F5454 | Dark text on light teal bg |

### Secondary (Green)
| Token | Hex | Usage |
|---|---|---|
| `--ma-secondary-400` | #339977 | WhatsApp CTA, secondary buttons |
| `--ma-secondary-500` | #2D8A6B | Secondary hover |
| `--ma-secondary-600` | #288A6E | Gradient end |

### Accent (Orange)
| Token | Hex | Usage |
|---|---|---|
| `--ma-accent-400` | #FB923C | Hover state |
| `--ma-accent-500` | #F97316 | **Primary CTA** ("Solicitar Orçamento") |
| `--ma-accent-600` | #EA580C | Pressed state |

### Neutrals
| Token | Hex | Usage |
|---|---|---|
| `--ma-neutral-50` | #F9FAFB | Page background |
| `--ma-neutral-100` | #F3F4F6 | Card hover, sidebar bg |
| `--ma-neutral-200` | #E5E7EB | Borders |
| `--ma-neutral-300` | #D1D5DB | Input borders |
| `--ma-neutral-400` | #9CA3AF | Muted icons |
| `--ma-neutral-500` | #6B7280 | Muted text |
| `--ma-neutral-600` | #4B5563 | Secondary text |
| `--ma-neutral-700` | #374151 | Primary text |
| `--ma-neutral-800` | #363D49 | **Footer bg / heading text** |
| `--ma-neutral-900` | #111827 | Darkest |

### Feedback
| Token | Hex | Usage |
|---|---|---|
| `--ma-success-500` | #22C55E | Success badges/toasts |
| `--ma-success-600` | #16A34A | Success dark |
| `--ma-warning-500` | #EAB308 | Warning badges |
| `--ma-warning-600` | #CA8A04 | Warning dark |
| `--ma-error-500` | #EF4444 | Error messages |
| `--ma-error-600` | #DC2626 | Danger buttons |
| `--ma-info-500` | #3B82F6 | Info badges |

## Typography
- **Font**: System sans-serif (ui-sans-serif, system-ui, sans-serif) — site uses Tailwind defaults
- **Admin override**: Inter (already loaded via next/font/google)
- **Scale**: 12 / 14 / 16 / 18 / 20 / 24 / 30 / 36 / 48 / 60

## Radius
- `--radius-sm`: 4px
- `--radius-md`: 6px (button default)
- `--radius-lg`: 8px (cards, modals)
- `--radius-xl`: 12px
- `--radius-full`: 9999px

## Shadows
- `--shadow-sm`: 0 1px 2px rgba(0,0,0,.05)
- `--shadow-md`: 0 4px 6px -1px rgba(0,0,0,.1)
- `--shadow-lg`: 0 10px 15px -3px hsl(180 85% 50% / .15)
- `--shadow-glow`: 0 25px 50px -12px hsl(180 85% 50% / .25)

## Hero Gradient
```css
background: linear-gradient(135deg, #24A8A8, #288A6E);
```

## Button Styles
- **Primary (Orange CTA)**: bg `#F97316`, text white, radius 6px, shadow glow on hover
- **Secondary (Green)**: bg `#339977`, text white, border white/50, radius 6px
- **Outline/Ghost**: border neutral-300, text neutral-700
