const Product = require("../models/product");
const Cart = require("../models/cart");

// GET Reqs
function get_index(req, res, next) {
  Product.findAll()
    .then((result) => {
      res.render("shop/product-list", {
        prods: result,
        pageTitle: "Products",
        path: "/",
        hasProducts: result.length > 0,
      });
    })
    .catch((err) => {
      console.log(err);
    });
}

function get_cart(req, res, next) {
  req.user
    .getCart()
    .then((cart) => {
      return cart
        .getProducts()
        .then((products) => {
          res.render("shop/cart", {
            pageTitle: "Cart",
            path: "/cart",
            // total_price: cart.total_price,
            products,
          });
        })
        .catch((err) => console.log(err));
    })
    .catch((err) => console.log(err));
}

function get_checkout(req, res, next) {
  res.render("shop/checkout", {
    pageTitle: "Checkout",
    path: "/checkout",
  });
}

function get_orders(req, res, next) {
  res.render("shop/orders", {
    pageTitle: "Orders",
    path: "/orders",
  });
}

// POST Reqs
function post_cart(req, res, next) {
  const productID = req.body.productID;
  let fetched_cart;

  req.user
    .getCart()
    .then((cart) => {
      fetched_cart = cart;

      return cart.getProducts({ where: { id: productID } });
    })
    .then((products) => {
      let product;
      let newQuantity = 1;

      if (products.length > 0) {
        product = products[0];
      }

      if (product) {
        newQuantity += 1;
      }

      return Product.findByPk(productID)
        .then((product) => {
          return fetched_cart.addProduct(product, { through: { quantity: newQuantity } });
        })
        .catch((err) => console.log(err));
    })
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => console.log(err));
}

function post_remove_cart(req, res, next) {
  const productID = req.params.productID;

  Cart.remove(productID);

  res.redirect("/cart");
}

module.exports = { get_index, get_cart, get_checkout, get_orders, post_cart, post_remove_cart };