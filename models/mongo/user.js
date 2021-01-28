const get_db = require("../../util/database").mongo_get_db;
const mongo_db = require("mongodb");

class User {
  constructor(name, email, cart, _id) {
    this.name = name;
    this.email = email;
    this.cart = cart; // {items: [{prod_data, quantity}...]}
    this._id = _id;
  }

  save() {
    const db = get_db();

    return db.collection("users").insertOne(this);
  }

  add_to_cart(product) {
    const db = get_db();
    const existing_cart_product = this.cart.items.findIndex((item) => {
      return item.product_id.toString() === product._id.toString();
    });

    let updated_cart = { items: [...this.cart.items] };

    if (existing_cart_product === -1) {
      // Create new product
      updated_cart = { items: [...this.cart.items, { product_id: product._id, quantity: 1 }] };

      return db.collection("users").updateOne({ _id: new mongo_db.ObjectId(this._id) }, { $set: { cart: updated_cart } });
    } else {
      // Update quantity
      updated_cart.items[existing_cart_product] = {
        product_id: product._id,
        quantity: parseInt(updated_cart.items[existing_cart_product].quantity) + 1,
      };

      return db.collection("users").updateOne({ _id: new mongo_db.ObjectId(this._id) }, { $set: { cart: updated_cart } });
    }
  }

  get_cart() {
    const db = get_db();
    const product_ids = this.cart.items.map((item) => {
      return item.product_id;
    });
    let total_price = 0;

    return db
      .collection("products")
      .find({ _id: { $in: product_ids } })
      .toArray()
      .then((products) => {
        const products_arr = products.map((prod) => {
          return { ...prod, quantity: this.cart.items.find((item) => item.product_id.toString() === prod._id.toString()).quantity };
        });

        products_arr.forEach((item) => {
          total_price += item.price * item.quantity;
        });

        return {
          total_price,
          products: products_arr,
        };
      });
  }

  delete_from_cart(product_id) {
    const db = get_db();
    const updated_cart = { items: [...this.cart.items] };

    const item_to_remove_index = updated_cart.items.findIndex((item) => item.product_id.toString() === product_id.toString());

    updated_cart.items.splice(item_to_remove_index, 1);

    return db.collection("users").updateOne({ _id: new mongo_db.ObjectId(this._id) }, { $set: { cart: updated_cart } });
  }

  add_order() {
    const db = get_db();

    return this.get_cart()
      .then((cart) => {
        const order = {
          items: cart.products,
          user_id: mongo_db.ObjectId(this._id),
          total_price: cart.total_price,
        };

        return db
          .collection("orders")
          .insertOne(order)
          .then((result) => {
            this.cart = { items: [] };

            return db.collection("users").updateOne({ _id: new mongo_db.ObjectId(this._id) }, { $set: { cart: { items: [] } } });
          })
          .catch((err) => console.log(err));
      })
      .catch((err) => console.log(err));
  }

  get_orders() {
    const db = get_db();

    return db.collection("orders").find({ user_id: this._id }).toArray();
  }

  static findById(user_id) {
    const db = get_db();

    return db
      .collection("users")
      .find({ _id: new mongo_db.ObjectId(user_id) })
      .next();
  }
}

module.exports = User;
