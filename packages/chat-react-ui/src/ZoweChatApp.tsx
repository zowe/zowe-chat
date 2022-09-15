import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { AppBar, Box, Container, Toolbar } from '@mui/material';
import * as React from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { chatAuthProvider } from "./auth/api/auth";
import { LoginResponse } from "./auth/api/LoginResponse";
import { AuthContext, useAuth } from "./auth/context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { ManagementPage } from "./pages/ManagementPage";
import { AppRoutes } from "./routes/AppRoutes";
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
                        <Route path={AppRoutes.Login + "/:loginSession"} element={<LoginPage />} />
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


function AuthProvider({ children }: { children: React.ReactNode }) {
    let [user, setUser] = React.useState<any>(null)
    let [errorResponse, setError] = React.useState<any>(null)

    let signin = (challenge: string, newUser: string, newPass: string, callback: VoidFunction) => {
        return chatAuthProvider.signin(challenge, newUser, newPass, (response: LoginResponse) => {
            if (response.success) {
                setUser(newUser)
                setError(null)
            } else {
                setUser(null)
                setError(response.serverResponse)
            }
            callback();
        });
    };

    let signout = (callback: VoidFunction) => {
        return chatAuthProvider.signout(() => {
            setUser(null)
            setError(null)
            callback();
        });
    };
    let value = { user, errorResponse, signin, signout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}



function Layout(props: any) {
    console.log("props" + JSON.stringify(props))
    let login = useAuth()
    console.log("Login State: " + JSON.stringify(login));
    let location = useLocation();
    if (login.user !== null) {
        return <Navigate to={AppRoutes.Management} state={{ from: location }} replace />;
    }
    return <Navigate to={AppRoutes.Login} state={{ from: location }} replace />;
}

function RequireAuth({ children }: { children: JSX.Element }) {
    let auth = useAuth();
    let location = useLocation();

    if (!auth.user) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to={AppRoutes.Login} state={{ from: location }} replace />;
    }

    return children;
}

