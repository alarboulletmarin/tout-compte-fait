import { useCallback, useEffect } from 'react'
import { Redirect, Route, Router, Switch, useLocation, type AroundNavHandler } from 'wouter'
import { I18nProvider, useI18n } from './i18n/i18n'
import { Categories } from './screens/Categories'
import { ChargeForm } from './screens/ChargeForm'
import { Charges } from './screens/Charges'
import { Detail } from './screens/Detail'
import { History } from './screens/History'
import { HistoryMonth } from './screens/HistoryMonth'
import { Household } from './screens/Household'
import { InstallHint } from './screens/InstallHint'
import { News } from './screens/News'
import { Onboarding } from './screens/Onboarding'
import { Settings } from './screens/Settings'
import { Transfers } from './screens/Transfers'
import { StoreProvider, useStore } from './storage/store'
import { withViewTransition } from './ui/motion'
import { ToastProvider, useToast } from './ui/Toast'
import { UpdatePrompt } from './ui/UpdatePrompt'

/**
 * Chaque navigation est un fondu court (View Transition) ; les montants qui ont un nom
 * de transition (`view-transition-name`) glissent d'un écran à l'autre au lieu de se fondre.
 * La transition attend l'image suivante : le temps que React ait affiché l'écran d'après.
 */
const crossfade: AroundNavHandler = (navigate, to, options) => {
  withViewTransition(() => {
    navigate(to, options)
    return new Promise((done) => requestAnimationFrame(() => done()))
  })
}

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
      <Router base="/app" aroundNav={crossfade}>
        <Routes />
      </Router>
    </StoreProvider>
  )
}

function Routes() {
  const [location] = useLocation()
  const { fresh } = useStore()
  // Chaque écran s'ouvre en haut de page
  // Bloc et non flèche : scrollTo renvoie une promesse sur les navigateurs récents, et un effet ne doit rien renvoyer
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location])

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
      <Route path="/history" component={History} />
      <Route path="/history/:month">{(p) => <HistoryMonth month={p.month} />}</Route>
      <Route path="/settings" component={Settings} />
      <Route path="/settings/categories" component={Categories} />
      <Route path="/settings/news" component={News} />
      <Route>
        <Redirect to="/" replace />
      </Route>
    </Switch>
  )
}
