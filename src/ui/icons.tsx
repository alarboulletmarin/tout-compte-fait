import type { ReactNode } from 'react'

// Tracés repris des maquettes : SVG au trait, dessinés à la main
function Svg(props: { size: number; stroke: number; children: ReactNode }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={props.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  )
}

export const CheckIcon = () => (
  <Svg size={16} stroke={1.8}>
    <path d="M5 12l5 5L19 7" />
  </Svg>
)

export const ArrowRightIcon = () => (
  <Svg size={18} stroke={1.6}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
)

export const BackIcon = () => (
  <Svg size={20} stroke={1.6}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
)

export const CloseIcon = () => (
  <Svg size={20} stroke={1.6}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
)

export const ChevronIcon = () => (
  <Svg size={16} stroke={1.6}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
)

export const PlusIcon = ({ size = 18 }: { size?: number }) => (
  <Svg size={size} stroke={1.8}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const TrashIcon = () => (
  <Svg size={16} stroke={1.6}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
  </Svg>
)

export const PencilIcon = () => (
  <Svg size={18} stroke={1.5}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
  </Svg>
)

export const TransfersIcon = () => (
  <Svg size={22} stroke={1.5}>
    <rect x="4" y="5" width="16" height="15" rx="2" />
    <path d="M4 10h16M9 3v4M15 3v4" />
  </Svg>
)

export const ChargesIcon = () => (
  <Svg size={22} stroke={1.5}>
    <path d="M8 7h12M8 12h12M8 17h12" />
    <circle cx="4.5" cy="7" r="0.6" />
    <circle cx="4.5" cy="12" r="0.6" />
    <circle cx="4.5" cy="17" r="0.6" />
  </Svg>
)

export const HouseholdIcon = () => (
  <Svg size={22} stroke={1.5}>
    <path d="M4 11l8-6 8 6v9H4z" />
    <path d="M10 20v-5h4v5" />
  </Svg>
)

export const SettingsIcon = () => (
  <Svg size={22} stroke={1.5}>
    <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="8" cy="17" r="2" />
  </Svg>
)

export const WarningIcon = () => (
  <Svg size={16} stroke={1.8}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v4M12 17h.01" />
  </Svg>
)

export const InfoIcon = () => (
  <Svg size={18} stroke={1.6}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
)
