import * as React from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { AppRoutes } from "../../routes/AppRoutes";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
    let navigate = useNavigate();
    let location = useLocation();
    let auth = useAuth();

    // @ts-ignore - the 'state' is type unknown which typescript complains about
    let from = location.state?.from?.pathname || "/";

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        let formData = new FormData(event.currentTarget);
        let username = formData.get("username") as string;
        let password = formData.get("password") as string;

        auth.signin(username, password, () => {
            // Send them back to the page they tried to visit when they were
            // redirected to the login page. Use { replace: true } so we don't create
            // another entry in the history stack for the login page.  This means that
            // when they get to the protected page and click the back button, they
            // won't end up back on the login page, which is also really nice for the
            // user experience.
            navigate(from, { replace: true });
        });
    }

    if (auth.user) {
        return <Navigate to={AppRoutes.Management} state={{ from: location }} replace />;
    }

    return (
        <div id="login">
            <form onSubmit={handleSubmit}>
                <div>
                    <label>
                        Username <br />
                    </label>
                    <input name="username" type="text" required />
                    {" "}
                </div>
                <br />
                <div>
                    <label>
                        Password <br />
                    </label>
                    <input type="password" name="password" required />
                    {" "}

                </div>
                <br />
                <div>
                    <button type="submit">Login</button>
                </div>
            </form>
        </div>
    );
}



