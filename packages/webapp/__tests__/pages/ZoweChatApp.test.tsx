/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { render, screen } from '@testing-library/react';
import ZoweChatApp from '../../src/ZoweChatApp';
import { BrowserRouter } from 'react-router-dom';

test('renders Zowe Chat Login Text', () => {
  render(
    <BrowserRouter>
      <ZoweChatApp />
    </BrowserRouter>,
  );
  const linkElement = screen.getByText(/Zowe Chat Login/i);
  expect(linkElement).toBeInTheDocument();
});
