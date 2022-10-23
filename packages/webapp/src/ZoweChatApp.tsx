/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppBar, Box, Container, Toolbar } from '@mui/material';
import * as React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { chatAuthProvider } from './auth/api/auth';
import { LoginResponse } from './auth/api/LoginResponse';
import { AuthContext, useAuth } from './auth/context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { ManagementPage } from './pages/ManagementPage';
import { AppRoutes } from './routes/AppRoutes';
//              <!-- <Route path={AppRoutes.Home} element={<PublicPage />} /> -->

export default function ZoweChatApp() {
    return (
        <Container maxWidth="sm">
            <AuthProvider>
                <AppBar position="fixed">
                    <Toolbar variant="dense">Zowe Chat Login</Toolbar>
                </AppBar>
                <Toolbar />
                <Box textAlign="center" component="span">
                    <h1>Welcome to Zowe Chat</h1>
                    <Routes>
                        <Route path={AppRoutes.Root} element={<Layout />}>   </Route>
                        <Route path={AppRoutes.Login} element={<LoginPage />} />
                        <Route path={AppRoutes.Login + '/:loginSession'} element={<LoginPage />} />
                        <Route path={AppRoutes.Management}
                            element={
                                <RequireAuth>
                                    <ManagementPage />
                                </RequireAuth>
                            }
                        />
                        <Route path="*" element={<Navigate to={AppRoutes.Root} replace />} />
                    </Routes>
                </Box>
            </AuthProvider>
        </Container>
    );
}


function AuthProvider({ children }: { children: React.ReactNode; }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = React.useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [errorResponse, setError] = React.useState<any>(null);

    const signin = (challenge: string, newUser: string, newPass: string, callback: VoidFunction) => {
        return chatAuthProvider.signin(challenge, newUser, newPass, (response: LoginResponse) => {
            if (response.success) {
                setUser(newUser);
                setError(null);
            } else {
                setUser(null);
                setError(response.serverResponse);
            }
            callback();
        });
    };

    const signout = (callback: VoidFunction) => {
        return chatAuthProvider.signout(() => {
            setUser(null);
            setError(null);
            callback();
        });
    };
    const value = { user, errorResponse, signin, signout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
function Layout(props: any) {
    const login = useAuth();
    const location = useLocation();
    if (login.user !== null) {
        return <Navigate to={AppRoutes.Management} state={{ from: location }} replace />;
    }
    return <Navigate to={AppRoutes.Login} state={{ from: location }} replace />;
}

function RequireAuth({ children }: { children: JSX.Element; }) {
    const auth = useAuth();
    const location = useLocation();

    if (!auth.user) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to={AppRoutes.Login} state={{ from: location }} replace />;
    }

    return children;
}
