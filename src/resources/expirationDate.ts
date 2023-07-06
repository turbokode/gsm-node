import { add } from "date-fns";

interface PropsTypes {
  date: Date;
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export default function expirationDate({
  date,
  years = 0,
  months = 0,
  weeks = 0,
  days = 0,
  hours = 0,
  minutes = 0,
  seconds = 0,
}: PropsTypes): Date {
  const expDate = add(date, {
    years,
    months,
    weeks,
    days, //Numero de dias acrescentados a data
    hours,
    minutes,
    seconds,
  });

  return expDate;
}
