import { useRouter } from 'expo-router';
import { useState } from 'react';

import { getCiudadYProvincia } from '@/features/iglesias/dominio/ciudadYProvincia';
import { AppText, Card, SearchField } from '@/shared/ui';

import { useEstructuraDelAdmin } from '../datos/useGestionAdmin';
import {
  getConfirmacionDeReactivarIglesia,
  getSubtituloDeIglesiaDeBaja,
  puedeReactivarIglesia,
} from '../dominio/bajaDeEstructura';
import { buscarIglesiasDelAdmin, type IglesiaDelAdmin } from '../dominio/estructuraDelAdmin';
import { DadasDeBaja } from './BajaDelAdmin';
import { BotonAgregar, Fila, Lista } from './ListaDelAdmin';

type IglesiasTabProps = {
  /** Ordered by nombre. */
  iglesias: IglesiaDelAdmin[];
};

/**
 * The tab Iglesias: every active iglesia of the asociacion with its distrito,
 * a search, and apart those dadas de baja, to reactivar them.
 */
export function IglesiasTab({ iglesias }: IglesiasTabProps) {
  const router = useRouter();
  // The same query the screen read the iglesias from, so it is already there.
  const deBaja = useEstructuraDelAdmin().data?.iglesiasDeBaja ?? [];
  const [texto, setTexto] = useState('');
  const encontradas = buscarIglesiasDelAdmin(iglesias, texto);

  return (
    <>
      <BotonAgregar label="Nueva iglesia" onPress={() => router.push('/gestion/iglesia/nueva')} />

      <SearchField
        value={texto}
        onChangeText={setTexto}
        placeholder="Buscar iglesia"
        accessibilityLabel="Buscar iglesia"
      />

      {encontradas.length > 0 ? (
        <Lista>
          {encontradas.map((iglesia, index) => (
            <Fila
              key={iglesia.id}
              titulo={iglesia.nombre}
              ultima={index === encontradas.length - 1}
              accessibilityHint="Abre la iglesia para editarla o cambiarla de distrito"
              onPress={() =>
                router.push({ pathname: '/gestion/iglesia/[id]', params: { id: iglesia.id } })
              }
            >
              <AppText variant="secundario" color="textoSecundario">
                {iglesia.distritoNombre} · {getCiudadYProvincia(iglesia)}
              </AppText>
            </Fila>
          ))}
        </Lista>
      ) : (
        // A state the mockup does not draw.
        <Card>
          <AppText color="textoSecundario">
            {iglesias.length === 0
              ? 'Todavía no hay iglesias.'
              : 'Ninguna iglesia coincide con la búsqueda.'}
          </AppText>
        </Card>
      )}

      <DadasDeBaja
        titulo="Dadas de baja"
        filas={deBaja.map((iglesia) => ({
          id: iglesia.id,
          nombre: iglesia.nombre,
          subtitulo: getSubtituloDeIglesiaDeBaja(iglesia),
          puedeReactivar: puedeReactivarIglesia(iglesia),
          baja: { iglesiaId: iglesia.id },
          confirmacion: getConfirmacionDeReactivarIglesia(iglesia.nombre),
        }))}
      />
    </>
  );
}
