import React, { useContext } from "react";
import AuthForm from "./AuthForm";
import OrderTable from "../../OrderTable/OrderTable";
import authContext from "../../../AuthContext";

import "./Profile.css";

export default function Profile() {
  const { auth, setAuth } = useContext(authContext);

  if (!auth.isAuth) {
    return (
      <main className="page-center">
        <AuthForm />
      </main>
    );
  }

  function logout(e) {
    e.preventDefault();

    localStorage.clear();
    setAuth({
      isAuth: false,
      token: undefined,
      user: {
        name: undefined,
        user_id: undefined,
        cart: undefined,
        is_admin: undefined,
      },
    });
  }

  return (
    <main className="page-center">
      <div className="profile-container">
        <div className="profile-info">
          <div>
            <h1 className="profile-name">{auth.user.name}</h1>
            <h2 className="profile-email">{auth.user.email}</h2>
          </div>
          <button className="profile-logout flex" onClick={(e) => logout(e)}>
            <p>Log out</p>
            <span className="material-icons">logout</span>
          </button>
        </div>
        <h2 className="orders-text">Orders</h2>
        <OrderTable />
      </div>
    </main>
  );
}
