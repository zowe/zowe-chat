/*
 * This program and the accompanying materials are made available under the terms of the
 * Eclipse Public License v2.0 which accompanies this distribution, and is available at
 * https://www.eclipse.org/legal/epl-v20.html
 *
 * SPDX-License-Identifier: EPL-2.0
 *
 * Copyright Contributors to the Zowe Project.
 */

import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context/AuthContext';
import { AppRoutes } from '../routes/AppRoutes';

export function AuthStatus() {
    const auth = useAuth();
    const navigate = useNavigate();

    if (!auth.user) {
        return <p>You are not logged in.</p>;
    }

    return (
        <p>
            Welcome {auth.user}!{' '}
            <button
                onClick={() => {
                    auth.signout(() => navigate(AppRoutes.Root));
                }}
            >
                Sign out
            </button>
        </p>
    );
}
