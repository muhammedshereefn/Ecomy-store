const { sendOtp } = require("../models/nodemailer");
const { Product } = require("../models/product");
const User = require("../models/userModel");
const category = require("../models/category");
const Address = require("../models/addressModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const { Readable } = require("stream");
const bcrypt = require('bcryptjs')
const nodemailer = require('nodemailer');


require('dotenv').config();
const loadRegister = async (req, res) => {
  try {
    res.render("registration", { message: "", errMessage: "" });
  } catch (error) {
    console.log(error.message);
  }
};

const insertUser = async (req, res) => {
  try {
    const email = req.body.email;
    const checkData = await User.findOne({ email: email });

    if (checkData) {
      res.render("registration", {
        errMessage: "User already found",
        message: "",
      });
    } else {
      const user = new User({
        name: req.body.name,
        email: req.body.email,
        mobile: req.body.mobile,
      });
      await user.save(); 
      req.session.otp = sendOtp(user.email);
      req.session.userData = user;
      res.redirect("/login");
    }
  } catch (error) {
    console.log(error.message);
  }
};

const loaddLogin = async (req, res) => {
  try {

    const cata = await category.find();

    // Prepare category-wise products
    const categoryProducts = await Promise.all(
      cata.map(async (cat) => {
        const products = await Product.find({ category: cat.name, status: true }).limit(20)
        return { category: cat.name, products };
      })
    );

    const bestSellerProducts = await Product.find({ status: true, bestseller: true }).sort({ price: 1 });

    res.render("home", {
      message: "",
      userId: req.session.user_id ? req.session.user_id : "",
      cata,
      bestSellerProducts,
      categoryProducts,
      userName: " PLease login",
    });
  } catch (error) {
    console.log(error.message);
  }
};

const loadLogin = async (req, res) => {
  try {
    if (req.session.user_id) {
      return res.redirect("/home"); 
    }
    res.render("login", { message: "" });
  } catch (error) {
    console.log(error.message);
  }
};

const verfiyUser = async (req, res) => {
  try {
    const email = req.body.email;
    const userData = await User.findOne({ email: email });
    if (userData) {
        if (userData.isBlocked === false) {
          req.session.user_id = userData._id;
          res.redirect("/home");
        } else {
            res.render("login", { message: "User is blocked. Please contact support for assistance." });
        }
    } else {
      res.render("login", { message: "Invalid email or password" });
    }
  } catch (error) {
    console.log(error);
  }
};

const loadHome = async (req, res) => {
  try {
    let user = { name: "For better experience please login" };
    if (req.session) {
      const userId = req.session.user_id;
      user = await User.findOne({ _id: userId });
    }

    // const products = await Product.find({ status: true }).sort({ price: 1 })
    const cata = await category.find();
    const bestSellerProducts = await Product.find({ status: true, bestseller: true }).sort({ price: 1 });

        // Prepare category-wise products
        const categoryProducts = await Promise.all(
          cata.map(async (cat) => {
            const products = await Product.find({ category: cat.name, status: true })
            .limit(20);
            return { category: cat.name, products };
          })
        );
    

    res.render("home", {
      userId: req.session.user_id ? req.session.user_id : "",
      // products,
      cata,
      categoryProducts,
      userName: user.name,
      bestSellerProducts
    });
  } catch (error) {
    console.log(error);
  }
};

const categoryWiseProducts = async (req, res) => {
  try {
    const categoryName = req.params.categoryName;

    // Find all products matching the category
    const products = await Product.find({ category: categoryName, status: true }).sort({ price: 1 });
    const cata = await category.find();

        // Prepare category-wise products
        const categoryProducts = await Promise.all(
          cata.map(async (cat) => {
            const products = await Product.find({ category: cat.name, status: true });
            return { category: cat.name, products };
          })
        );
    
    // Fetch categories to display in the view
    const categories = await category.find();
    

    // Render the view with the category products
    res.render("categoryWiseProducts", {
      userId: req.session.user_id ? req.session.user_id : "",
      categoryName,
      products,
      categories,
      categoryProducts
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



const userLogout = async (req, res) => {
  try {
    req.session.user_id = null;
    res.redirect("/");
  } catch (error) {
    console.log(error.message);
  }
};

const loadProductDetails = async (req, res) => {
  try {
    const productId = req.params.id;
    const productdetails = await Product.findById(productId);

    const productCategory = productdetails.category;
   
    const sameCategoryProducts = await Product.find({
      _id: { $ne: productId }, // Exclude the current product
      category: productCategory, // Filter by the same category
    }).limit(4); // Fetch up to 6 products from the same category

   
   const baseName = productdetails.name.replace(/(\s*\(.*\))$/, '').trim(); // Remove color part (e.g., " (Red)")

   // Fetch similar products that have the same base name but a different color
   const similarProducts = await Product.find({
     _id: { $ne: productId }, // Exclude the current product
     name: { $regex: new RegExp(`^${baseName}\\s*\\(`, 'i') }, // Match base name followed by optional space and '('
   }).limit(5);
    res.render("productDetails", {
      userId: req.session.user_id ? req.session.user_id : "",
      productdetails,
      similarProducts,
      sameCategory: sameCategoryProducts
    });
  } catch (error) {
    console.log(error);
  }
};


const loadProfilePage = async (req, res) => {
  try {
    console.log(req.session.user_id);
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const userData = await User.find();

    const userAddresses = user.addresses;

    res.render("profilePage", {
      users: userData,
      user: user,
      userId: req.session.user_id ? req.session.user_id : "",
      userAddresses,
    });
  } catch (error) {
    console.log(error);
  }
};


const loadAddAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    res.render("addAddress", {
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.log(error);
  }
};



const loadTermsandConditions = async (req, res) => {
  try {
    res.render("Teams&condition");
  } catch (error) {
    console.log(error);
  }
};


const loadPrivacyandPolicies = async (req, res) => {
  try {
    res.render("privacy&policy");
  } catch (error) {
    console.log(error);
  }
};


const loadContactUs = async (req, res) => {
  try {
    
    const userId = req.session.user_id;
  
    res.render("contactus", {
      
     
      userId: req.session.user_id ? req.session.user_id : "",
      
    });
  } catch (error) {
    console.log(error);
  }
};



const loadRefundPolicy = async (req, res) => {
  try {
    res.render("refundPolicy");
  } catch (error) {
    console.log(error);
  }
};



const addressAdding = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const {
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country,
      phoneNumber
    } = req.body;

    // Assuming you have a User model with an "addresses" field
    const user = await User.findById(userId);

    // Add the new address to the user's addresses array
    user.addresses.push({
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country,
      phoneNumber
    });
    await user.save();
    // Redirect to the user's profile or address list page
    res.redirect("/profile");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadAddressEdit = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.params.addressId;
    // Check if userId is available
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }
    const user = await User.findById(userId);

    // Check if the user object exists and has the 'addresses' property
    if (!user || !user.addresses) {
      return res.status(404).send("User or addresses not found");
    }
    // Find the address in the user's addresses array based on the provided addressId
    const addressToEdit = user.addresses.id(addressId);

    if (!addressToEdit) {
      return res.status(404).send("Address not found");
    }

    res.render("editAddress", {
      address: addressToEdit,
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const editingAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Ensure userId is available
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const user = await User.findById(userId);

    // Ensure user object exists and has the 'addresses' property
    if (!user || !user.addresses) {
      return res.status(404).send("User or addresses not found");
    }

    const addressId = req.params.addressId;

    // Find the address in the user's addresses array based on the provided addressId
    const addressToEdit = user.addresses.id(addressId);

    if (!addressToEdit) {
      return res.status(404).send("Address not found");
    }

    // Update address properties based on the data from the request body
    addressToEdit.addressType = req.body.addressType;
    addressToEdit.houseNo = req.body.houseNo;
    addressToEdit.street = req.body.street;
    addressToEdit.landmark = req.body.landmark;
    addressToEdit.pincode = req.body.pincode;
    addressToEdit.city = req.body.city;
    addressToEdit.district = req.body.district;
    addressToEdit.state = req.body.state;
    addressToEdit.country = req.body.country;
    addressToEdit.phoneNumber = req.body.phoneNumber;

    // Save the updated user object
    await user.save();

    res.redirect("/profile"); // Redirect to the user's profile page after successful update
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const addressdelete = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.params.addressId;

    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    // Find the user by ID
    const user = await User.findById(userId);

    // Ensure user object exists and has the 'addresses' property
    if (!user || !user.addresses) {
      return res.status(404).send("User or addresses not found");
    }

    // Find the index of the address with the given addressId
    const addressIndex = user.addresses.findIndex(
      (address) => address._id == addressId
    );

    // Check if the address was found
    if (addressIndex === -1) {
      return res.status(404).send("Address not found");
    }

    // Remove the address from the addresses array
    user.addresses.splice(addressIndex, 1);

    // Save the updated user object
    await user.save();

    res.redirect("/profile"); // Redirect to the user's profile page after successful deletion
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadCartPage = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);

    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );

    if (cart) {
      
      cart.items = cart.items.filter((item) => item.product !== null);
      await cart.save();
    }
    res.render("cartPage", {
      cart: cart,
      user: user,
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.log(error);
  }
};

const addToCart = async (req, res) => {
  try {
    const { id } = req.query;
    const user = req.session.user_id;
    const cart = await Cart.findOne({ user: user });
    const product = await Product.findById(id);

    if (!product) {
      res.status(404).json({ message: "Product not Found" });
      return;
    }

    if (cart === null) {
      await Cart.insertMany({
        user: user,
        items: [
          {
            product: new mongoose.Types.ObjectId(id),
            quantity: 1,
          },
        ],
      });
    } else {
      const cartItem = cart.items.find((item) => item?.product + "" === id);

      if (cartItem) {
        // Product is already in the cart, show a different message
        res.status(200).json({
          message: "Product is already in the cart",
          status: false,
          alreadyInCart: true,
        });
        return;
      } else {
        cart.items.push({ product: id, quantity: 1 });
      }
      await cart.save();
    }

    res.status(200).json({ message: "Product added to the Cart", status: true });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error", status: false });
  }
};

const cartRemoveItem = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const productId = req.body.id;

    //find the user id
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      return res.status(404).send("User or cart not found");
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() == productId
    );

    if (itemIndex === -1) {
      return res.status(404).send("Item not found in the cart");
    }

    cart.items.splice(itemIndex, 1);

    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    console.log(error);
    res.status(500).send("internal server error");
  }
};

const cartQuantityInc = async (req, res) => {
  try {
    const userId = req.session.user_id;
    let cart = await Cart.findOne({ user: userId });

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === req.params.id
    );

    // Assuming you have a product model with a 'quantity' field
    const product = await Product.findById(req.params.id);

    // Check if increasing the quantity will exceed the available stock
    if (cart.items[itemIndex].quantity + 1 <= product.quantity) {
      // If not, update the cart
      cart.items[itemIndex].quantity += 1;

      // Save the changes to the parent document (Cart)
      await cart.save();

      res.redirect("/cart");
    } else {
      // If increasing the quantity exceeds the available stock, show an "out of stock" message
      res.redirect("/cart");
    }
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const cartQuantityDec = async (req, res) => {
  try {
    const userId = req.session.user_id;
    let cart = await Cart.findOne({ user: userId });
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === req.params.id
    );

    if (cart.items[itemIndex].quantity === 1) {
      cart.items[itemIndex].quantity = 1;

      res.redirect("/cart");
      return;
    }
    cart.items[itemIndex].quantity -= 1;
    // Save the changes to the parent document (Cart)
    await cart.save();

    res.redirect("/cart");
  } catch (error) {
    console.log(error);
  }
};

const loadCheckout = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const user = await User.findById(userId);
    const cart = await Cart.findOne({ user: user._id }).populate(
      "items.product"
    );


    for (let product of cart.items) {
      const productDetails = product.product;  // Assuming `product.product` gives you the product details
      if (product.quantity > productDetails.quantity) { 
        // If quantity exceeds available stock, redirect back to the cart or reload the page
        return res.status(400).json({ 
          message: `Quantity for ${productDetails.name} exceeds available stock`,
        });
      }
    }
    

    // Calculate orderTotal from the cart
    let orderTotal = 0;
    cart.items.forEach((product) => {
      orderTotal += product.product.price * product.quantity;
    });
    

    res.render("checkoutPage", {
      user,
      cart,
      userId: req.session.user_id ? req.session.user_id : "",
      address: user.addresses,
      orderTotal, 
    });
  } catch (error) {
    console.log(error);
    res.status(500).send("Internal Server Error");
  }
};

