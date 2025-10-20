export const ADMIN_EMAILS = ["siciliahernandezguillermo@gmail.com"];

export enum OutsideIslandVenues {
  MEET_MUSIC = "IES Doctoral",
  LOS_GERANIOS = "IES Playa Honda",
  GUPANE_GUIA = "Pab. Mun. Beatriz Mendoza",
  DOS_19_ARINAGA_VECINDARIO = "Pol. Mun. Playa de Arinaga",
  ALHAMBRA_AXINAMAR = "Pab. Mun. Juan Carlos Hernández",
  SAN_ROQUE = "Pab. Mun. El Batán",
  SUAC_CANARIAS = "Pab. García San Román",
  XACAY_TEROR = "Pab. Municipal de Teror",
  ARRECIFE_HGE = "Pab. Municipal de Haria",
  YRUENE_LANZA = "IES Pto. del Carmen",
  BETANGUAIRE = "Pab. Municipal Oasis",
}

export enum AwayVenues {
  YEJARAFE_SONAM = "CEIP San Matías",
  VICTORIA = "Pab. Mun. La Victoria",
  VOLEYCRUZ = "Pab. Loren Agua García",
  MONTILLO_MATANZA = "IES La Matanza",
  ELITE = "Pab. Leticia Batista El Chorrillo",
  NAUSICAA = "Pabellón de Tijoco",
}

export const HOME_VENUE = "Pabellón Quiquirá";

export const ALL_LOCATIONS = [...Object.values(AwayVenues), ...Object.values(OutsideIslandVenues), HOME_VENUE];