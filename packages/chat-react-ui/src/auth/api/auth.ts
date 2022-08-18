
import * as axios from "axios";

// TODO: Investigate/fix
// const API_HOST = (process.env.CHAT_API_HOST) ? process.env.CHAT_API_HOST : "";
console.log(process.env)
/*
* This represents some generic auth provider API, like Firebase.
*/
const fakeAuthProvider = {
  isAuthenticated: false,
  signin(callback: VoidFunction) {
    fakeAuthProvider.isAuthenticated = true;
    setTimeout(callback, 100); // fake async
  },
  signout(callback: VoidFunction) {
    fakeAuthProvider.isAuthenticated = false;
    setTimeout(callback, 100);
  },
};

const chatAuthProvider = {
  isAuthenticated: false,
  signin(user: string, password: string, callback: (success: boolean) => void) {
    // use axios to authenticate
    axios.default.post(`http://localhost:7701/api/v1/auth/login`, {
      user: user,
      password: password,
    }).then((response) => {
      console.log(response)
      chatAuthProvider.isAuthenticated = true;
      callback(true)
    }).catch((error) => {
      console.log(error)
      chatAuthProvider.isAuthenticated = false;
      callback(false)
    });
  },
  signout(callback: VoidFunction) {
    chatAuthProvider.isAuthenticated = false;
    callback()
  }
}

export { chatAuthProvider };