const checkoutloadAddressEdit = async (req, res) => {
  try {
    const userId = req.session.user_id;
    const addressId = req.params.addressId;

    // Check if userId is available
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const user = await User.findById(userId);

    // Check if the user object exists and has the 'addresses' property
    if (!user || !user.addresses) {
      return res.status(404).send("User or addresses not found");
    }

    // Find the address in the user's addresses array based on the provided addressId
    const addressToEdit = user.addresses.id(addressId);

    if (!addressToEdit) {
      return res.status(404).send("Address not found");
    }

    res.render("checkoutEditAddress", {
      address: addressToEdit,
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const checkoutEditingAddress = async (req, res) => {
  try {
    const userId = req.session.user_id;

    // Ensure userId is available
    if (!userId) {
      return res.status(401).send("Unauthorized");
    }

    const user = await User.findById(userId);

    // Ensure user object exists and has the 'addresses' property
    if (!user || !user.addresses) {
      return res.status(404).send("User or addresses not found");
    }

    const addressId = req.params.addressId;

    // Find the address in the user's addresses array based on the provided addressId
    const addressToEdit = user.addresses.id(addressId);

    if (!addressToEdit) {
      return res.status(404).send("Address not found");
    }

    // Update address properties based on the data from the request body
    addressToEdit.addressType = req.body.addressType;
    addressToEdit.houseNo = req.body.houseNo;
    addressToEdit.street = req.body.street;
    addressToEdit.landmark = req.body.landmark;
    addressToEdit.pincode = req.body.pincode;
    addressToEdit.city = req.body.city;
    addressToEdit.district = req.body.district;
    addressToEdit.state = req.body.state;
    addressToEdit.country = req.body.country;
    addressToEdit.phoneNumber = req.body.phoneNumber;

    // Save the updated user object
    await user.save();

    res.redirect("/checkout"); // Redirect to the user's checkout page after successful update
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};

const loadcheckoutAddaddress = async (req, res) => {
  try {
    const userId = req.session.user_id;
    res.render("checkoutAddaddress", {
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.log(error);
  }
};

const checkoutaddressAdding = async (req, res) => {
  try {
    const userId = req.session.user_id;

    const {
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country,
      phoneNumber
    } = req.body;

    // Assuming you have a User model with an "addresses" field
    const user = await User.findById(userId);

    // Add the new address to the user's addresses array
    user.addresses.push({
      addressType,
      houseNo,
      street,
      landmark,
      pincode,
      city,
      district,
      state,
      country,
      phoneNumber
    });
    await user.save();

    // Redirect to the user's profile or address list page
    res.redirect("/checkout");
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
};



const createProductOrder = async (req, res) => {
  const { selectedAddressId, paymentMethod, total } = req.body;
  try {
    const cartItems = await Cart.findOne({ user: req.session.user_id });

    for(const item of cartItems.items){
      const product = await Product.findOne({ _id: item.product });
      if (!product || product.quantity < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ${product.name} Go to Cart Page and Remove Item.` });
      }
    }

    let products = [];
    for (const item of cartItems.items) {
      products.push({ product: item.product, quantity: item.quantity });
      const product = await Product.findOne({_id : item.product});
      let quantity = product.quantity - item.quantity

      await Product.findByIdAndUpdate(product._id, {quantity});
    }

    const address = await User.findOne({ _id: req.session.user_id });
   
      
      let Address = address.addresses;
    const order = new Order({
      user: req.session.user_id,
      address: Address,
      paymentMethod,
      products,
      grandTotal: total,
      status: 'Pending', 
    });

    await order.save();

    res.status(201).json({ productOrderId: order._id.toString() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create product order.' });
  }
};



const crypto = require('crypto');
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const verifySignature = (razorpayPaymentId, razorpayOrderId, razorpaySignature) => {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');
  return generatedSignature === razorpaySignature;
};



const placeOrder = async (req, res) => {
  const {productOrderId, total } = req.body;
  

  try {
     
      const options = {
        amount: total * 100, // Amount in paise
        currency: "INR",
        receipt: `order_${productOrderId}`
      };


      razorpay.orders.create(options, (err, order)=> {
        if(err) {
          console.error("Error creating Razorpay order:", err);
        return res.status(500).json({ error: "Failed to create payment order" });
        }

        res.status(201).json({order});
      });
  } catch (error) {
    console.error("Error in placeOrder:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};





const placeOrderRaz = async (req, res) => {
  const { razorpayPaymentId, razorpayOrderId, razorpaySignature,productOrderId  } = req.body;  
  try {
      // Step 1: Verify Razorpay Signature
      if (!verifySignature(razorpayPaymentId, razorpayOrderId, razorpaySignature)) {
        return res.status(400).json({ error: 'Invalid payment signature' });
      }

      const order = await Order.findById(productOrderId);
      order.status = 'Ordered';
      order.OrderIsPaid = true;
      await order.save();
    
    await razorpay.payments.capture(razorpayPaymentId,order.grandTotal*100)

    await Cart.findOneAndDelete({user : req.session.user_id})

     // Set up Nodemailer transporter
     const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "order6xobags@gmail.com", // Sender's email
        pass: "mnea tpif zfjz uovi", // App-specific password
      },
    });

const mailOptions = {
  from: "order6xobags@gmail.com",
  to: "muhammedshereefshaz@gmail.com",
  subject: "New Order Notification",
  html: `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <h2 style="color: #4CAF50;">New Order Placed!</h2>
      <p>Hello Admin,</p>
      <p>A new order has been successfully placed. Below are the details:</p>

      

      <p>Please check the admin dashboard for more details.</p>

      <p style="margin-top: 20px;">Thank you,</p>
      <p><strong>6xobags Team</strong></p>
    </div>
  `,
};

    // Send the email
    await transporter.sendMail(mailOptions);

    // Redirect to the orders page after successfully placing the order
    res.status(201).json({ message: "Order created successfully", order }); // Assuming you send a response back to the client
  } catch (error) {
    console.log(error);
    await razorpay.payments.refund(razorpayPaymentId);
    res.status(500).json({ error: "Failed to process payment. Refund initiated." });

  }
};

const loadOrdersPage = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.session.user_id })
      .populate("products.product")
      .sort({ createdAt: -1 });

    res.render("ordersPage", {
      userId: req.session.user_id ? req.session.user_id : "",
      orders,
    });
  } catch (error) {
    console.log(error);
  }
};




const deleteOrder = async (req, res) => {
  const { orderId } = req.body;
  try {

    const userId = req.session.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    // Convert orderId to ObjectId before querying
    const order = await Order.findOne({ _id: orderId }); 
    
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    for(const item of order.products){
      const product = await Product.findById(item.product);
      if(product){
        product.quantity += item.quantity;
        await product.save()
      }
    }

    // Delete the order from the database
    await Order.findOneAndDelete({ _id: orderId });


    res.status(200).json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Failed to delete the order' });
  }
};


const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const order = await Order.findByIdAndUpdate(
      orderId,
      { status: "Cancelled" },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Iterate through order items and update product stock
    for (const item of order.products) {
      
      
      const product = await Product.findById(item.product);

      item.status="Cancelled"
      item.refundAmount = product.price

      if (product) {
        // Increment the product stock by the canceled quantity
        product.quantity += item.quantity;
        await product.save();
      }
      
    }

    await order.save();

      // Find the user in the session
      const userId = req.session.user_id;
      
      const user = await User.findById(userId);
      
      
      // Send email notification to the admin
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "order6xobags@gmail.com", // Sender's email
        pass: "mnea tpif zfjz uovi", // App password
      },
    });

    const mailOptions = {
      from: "order6xobags@gmail.com",
      to: "muhammedshereefshaz@gmail.com",
      subject: "Order Cancellation Notification",
      html: `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
          <h2 style="color: #FF6347;">Order Cancelled</h2>
          <p>Hello Admin,</p>
          <p>The following order has been cancelled:</p>

          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">Details</th>
                <th style="border: 1px solid #ddd; padding: 8px; text-align: left; background-color: #f4f4f4;">Information</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Order ID</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order._id}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">User ID</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${userId}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Total Amount</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.grandTotal}</td>
              </tr>
              <tr>
                <td style="border: 1px solid #ddd; padding: 8px;">Payment Method</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${order.paymentMethod}</td>
              </tr>
            </tbody>
          </table>

          <p>Please take the necessary actions.</p>

          <p style="margin-top: 20px;">Thank you,</p>
          <p><strong>6xobags Team</strong></p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("Admin cancellation notification sent!");

    // Respond to the client after the stock update is complete
    res.json({ message: "Order cancelled successfully", order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};





const cancelItem = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    const productId = req.params.productId;

    // Fetch the order by ID
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Find the index of the product in the order's products array
    const productIndex = order.products.findIndex(
      (product) => product._id.toString() === productId
    );

    if (productIndex === -1) {
      return res.status(404).json({ message: "Product not found in the order" });
    }

    const product = order.products[productIndex];

    if (product.status === "Cancelled") {
      return res.status(400).json({ message: "Product is already cancelled" });
    }

    // Fetch product details from Product collection
    const productDetails = await Product.findById(product.product);
    if (!productDetails) {
      return res.status(404).json({ message: "Product details not found" });
    }

    const { price } = productDetails;

    // Ensure grandTotal and offerPrice are valid numbers
    if (typeof order.grandTotal !== "number" || isNaN(order.grandTotal)) {
      order.grandTotal = 0; // Default to 0 if invalid
    }

    if (typeof price !== "number" || isNaN(price)) {
      return res.status(400).json({ message: "Invalid offer price" });
    }

    // Update the product status and other fields
    product.status = "Cancelled";
    order.grandTotal -= price; 
    product.refundAmount = price;

    // Update the product stock in the inventory
    if (productDetails) {
      productDetails.quantity += product.quantity;
      await productDetails.save();
    }

        // Check if all products in the order are cancelled
        const allCancelled = order.products.every((p) => p.status === "Cancelled");

        // If all products are cancelled, update the order status to "Cancelled"
        if (allCancelled) {
          order.status = "Cancelled";
        }
    
        // Save the updated order
        await order.save();
   

    res.json({ message: "Item cancelled successfully", order });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const loadUserOrderDetailsPage = async (req, res) => {
  try {
    // const usersData = await User.find({ is_admin: 0 }).sort({ name: 1 });
    const order = await Order.findById(req.query.id)
      .populate("user")
      .populate("products.product");

    res.render("orderDetails", {
      order,
      userId: req.session.user_id ? req.session.user_id : "",
    });
  } catch (error) {
    console.log(error);
  }
};

const searchProduct = async (req, res, next) => {
  try {
    const filter = req.query.q;

    if (filter != "") {
      const regex = new RegExp(filter, "i");
      const products = await Product.find({ name: { $regex: regex } });

      if (products) {
        res.json(products);
      }
    }
  } catch (error) {
    console.log(error);
  }
};


const cartQuantityUpdate = async (req, res) => {
  try {
      const userId = req.session.user_id;
      let cart = await Cart.findOne({ user: userId });
      const itemIndex = cart.items.findIndex(
          (item) => item.product.toString() === req.params.id
      );

      const product = await Product.findById(req.params.id);

      const quantityChange = parseInt(req.query.change);

      if (cart.items[itemIndex].quantity + quantityChange <= product.quantity && cart.items[itemIndex].quantity + quantityChange > 0) {
          cart.items[itemIndex].quantity += quantityChange;
          await cart.save();

          const total = cart.items[itemIndex].quantity * product.price;
          res.json({ success: true, quantity: cart.items[itemIndex].quantity, total });
      } else {
          res.status(400).json({ success: false, message: 'Invalid quantity change' });
      }
  } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};



module.exports = {
  loadRegister,
  insertUser,
  loaddLogin,
  verfiyUser,
  loadHome,
  userLogout,
  loadLogin,
  loadProductDetails,
  loadProfilePage,
  loadAddAddress,
  addressAdding,
  loadAddressEdit,
  editingAddress,
  addressdelete,
  loadCartPage,
  addToCart,
  cartRemoveItem,
  cartQuantityInc,
  cartQuantityDec,
  loadCheckout,
  checkoutloadAddressEdit,
  checkoutEditingAddress,
  loadcheckoutAddaddress,
  checkoutaddressAdding,
  placeOrder,
  placeOrderRaz,
  loadOrdersPage,
  cancelOrder,
  cancelItem,
  loadUserOrderDetailsPage,
  searchProduct,
  cartQuantityUpdate ,
  loadTermsandConditions,
  loadPrivacyandPolicies,
  loadContactUs,
  loadRefundPolicy,
  createProductOrder,
  deleteOrder,
  categoryWiseProducts
};
