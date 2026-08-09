import { useState } from 'react'
import { t } from '@/i18n/strings'
import { Button, IconButton } from '@/ui/Button'
import { Disclosure } from '@/ui/Disclosure'
import { AmountInput, Checkbox, DateInput, Field, Select, TextInput } from '@/ui/Field'
import { Plus } from '@/ui/Icons'
import { Segmented } from '@/ui/Segmented'
import { Section, SubTitle } from './Section'
import { DualTheme } from './ThemePane'

const directions = () => [
  { value: 'in' as const, label: t.direction.in },
  { value: 'out' as const, label: t.direction.out },
]

function Controls() {
  const [direction, setDirection] = useState<'in' | 'out'>('out')
  const [shared, setShared] = useState(true)
  const [open, setOpen] = useState(true)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <Button>{t.common.save}</Button>
        <Button variant="secondary">{t.common.cancel}</Button>
        <Button variant="ghost">{t.common.edit}</Button>
        <Button variant="danger">{t.common.delete}</Button>
        <Button disabled>{t.common.save}</Button>
        <IconButton label={t.common.add} variant="primary">
          <Plus />
        </IconButton>
      </div>

      <Segmented
        options={directions()}
        value={direction}
        onChange={setDirection}
        label={t.direction.in}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Libellé" required>
          {(id, describedBy) => (
            <TextInput id={id} aria-describedby={describedBy} placeholder="Loyer" />
          )}
        </Field>
        <Field label="Montant" required hint="En euros">
          {(id, describedBy) => (
            <AmountInput id={id} aria-describedby={describedBy} defaultValue="950,00" />
          )}
        </Field>
        {/* Le contrôle d'une date porte le même plafond que celui d'un montant,
            et il se montre à côté de lui : c'est là qu'on vérifie que les deux
            s'arrêtent bien au même endroit. */}
        <Field label="Date" required>
          {(id) => <DateInput id={id} defaultValue="2026-08-08" />}
        </Field>
        <Field label="Catégorie" optional>
          {(id) => (
            <Select id={id} defaultValue="logement">
              <option value="logement">Logement</option>
              <option value="courses">Courses</option>
            </Select>
          )}
        </Field>
        <Field label="Jour" error="Le mois ne compte que 30 jours.">
          {(id, describedBy) => (
            <TextInput
              id={id}
              aria-describedby={describedBy}
              className="max-w-24"
              defaultValue="31"
              invalid
            />
          )}
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Checkbox
          checked={shared}
          onChange={setShared}
          label={t.entry.shared}
          hint={t.entry.sharedHint}
        />
        <Checkbox checked={false} onChange={() => undefined} label={t.recurrences.variable} />
      </div>

      <Disclosure
        open={open}
        onOpenChange={setOpen}
        title={<span className="t-body font-medium">Logement</span>}
        trailing={<span className="t-axis">5 catégories</span>}
      >
        <p className="t-label pt-2 pl-6">Loyer et charges, énergies, assurance habitation…</p>
      </Disclosure>
    </div>
  )
}

export function ControlsSection() {
  return (
    <Section title="Contrôles" note="Primitives de formulaire, alignées sur les mêmes tokens.">
      <SubTitle>{t.styleguide.states}</SubTitle>
      <DualTheme>
        <Controls />
      </DualTheme>
    </Section>
  )
}
