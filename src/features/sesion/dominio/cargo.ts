/**
 * Assignment of a usuario to one concrete level: encargado of an iglesia,
 * pastor of a distrito or admin of an asociacion. A usuario can have several.
 *
 * The level is called `nivel` and not `alcance`: the alcance is the level that
 * owns an evento.
 */
export type Cargo =
  | { nivel: 'iglesia'; iglesiaId: string }
  | { nivel: 'distrito'; distritoId: string }
  | { nivel: 'asociacion'; asociacionId: string };
