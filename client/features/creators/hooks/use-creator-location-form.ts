import { useMemo, useState } from "react";
import {
  City,
  Country,
  State,
  type ICity,
} from "country-state-city";

import { findCountryByName, findStateByName } from "./creator-profile-form-utils";
import type { CreatorProfileItemApi } from "@/features/creators/api/types";

export type UseCreatorLocationFormOptions = {
  initialProfile?: CreatorProfileItemApi | null;
  adminMode?: boolean;
};

export function useCreatorLocationForm({
  initialProfile,
  adminMode,
}: UseCreatorLocationFormOptions) {
  const initialCountry = useMemo(
    () => findCountryByName(initialProfile?.countryName),
    [initialProfile?.countryName],
  );
  const initialState = useMemo(
    () =>
      findStateByName(
        initialCountry?.isoCode ?? "",
        initialProfile?.stateName,
      ),
    [initialCountry?.isoCode, initialProfile?.stateName],
  );

  const [countryCode, setCountryCode] = useState(
    () => adminMode ? "IN" : (initialCountry?.isoCode ?? ""),
  );
  const [stateCode, setStateCode] = useState(initialState?.isoCode ?? "");
  const [city, setCity] = useState(() => initialProfile?.city?.trim() ?? "");

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(
    () => (countryCode ? State.getStatesOfCountry(countryCode) : []),
    [countryCode],
  );
  const cities = useMemo<ICity[]>(
    () =>
      countryCode && stateCode
        ? City.getCitiesOfState(countryCode, stateCode)
        : [],
    [countryCode, stateCode],
  );
  const countryName = useMemo(
    () =>
      countries.find((country) => country.isoCode === countryCode)?.name ?? "",
    [countries, countryCode],
  );
  const stateName = useMemo(
    () => states.find((state) => state.isoCode === stateCode)?.name ?? "",
    [states, stateCode],
  );

  return {
    countryCode,
    setCountryCode,
    stateCode,
    setStateCode,
    city,
    setCity,
    countries,
    states,
    cities,
    countryName,
    stateName,
  };
}
