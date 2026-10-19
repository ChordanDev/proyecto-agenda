// react-test-renderer is deprecated in React 19; when React is upgraded, move
// this test to renderHook from @testing-library/react-native.
import { act, create, type ReactTestRenderer } from 'react-test-renderer';

import { ESPERA_MS, TIMEOUT_MS, useUbicacionEstimada } from './useUbicacionEstimada';

const mockGeocode = jest.fn();
jest.mock('expo-location', () => ({
  geocodeAsync: (direccion: string) => mockGeocode(direccion),
}));

const DIRECCION = 'Pringles 820, San Luis, San Luis, Argentina';

let renderer: ReactTestRenderer | undefined;

function render(direccion: string | null) {
  const latest: { current: ReturnType<typeof useUbicacionEstimada> | null } = { current: null };
  const onEncontrada = jest.fn();

  function Probe() {
    latest.current = useUbicacionEstimada(direccion, onEncontrada);
    return null;
  }

  act(() => {
    renderer = create(<Probe />);
  });

  return { estado: () => latest.current!, onEncontrada };
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

describe('useUbicacionEstimada', () => {
  it('ends as noEncontrada when the geocoder of the phone fails', async () => {
    mockGeocode.mockRejectedValueOnce(new Error('Service not available'));
    const { estado, onEncontrada } = render(DIRECCION);

    await act(async () => jest.advanceTimersByTime(ESPERA_MS));

    expect(estado().status).toBe('noEncontrada');
    expect(onEncontrada).not.toHaveBeenCalled();
  });

  it('ends as noEncontrada when the geocoder takes longer than the timeout', async () => {
    mockGeocode.mockReturnValueOnce(new Promise(() => {}));
    const { estado, onEncontrada } = render(DIRECCION);

    await act(async () => jest.advanceTimersByTime(ESPERA_MS));
    expect(estado().status).toBe('buscando');

    await act(async () => jest.advanceTimersByTime(TIMEOUT_MS));

    expect(estado().status).toBe('noEncontrada');
    expect(onEncontrada).not.toHaveBeenCalled();
  });

  it('leaves no timeout running once the geocoder answers', async () => {
    mockGeocode.mockResolvedValueOnce([{ latitude: -33.3, longitude: -66.34 }]);
    const { estado } = render(DIRECCION);

    await act(async () => jest.advanceTimersByTime(ESPERA_MS));

    expect(estado().status).toBe('encontrada');
    // Runs the zero-delay work React leaves behind; only a timeout could remain.
    act(() => jest.advanceTimersByTime(0));
    expect(jest.getTimerCount()).toBe(0);
  });
});
