/**
 * Bidirectional alias groups for Indian states and cities.
 *
 * Each group lists names that refer to the same place. The seed does NOT assume
 * which spelling is "canonical" — the `country-state-city` catalog is the source
 * of truth and is inconsistent (it ships "Bengaluru" and "Mumbai" but also the
 * older "Allahabad", "Gurgaon", "Cochin", "Mysuru"). So the seed finds whichever
 * group member actually exists as a seeded row and attaches the OTHER members as
 * lowercased aliases. This stays correct even if the catalog later switches a
 * city to its renamed spelling.
 *
 * City groups are scoped by state name to disambiguate same-named places.
 * Add new equivalences here; no code changes needed.
 */

export interface CityAliasGroup {
  /** State the city belongs to, as spelled in the country-state-city catalog. */
  state: string;
  /** Equivalent city spellings (current, historical, common short forms). */
  names: string[];
}

export const STATE_ALIAS_GROUPS: string[][] = [
  ['Odisha', 'Orissa'],
  ['Puducherry', 'Pondicherry', 'Pondy'],
  ['Uttarakhand', 'Uttaranchal'],
  ['Telangana', 'Telengana'],
  ['Chhattisgarh', 'Chattisgarh'],
  ['Tamil Nadu', 'Tamilnadu'],
  ['Delhi', 'NCT of Delhi', 'New Delhi'],
  ['Jammu and Kashmir', 'Jammu & Kashmir', 'J&K', 'Kashmir'],
  ['Andaman and Nicobar Islands', 'Andaman & Nicobar Islands', 'Andaman', 'Andamans'],
  [
    'Dadra and Nagar Haveli and Daman and Diu',
    'Dadra and Nagar Haveli',
    'Daman and Diu',
    'Daman',
    'Diu',
  ],
];

export const CITY_ALIAS_GROUPS: CityAliasGroup[] = [
  { state: 'Maharashtra', names: ['Mumbai', 'Bombay'] },
  { state: 'Maharashtra', names: ['Pune', 'Poona'] },
  { state: 'Karnataka', names: ['Bengaluru', 'Bangalore'] },
  { state: 'Karnataka', names: ['Mysuru', 'Mysore'] },
  { state: 'Karnataka', names: ['Mangaluru', 'Mangalore'] },
  { state: 'Karnataka', names: ['Hubballi', 'Hubli'] },
  { state: 'Karnataka', names: ['Belagavi', 'Belgaum'] },
  { state: 'Karnataka', names: ['Shivamogga', 'Shimoga'] },
  { state: 'Karnataka', names: ['Tumakuru', 'Tumkur'] },
  { state: 'Karnataka', names: ['Ballari', 'Bellary'] },
  { state: 'Karnataka', names: ['Vijayapura', 'Bijapur'] },
  { state: 'Karnataka', names: ['Kalaburagi', 'Gulbarga'] },
  { state: 'West Bengal', names: ['Kolkata', 'Calcutta'] },
  { state: 'Tamil Nadu', names: ['Chennai', 'Madras'] },
  { state: 'Tamil Nadu', names: ['Tiruchirappalli', 'Trichy', 'Tiruchchirappalli'] },
  { state: 'Tamil Nadu', names: ['Thoothukudi', 'Tuticorin'] },
  { state: 'Kerala', names: ['Kochi', 'Cochin'] },
  { state: 'Kerala', names: ['Thiruvananthapuram', 'Trivandrum'] },
  { state: 'Kerala', names: ['Kozhikode', 'Calicut'] },
  { state: 'Kerala', names: ['Kollam', 'Quilon'] },
  { state: 'Kerala', names: ['Alappuzha', 'Alleppey'] },
  { state: 'Kerala', names: ['Thrissur', 'Trichur'] },
  { state: 'Puducherry', names: ['Puducherry', 'Pondicherry', 'Pondy'] },
  { state: 'Gujarat', names: ['Vadodara', 'Baroda'] },
  { state: 'Uttar Pradesh', names: ['Prayagraj', 'Allahabad'] },
  { state: 'Uttar Pradesh', names: ['Varanasi', 'Banaras', 'Benares', 'Kashi'] },
  { state: 'Uttar Pradesh', names: ['Kanpur', 'Cawnpore'] },
  { state: 'Haryana', names: ['Gurugram', 'Gurgaon'] },
  { state: 'Andhra Pradesh', names: ['Visakhapatnam', 'Vizag', 'Vishakhapatnam'] },
  { state: 'Andhra Pradesh', names: ['Vijayawada', 'Bezawada'] },
  { state: 'Goa', names: ['Panaji', 'Panjim'] },
  { state: 'Himachal Pradesh', names: ['Shimla', 'Simla'] },
  { state: 'Assam', names: ['Guwahati', 'Gauhati'] },
  { state: 'Odisha', names: ['Bhubaneswar', 'Bhubaneshwar'] },
];
