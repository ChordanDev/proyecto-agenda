import type { FormularioDeEvento } from '../dominio/formularioDeEvento';

/**
 * A form of a new evento opened already filled in, as Editar of the vista
 * previa of the chat opens it. A route only carries text, so the form is kept
 * here, in memory, under a clave the route names.
 */
export type FormularioPrecargado = {
  formulario: FormularioDeEvento;
  /** The id the evento is created with: saving it again saves that same evento. */
  eventoId: string;
  /** Told once the evento is saved from the form, with its id. */
  onGuardado: (eventoId: string) => void;
};

const precargados = new Map<string, FormularioPrecargado>();

/** Keeps the form to open, under its `eventoId`, and gives that clave for the route. */
export function precargarFormulario(precargado: FormularioPrecargado): string {
  precargados.set(precargado.eventoId, precargado);
  return precargado.eventoId;
}

/**
 * The form kept under `clave`. Undefined when there is none, as after the app
 * was closed: the form then opens empty.
 */
export function getFormularioPrecargado(clave: string): FormularioPrecargado | undefined {
  return precargados.get(clave);
}

/** Forgets the form kept under `clave`, once its evento was saved. */
export function olvidarFormularioPrecargado(clave: string): void {
  precargados.delete(clave);
}
