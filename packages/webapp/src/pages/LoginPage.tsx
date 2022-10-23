/*
* This program and the accompanying materials are made available under the terms of the
* Eclipse Public License v2.0 which accompanies this distribution, and is available at
* https://www.eclipse.org/legal/epl-v20.html
*
* SPDX-License-Identifier: EPL-2.0
*
* Copyright Contributors to the Zowe Project.
*/

import { Alert, Button, TextField } from '@mui/material';
import { Buffer } from 'buffer';
import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/context/AuthContext';

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const auth = useAuth();
    let alertState;
    let loginForm;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    const [searchParams, setSearchParams] = useSearchParams();

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore - the 'state' is type unknown which typescript complains about
    const from = location.state?.from?.pathname || '/';

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const challengeKey = searchParams.get('__key');
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        auth.signin(challengeKey!, username, password, () => {
            // Send them back to the page they tried to visit when they were
            // redirected to the login page. Use { replace: true } so we don't create
            // another entry in the history stack for the login page.  This means that
            // when they get to the protected page and click the back button, they
            // won't end up back on the login page, which is also really nice for the
            // user experience.

            if (auth.user) {
                navigate(from, { replace: true });
            }
        });
    }

    /*    if (auth.user) {
            return <Navigate to={AppRoutes.Management} state={{ from: location }} replace />;
        }
    */

    let loginHint;


    if (!auth.user) {
        const loginHash = searchParams.get('__key');

        if (loginHash === undefined || loginHash === null || loginHash.trim().length === 0) {
            loginHint = <Alert severity="warning">You are logging in without being sent here by Zowe ChatBot. Please use a link provided by the Bot.</Alert>;
        } else {
            const userInfo = Buffer.from(loginHash, 'base64').toString().split(':');
            // eslint-disable-next-line max-len
            loginHint = <p text-align="center">Welcome, {userInfo[0]}. <br /><br />Please login with your Mainframe ID to authenticate your use of Zowe ChatBot.</p>;
        }

        if (auth.errorResponse) {
            loginHint = '';
            alertState = <Alert severity="error">Encoutered an error logging in. Please check your input and try again.</Alert>;
        }

        loginForm = <form onSubmit={handleSubmit}>
            <div>
                <label>
                    Username <br />
                </label>
                <TextField size="small" name="username" type="text" required />
                {' '}
            </div>
            <br />
            <div>
                <label>
                    Password <br />
                </label>
                <TextField size="small" type="password" name="password" required />
                {' '}

            </div>
            <br />
            <div>
                <Button variant="contained" type="submit">Login</Button>
            </div>
        </form>;
    } else {
        loginForm = '';
        alertState = <Alert severity="success">You have been logged in. You may return to Zowe ChatBot!</Alert>;
    }


    return (
        <div id="login">
            <div text-align="center">
                {loginHint}
            </div>
            {alertState}
            <br />
            {loginForm}
        </div>
    );
}
