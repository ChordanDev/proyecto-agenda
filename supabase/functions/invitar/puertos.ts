// The database side of an invitation: the ports of the domain, bound to the
// gestor who invites.
//
// Only the service_role client: creating a usuario needs the admin API of
// Auth, and finding a usuario by correo and writing a cargo are closed to every
// usuario (20261020000000_create_gestion_de_cargos.sql). That is why the domain
// decides who may invite before any of these writes.

import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '../../../src/shared/database.types.ts';
import type { PuertosDeInvitacion } from '../../../src/features/gestion/dominio/invitacion.ts';
import { buscarUsuarioPorCorreo, leerCargosEnEstructura } from './cargos.ts';

export function crearPuertos({
  gestorId,
  servidor,
  enviarCorreo,
}: {
  gestorId: string;
  servidor: SupabaseClient<Database>;
  enviarCorreo: PuertosDeInvitacion['enviarCorreo'];
}): PuertosDeInvitacion {
  return {
    enviarCorreo,

    // Only the cause reaches the logs of the function, never the pedido.
    informarError(causa) {
      console.error('invitar failed:', causa instanceof Error ? causa.message : causa);
    },

    leerCargosDelGestor: () => leerCargosEnEstructura(servidor, gestorId),

    async leerLugar(lugar) {
      if (lugar.nivel === 'iglesia') {
        const { data, error } = await servidor
          .from('iglesias')
          .select('nombre, distrito_id, distritos(asociacion_id)')
          .eq('id', lugar.iglesiaId)
          .maybeSingle();

        if (error) {
          throw new Error(`Could not read the iglesia: ${error.message}`);
        }
        if (!data?.distritos) return null;
        return {
          nombre: data.nombre,
          cargo: {
            nivel: 'iglesia',
            iglesiaId: lugar.iglesiaId,
            distritoId: data.distrito_id,
            asociacionId: data.distritos.asociacion_id,
            esSecretaria: lugar.esSecretaria,
          },
        };
      }

      const { data, error } = await servidor
        .from('distritos')
        .select('nombre, asociacion_id')
        .eq('id', lugar.distritoId)
        .maybeSingle();

      if (error) {
        throw new Error(`Could not read the distrito: ${error.message}`);
      }
      if (!data) return null;
      return {
        nombre: data.nombre,
        cargo: {
          nivel: 'distrito',
          distritoId: lugar.distritoId,
          asociacionId: data.asociacion_id,
        },
      };
    },

    buscarUsuario: (correo) => buscarUsuarioPorCorreo(servidor, correo),

    async crearUsuario(correo) {
      // Confirmed: the first ingreso is the usual code by correo (#126), and
      // receiving it proves the correo.
      const { data, error } = await servidor.auth.admin.createUser({
        email: correo,
        email_confirm: true,
      });

      if (error) {
        // Another invitation of the same correo created it a moment ago.
        const existente = await buscarUsuarioPorCorreo(servidor, correo);
        if (existente !== null) return existente;
        throw new Error(`Could not create the usuario: ${error.message}`);
      }
      return data.user.id;
    },

    async leerCargoExistente(usuarioId, lugar) {
      let consulta = servidor.from('cargos').select('es_secretaria').eq('usuario_id', usuarioId);
      consulta =
        lugar.nivel === 'iglesia'
          ? consulta.eq('iglesia_id', lugar.iglesiaId)
          : consulta.eq('distrito_id', lugar.distritoId);

      const { data, error } = await consulta.maybeSingle();

      if (error) {
        throw new Error(`Could not read the cargo: ${error.message}`);
      }
      return data ? { esSecretaria: data.es_secretaria } : null;
    },

    async guardarCargo({ usuarioId, nombre, funcion, lugar }) {
      const { error } = await servidor.rpc('guardar_cargo_invitado', {
        usuario_id: usuarioId,
        nombre,
        funcion: funcion ?? undefined,
        ...(lugar.nivel === 'iglesia'
          ? { iglesia_id: lugar.iglesiaId, es_secretaria: lugar.esSecretaria }
          : { distrito_id: lugar.distritoId, es_secretaria: false }),
      });

      if (error) {
        throw new Error(`Could not save the cargo: ${error.message}`);
      }
    },
  };
}
