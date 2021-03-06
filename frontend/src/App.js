import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import axios from "axios";
import Navbar from "./components/Navbar/Navbar";
import Unmatched from "./components/pages/Unmatched/Unmatched";
import ProductsList from "./components/pages/ProductsList/ProductsList";
import ProtectedRoute from "./components/ProtectedRoute";
import Cart from "./components/pages/Cart/Cart";
import ProductDetail from "./components/pages/ProductDetail/ProductDetail";
import AddOrEditProduct from "./components/pages/AddOrEditProduct/AddOrEditProduct";
import Profile from "./components/pages/Profile/Profile";
import ResetPassword from "./components/pages/ResetPassword/ResetPassword";
import ResetPasswordConfirm from "./components/pages/ResetPasswordConfirm/ResetPasswordConfirm";
import AuthContext from "./AuthContext";

import "./App.css";

function App() {
  const [auth, setAuth] = useState({
    isAuth: false,
    token: undefined,
    user: {
      name: undefined,
      user_id: undefined,
      cart: undefined,
      is_admin: undefined,
    },
  });

  useEffect(() => {
    const user_id = localStorage.getItem("user-id");
    const token = localStorage.getItem("auth-token");

    if (user_id) {
      axios
        .get(`${process.env.REACT_APP_API_DOMAIN}user/${user_id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          const data = response.data;

          setAuth({
            isAuth: true,
            token,
            user: { name: data.user.name, email: data.user.email, cart: data.user.cart, is_admin: data.user.is_admin, id: data.user.user_id },
          });
        })
        .catch((error) => {
          return console.log(error);
        });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ auth, setAuth }}>
      <Router>
        <Navbar />
        <Switch>
          <Route path="/" exact>
            <ProductsList admin={false} />
          </Route>
          <ProtectedRoute path="/cart" exact={true} component={<Cart />} />
          <Route path="/reset-confirm/:tokenid/:user_id" exact>
            <ResetPasswordConfirm />
          </Route>
          <Route path="/reset" exact>
            <ResetPassword />
          </Route>
          <Route path="/products" exact>
            <ProductsList admin={false} />
          </Route>
          <Route path="/products/detail/:prod_id" exact>
            <ProductDetail />
          </Route>
          <Route path="/profile" exact>
            <Profile />
          </Route>
          <ProtectedRoute path="/admin/edit-product/:prod_id" exact={true} component={<AddOrEditProduct />} />
          <ProtectedRoute path="/admin/add-product" exact={true} component={<AddOrEditProduct add />} />
          <ProtectedRoute path="/admin/products" exact={true} component={<ProductsList admin={true} />} />
          <Route>
            <Unmatched />
          </Route>
        </Switch>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
