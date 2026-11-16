export interface Country {
  code: string;
  name: string;
  nativeName: string;
  flagUrl: string;
  capital: string;
  region: string;
  subregion: string;
  population: number | null;
  area: number | null;
  borders: string[];
  languages: string[];
  currencies: string[];
  description: string;
}
