/**
 * Where an iglesia is, as the lists show it: "Villa Mercedes, San Luis". An
 * iglesia whose localidad could not be split has no provincia until the admin
 * fixes it, and shows only its ciudad.
 */
export function getCiudadYProvincia({
  ciudad,
  provincia,
}: {
  ciudad: string;
  provincia: string | null;
}): string {
  return provincia === null ? ciudad : `${ciudad}, ${provincia}`;
}
