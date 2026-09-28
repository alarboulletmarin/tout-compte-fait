// Thème forcé appliqué avant le premier rendu de l'app, sans flash
try {
  const theme = localStorage.getItem('tcf-theme')
  if (theme === 'light' || theme === 'dark') document.documentElement.dataset.theme = theme
} catch {
  // Stockage indisponible : thème du système
}
