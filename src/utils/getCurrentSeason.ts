export function getCurrentSeason(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0 = enero, 8 = septiembre

  // Si estamos en septiembre (8) o después, empieza una nueva temporada
  const startYear = month >= 8 ? year : year - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, "0");

  return `${startYear}/${endYear}`;
}
