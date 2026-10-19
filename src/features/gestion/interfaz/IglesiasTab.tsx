import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppText, Card, SearchField } from '@/shared/ui';

import { buscarIglesiasDelAdmin, type IglesiaDelAdmin } from '../dominio/estructuraDelAdmin';
import { BotonAgregar, Fila, Lista } from './ListaDelAdmin';

type IglesiasTabProps = {
  /** Ordered by nombre. */
  iglesias: IglesiaDelAdmin[];
};

/** The tab Iglesias: every iglesia of the asociacion with its distrito, and a search. */
export function IglesiasTab({ iglesias }: IglesiasTabProps) {
  const router = useRouter();
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
                {iglesia.distritoNombre} · {iglesia.localidad}
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
    </>
  );
}
