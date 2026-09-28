// Une forme par membre (l'ordre du foyer), le losange au trait pour le joint.
// Le rond et le carré viennent de la v1 ; les autres sont dessinés dans la même boîte 10 × 10.
const MEMBER_SHAPES = [
  <circle key="circle" cx="5" cy="5" r="5" />,
  <rect key="square" width="10" height="10" />,
  <path key="triangle" d="M5 .3 9.9 9.5H.1z" />,
  <path key="hexagon" d="M2.5.4h5L10 5 7.5 9.6h-5L0 5z" />,
  <path key="cross" d="M3.5 0h3v3.5H10v3H6.5V10h-3V6.5H0v-3h3.5z" />,
  <path key="half" d="M0 9.5A5 8.5 0 0 1 10 9.5z" />,
]

/** Rond plein, carré plein, triangle, hexagone, croix, demi-disque : les membres 1 à 6. Losange au trait : joint. */
export function Shape({ of }: { of: 'joint' | number }) {
  if (of === 'joint') return <span className="shape shape--joint" aria-hidden="true" />
  return (
    <svg className="shape" viewBox="0 0 10 10" aria-hidden="true">
      {MEMBER_SHAPES[of % MEMBER_SHAPES.length]}
    </svg>
  )
}
