// La landing n'est montrée qu'à la première visite : ensuite, on file vers l'app
try {
  if (localStorage.getItem('tcf-visited')) location.replace('/app/')
} catch {
  // Stockage indisponible : la landing reste affichée
}
