import React from 'react';
import { render as rtlRender } from '@testing-library/react';
import { Provider } from 'react-redux';
import { store } from '../store';
import { MemoryRouter } from 'react-router-dom';

interface RenderOptions {
  initialEntries?: string[];
  [key: string]: any;
}

function render(
  ui: React.ReactElement,
  { initialEntries = ['/'], ...renderOptions }: RenderOptions = {}
) {
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
      </Provider>
    );
  }
  return rtlRender(ui, { wrapper: Wrapper, ...renderOptions });
}

export * from '@testing-library/react';
export { render };
