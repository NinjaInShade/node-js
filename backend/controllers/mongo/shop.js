const Product = require("../../models/mongo/Product");
const Order = require("../../models/mongo/Order");
const stripe = require("stripe")(process.env.STRIPE_API_KEY);
const pdf_document = require("pdfkit");
const fs = require("fs");
const path = require("path");

const items_per_page = 3;

// GET Reqs
function get_index(req, res, next) {
  const page = parseInt(req.query.page) || 1;
  let total_products;

  Product.find()
    .countDocuments()
    .then((num) => {
      total_products = num;

      return Product.find()
        .skip((page - 1) * items_per_page)
        .limit(items_per_page);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Products",
        path: "/",
        hasProducts: products.length > 0,
        total_products,
        has_next_page: items_per_page * page < total_products,
        has_previous_page: page > 1,
        current_page: page,
        next_page: page + 1,
        previous_page: page - 1,
        highest_page: Math.ceil(total_products / items_per_page),
      });
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \Finding all products operation failed.`);
      console.log(err);
      error.httpStatusCode = 500;
      return next(error);
    });
}

function get_cart(req, res, next) {
  req.user
    .get_cart()
    .then((cart) => {
      res.render("shop/cart", {
        pageTitle: "Cart",
        path: "/cart",
        total_price: cart.total_price,
        products: cart.products,
      });
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nGetting cart operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

function get_checkout(req, res, next) {
  let total_price;
  let products;

  req.user
    .get_cart()
    .then((cart) => {
      total_price = cart.total_price;
      products = cart.products;

      return stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: products.map((prod) => {
          return {
            price_data: {
              currency: "gbp",
              product_data: {
                name: prod.title,
                description: prod.description,
              },
              unit_amount: parseInt(prod.price) * 100,
            },
            quantity: 1,
          };
        }),
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get("host")}/checkout/cancel`,
      });
    })
    .then((stripe_session) => {
      res.render("shop/checkout", {
        pageTitle: "Checkout",
        path: "/checkout",
        products,
        total_price,
        session_id: stripe_session.id,
      });
    })
    .catch((err) => {
      console.log("ERROR", err);
      const error = new Error(`ERROR: ${err}, \nGetting cart operation failed.`);
      error.httpStatusCode = 500;
      return next(error);
    });
}

function get_orders(req, res, next) {
  let total_price = 0;

  Order.find({ user_id: req.user._id })
    .then((orders) => {
      for (let order of orders) {
        for (let order_item of order.products) {
          total_price += order_item.price * order_item.quantity;
        }
      }

      res.render("shop/orders", {
        pageTitle: "Orders",
        path: "/orders",
        orders,
        total_price,
      });
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nFinding an order operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

function get_invoice(req, res, next) {
  const order_id = req.params.orderId;

  const invoice_file = `invoice-${order_id}.pdf`;
  const invoice_path = path.join("data", "invoices", invoice_file);

  Order.findById(order_id)
    .then((order) => {
      if (!order) {
        return res.redirect("/orders");
      }

      if (order.user_id.toString() !== req.user._id.toString()) {
        return res.redirect("/orders");
      }

      let total_price = 0;

      const pdf_doc = new pdf_document();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${invoice_file}"`);

      pdf_doc.pipe(fs.createWriteStream(invoice_path));
      pdf_doc.pipe(res);

      pdf_doc.fontSize(35).text("Invoice file", { underline: true });
      pdf_doc.text("--------------");
      order.products.forEach((prod) => {
        total_price += prod.quantity * prod.price;
        pdf_doc.fontSize(24).text(`${prod.title} - £${prod.price} x ${prod.quantity}`);
      });

      pdf_doc.fontSize(28).text(`Total price: £${total_price}`);

      pdf_doc.end();
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nFinding an order operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

// POST Reqs
function post_cart(req, res, next) {
  const productID = req.body.productID;

  // Get product info
  req.user
    .add_to_cart(productID)
    .then((result) => {
      console.log("Successfully added to cart");
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nAdding to cart operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

function post_remove_cart(req, res, next) {
  const productID = req.params.productID;

  req.user
    .delete_from_cart(productID)
    .then(() => {
      res.redirect("/cart");
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nRemoving from cart operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

function post_create_order(req, res, next) {
  req.user
    .populate("cart.items.product_id")
    .execPopulate()
    .then((populated_user) => {
      const products = populated_user.cart.items.map((item) => {
        return { ...item.product_id._doc, quantity: item.quantity };
      });
      const order = new Order({ products, user_id: req.user._id });

      return order.save();
    })
    .then((result) => {
      req.user.cart.items = [];
      return req.user.save();
    })
    .then((result) => {
      console.log("Successfully created order");
      res.redirect("/orders");
    })
    .catch((err) => {
      const error = new Error(`ERROR: ${err}, \nCreating order operation failed.`);
      error.httpStatusCode(500);
      return next(error);
    });
}

module.exports = { get_index, get_cart, get_checkout, get_orders, post_cart, post_remove_cart, post_create_order, get_invoice };