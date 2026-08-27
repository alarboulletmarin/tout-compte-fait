import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { makeData, makeMember } from '@/domain/fixtures'
import { useMemberFilter, useMonthFilter } from '@/store/selectors'
import { ALL_FILTER, useStore } from '@/store/store'
import { IndividualScope } from './IndividualScope'
import { useIndividualScope } from './individualScope'

const initial = useStore.getState().data

/** Une sonde : ce que les sélecteurs répondent sous la portée. */
function Probe() {
  const filter = useMonthFilter()
  const member = useMemberFilter()
  const owner = useIndividualScope()
  return (
    <p>
      {filter.kind}·{member ?? 'aucun'}·{owner ?? 'aucun'}
    </p>
  )
}

function mount(): void {
  render(
    <IndividualScope>
      <Probe />
    </IndividualScope>,
  )
}

function seed(members = [makeMember({ id: 'm-1' }), makeMember({ id: 'm-2' })]): void {
  useStore.setState({
    filter: ALL_FILTER,
    data: makeData({ household: { name: '', members } }),
  })
}

describe('la portée individuelle, posée sans écrire le filtre', () => {
  afterEach(() => {
    useStore.setState({ data: initial, filter: ALL_FILTER })
  })

  it('retombe sur la première personne quand le filtre n’en porte aucune', () => {
    seed()
    mount()

    expect(screen.getByText('member·m-1·m-1')).toBeInTheDocument()
    // La portée est une lecture : le store n'a rien vu passer.
    expect(useStore.getState().filter).toEqual(ALL_FILTER)
  })

  it('laisse passer, par référence, un filtre qui porte déjà une personne', () => {
    seed()
    const filter = { kind: 'member' as const, memberId: 'm-2' }
    useStore.setState({ filter })
    mount()

    expect(screen.getByText('member·m-2·m-2')).toBeInTheDocument()
    expect(useStore.getState().filter).toBe(filter)
  })

  it('couvre aussi « Commun », qui survivra donc au détour', () => {
    seed()
    useStore.setState({ filter: { kind: 'common' } })
    mount()

    expect(screen.getByText('member·m-1·m-1')).toBeInTheDocument()
    expect(useStore.getState().filter).toEqual({ kind: 'common' })
  })

  it('ne pose rien du tout quand le foyer n’a personne', () => {
    seed([])
    mount()

    expect(screen.getByText('all·aucun·aucun')).toBeInTheDocument()
  })

  it('écarte un membre filtré qui n’est plus du foyer', () => {
    seed()
    useStore.setState({ filter: { kind: 'member', memberId: 'parti' } })
    mount()

    expect(screen.getByText('member·m-1·m-1')).toBeInTheDocument()
  })
})
