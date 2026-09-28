import { useCallback, useEffect } from 'react'
import { Redirect, Route, Switch, useLocation } from 'wouter'
import { I18nProvider, useI18n } from './i18n/i18n'
import { Categories } from './screens/Categories'
import { ChargeForm } from './screens/ChargeForm'
import { Charges } from './screens/Charges'
import { Detail } from './screens/Detail'
import { Household } from './screens/Household'
import { InstallHint } from './screens/InstallHint'
import { News } from './screens/News'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Transfers } from './screens/Transfers'
import { StoreProvider, useStore } from './storage/store'
import { ToastProvider, useToast } from './ui/Toast'
import { UpdatePrompt } from './ui/UpdatePrompt'

export function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <UpdatePrompt />
        <Store />
      </ToastProvider>
    </I18nProvider>
  )
}

function Store() {
  const { t } = useI18n()
  const toast = useToast()
  const onSaveError = useCallback(() => toast({ message: t.saveError }), [toast, t])

  return (
    <StoreProvider
      onSaveError={onSaveError}
      fallback={(status) => (status === 'error' ? <p className="fatal">{t.loadError}</p> : null)}
    >
      <Routes />
    </StoreProvider>
  )
}

function Routes() {
  const [location] = useLocation()
  const { fresh } = useStore()
  // Chaque écran s'ouvre en haut de page
  useEffect(() => window.scrollTo(0, 0), [location])

  if (fresh) return <Onboarding />
  return (
    <>
      <InstallHint />
      <Screens />
    </>
  )
}

function Screens() {
  return (
    <Switch>
      <Route path="/" component={Transfers} />
      <Route path="/detail" component={Detail} />
      <Route path="/charges" component={Charges} />
      <Route path="/charges/new">{() => <ChargeForm />}</Route>
      <Route path="/charges/:id">{(p) => <ChargeForm key={p.id} id={p.id} />}</Route>
      <Route path="/household" component={Household} />
      <Route path="/settings" component={Settings} />
      <Route path="/settings/categories" component={Categories} />
      <Route path="/settings/news" component={News} />
      <Route>
        <Redirect to="/" replace />
      </Route>
    </Switch>
  )
}
