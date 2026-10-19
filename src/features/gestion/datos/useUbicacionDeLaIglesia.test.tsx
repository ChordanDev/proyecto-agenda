// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import type { Punto } from '@/features/iglesias/dominio/distancia';

import { useUbicacionDeLaIglesia } from './useUbicacionDeLaIglesia';
import { ESPERA_MS, TIMEOUT_MS } from './useUbicacionEstimada';

// The geocoder of the phone, answered by each test when it wants.
const mockGeocode = jest.fn();
jest.mock('expo-location', () => ({
  geocodeAsync: (direccion: string) => mockGeocode(direccion),
}));

type Textos = { direccion: string; ciudad: string; provincia: string };

const COMPLETA: Textos = { direccion: 'Pringles 820', ciudad: 'San Luis', provincia: 'San Luis' };
const GUARDADO: Punto = { latitud: -33.2955, longitud: -66.3356 };
const ESTIMADO = { latitude: -33.3, longitude: -66.34 };
const A_MANO: Punto = { latitud: -33.29, longitud: -66.33 };

let renderer: ReactTestRenderer | undefined;

function render(textos: Textos, guardada: Punto | null) {
  const latest: { current: ReturnType<typeof useUbicacionDeLaIglesia> | null } = { current: null };

  function Probe(props: { textos: Textos }) {
    latest.current = useUbicacionDeLaIglesia(props.textos, guardada);
    return null;
  }

  act(() => {
    renderer = create(<Probe textos={textos} />);
  });

  return {
    hook: () => latest.current!,
    escribir: (nuevos: Textos) => act(() => renderer!.update(<Probe textos={nuevos} />)),
  };
}

/** A geocode the test resolves by hand, after doing something else. */
function geocodePendiente() {
  let resolver: (resultado: unknown[]) => void = () => {};
  mockGeocode.mockReturnValueOnce(new Promise((resolve) => (resolver = resolve)));
  return (resultado: unknown[]) => act(async () => resolver(resultado));
}

beforeEach(() => {
  jest.useFakeTimers();
  mockGeocode.mockReset();
});

afterEach(() => {
  act(() => renderer?.unmount());
  renderer = undefined;
  jest.useRealTimers();
});

describe('useUbicacionDeLaIglesia', () => {
  it('places the marker at the estimated location of a new direccion', async () => {
    const responder = geocodePendiente();
    const { hook } = render(COMPLETA, null);

    act(() => jest.advanceTimersByTime(ESPERA_MS));
    expect(hook().estimada.status).toBe('buscando');
    expect(mockGeocode).toHaveBeenCalledWith('Pringles 820, San Luis, San Luis, Argentina');

    await responder([ESTIMADO]);

    expect(hook().coordenadas).toEqual({ latitud: -33.3, longitud: -66.34 });
    expect(hook().estimada.status).toBe('idle');
  });

  it('keeps the point the admin placed while the direccion was being looked for', async () => {
    const responder = geocodePendiente();
    const { hook } = render(COMPLETA, null);

    act(() => jest.advanceTimersByTime(ESPERA_MS));
    act(() => hook().moverMarcador(A_MANO));
    await responder([ESTIMADO]);

    expect(hook().coordenadas).toEqual(A_MANO);
  });

  it('keeps the saved point of an iglesia when the admin writes its missing provincia', () => {
    const { hook, escribir } = render({ ...COMPLETA, provincia: '' }, GUARDADO);

    escribir({ ...COMPLETA, provincia: 'S' });
    escribir(COMPLETA);
    act(() => jest.advanceTimersByTime(ESPERA_MS));

    expect(mockGeocode).not.toHaveBeenCalled();
    expect(hook().coordenadas).toEqual(GUARDADO);
  });

  it('looks again when the direccion of a saved iglesia changes', async () => {
    const responder = geocodePendiente();
    const { hook, escribir } = render(COMPLETA, GUARDADO);

    escribir({ ...COMPLETA, direccion: 'Pringles 900' });
    act(() => jest.advanceTimersByTime(ESPERA_MS));
    await responder([ESTIMADO]);

    expect(hook().coordenadas).toEqual({ latitud: -33.3, longitud: -66.34 });
  });

  it('shows the search again when the admin goes back to a direccion that was not found', async () => {
    const noEncontrada = geocodePendiente();
    const { hook, escribir } = render(COMPLETA, GUARDADO);

    escribir({ ...COMPLETA, direccion: 'Pringles 900' });
    act(() => jest.advanceTimersByTime(ESPERA_MS));
    await noEncontrada([]);
    expect(hook().estimada.status).toBe('noEncontrada');

    geocodePendiente();
    escribir({ ...COMPLETA, direccion: 'Pringles 90' });
    escribir({ ...COMPLETA, direccion: 'Pringles 900' });

    expect(hook().estimada.status).toBe('buscando');
    expect(hook().marcadorAlDia).toBe(false);
  });

  it('asks for the marker by hand after a new direccion is not found', async () => {
    const responder = geocodePendiente();
    const { hook, escribir } = render(COMPLETA, GUARDADO);
    expect(hook().marcadorAlDia).toBe(true);

    escribir({ ...COMPLETA, direccion: 'Calle que no existe' });
    act(() => jest.advanceTimersByTime(ESPERA_MS));
    await responder([]);
    expect(hook().marcadorAlDia).toBe(false);

    act(() => hook().moverMarcador(A_MANO));
    expect(hook().marcadorAlDia).toBe(true);
    expect(hook().coordenadas).toEqual(A_MANO);
  });

  it('keeps the marker and tells it when the direccion is not found', async () => {
    const responder = geocodePendiente();
    const { hook, escribir } = render(COMPLETA, GUARDADO);

    escribir({ ...COMPLETA, direccion: 'Calle que no existe' });
    act(() => jest.advanceTimersByTime(ESPERA_MS));
    await responder([]);

    expect(hook().coordenadas).toEqual(GUARDADO);
    expect(hook().estimada.status).toBe('noEncontrada');
  });

  it('asks for the marker by hand after the geocoder of the phone fails', async () => {
    mockGeocode.mockRejectedValueOnce(new Error('Service not available'));
    const { hook, escribir } = render(COMPLETA, GUARDADO);

    escribir({ ...COMPLETA, direccion: 'Pringles 900' });
    await act(async () => jest.advanceTimersByTime(ESPERA_MS));
    expect(hook().estimada.status).toBe('noEncontrada');
    expect(hook().marcadorAlDia).toBe(false);

    act(() => hook().moverMarcador(A_MANO));
    expect(hook().marcadorAlDia).toBe(true);
  });

  it('asks for the marker by hand after the geocoder takes longer than the timeout', async () => {
    mockGeocode.mockReturnValueOnce(new Promise(() => {}));
    const { hook, escribir } = render(COMPLETA, GUARDADO);

    escribir({ ...COMPLETA, direccion: 'Pringles 900' });
    await act(async () => jest.advanceTimersByTime(ESPERA_MS + TIMEOUT_MS));
    expect(hook().estimada.status).toBe('noEncontrada');
    expect(hook().marcadorAlDia).toBe(false);

    act(() => hook().moverMarcador(A_MANO));
    expect(hook().marcadorAlDia).toBe(true);
  });
});
