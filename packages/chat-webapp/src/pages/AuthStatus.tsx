import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/context/AuthContext";
import { AppRoutes } from "../routes/AppRoutes";

export function AuthStatus() {
    let auth = useAuth();
    let navigate = useNavigate();

    if (!auth.user) {
        return <p>You are not logged in.</p>;
    }

    return (
        <p>
            Welcome {auth.user}!{" "}
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