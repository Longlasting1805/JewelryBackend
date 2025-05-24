import orderModel from "../models/orderModel.js"
import userModel from "../models/userModel.js"
import Stripe from "stripe"
import Flutterwave from 'flutterwave-node-v3';
import dotenv from 'dotenv';
import axios from "axios";

// global variables
const currency = 'USD'
const deliveryCharge = 10

dotenv.config();

// Gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2022-11-15'})

//  placing orders using cod method
const placeOrder = async (req, res) => {

    try {
        const { userId, items, amount, address } = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "cod",
            payment: false,
            date: Date.now()

        }

        const newOrder = new orderModel(orderData)

        await newOrder.save()

        await userModel.findByIdAndUpdate(userId, {cartData:{}})

        res.json({ success: true, message: "order placed"})

        
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
        
    }
    
}

//  placing orders using flutterwave method
// Payment method
const placeOrderFlutterwave = async (req, res) => {
    try {
      const { userId, items, amount, address } = req.body;
      const { origin } = req.headers;

      const email = address.email;
      const name = `${address.firstName} ${address.lastName}`;
  
      const orderData = {
        userId,
        items,
        address,
        amount,
        paymentMethod: "Flutterwave",
        payment: false,
        date: Date.now(),
      };
  
      const newOrder = new orderModel(orderData);
      await newOrder.save();
  
      const tx_ref = `jewel_tx_${Date.now()}`;
  
      const response = await axios.post(
        "https://api.flutterwave.com/v3/payments",
        {
          tx_ref,
          amount,
          currency: currency,
          redirect_url: `${origin}/verify?orderId=${newOrder._id}`,
          payment_options: "card",
          customer: {
            email,
            name
          },
          customizations: {
            title: "JewelMint",
            description: "Payment for jewelry order",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
  
      res.json({ success: true, paymentLink: response.data.data.link });
  
    } catch (error) {
      console.error(error?.response?.data || error.message);
      res.json({
        success: false,
        message: error?.response?.data?.message || error.message,
      });
    }
  };
  
//  placing orders using stripe method
const placeOrderStripe = async (req, res) => {
    try {
        const { userId, items, amount, address } = req.body
        const { origin } = req.headers

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod: "Stripe",
            payment: false,
            date: Date.now()

        }

        const newOrder = new orderModel(orderData)

        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency: currency,
                product_data: {
                    name: item.name
                },
                unit_amount: item.price * 100
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency: currency,
                product_data: {
                    name: 'Delivery charges'
                },
                unit_amount: deliveryCharge * 100
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url: `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment'
        })

        res.json({ success:true, session_url:session.url})

    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
        
    }
}
// 
const verifyStripe = async (req, res) => {
    const { orderId, success, userId } = req.body
    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, {payment:true})
            await userModel.findByIdAndUpdate(userId, {cartData: {}})
            res.json({success:true})
            
        }else{
            await orderModel.findByIdAndDelete(orderId)
            res.json({success:false})
        }
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
        
    }
    
}

const verifyFlutterwave = async (req, res) => {
    const { transactionId, orderId } = req.body;
  
    try {
      const verifyUrl = `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`;
  
      const { data } = await axios.get(verifyUrl, {
        headers: {
          Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
        },
      });
  
      const paymentStatus = data?.data?.status;
  
      if (paymentStatus === "successful") {
        await orderModel.findByIdAndUpdate(orderId, { payment: true });
  
        // optional: clear user's cart
        const userId = data?.data?.meta?.userId; // If you passed this in meta (or pull from JWT token)
        if (userId) {
          await userModel.findByIdAndUpdate(userId, { cartData: {} });
        }
  
        return res.json({ success: true });
      } else {
        await orderModel.findByIdAndDelete(orderId);
        return res.json({ success: false, message: "Payment not successful" });
      }
    } catch (error) {
      console.error(error?.response?.data || error.message);
      return res.json({
        success: false,
        message: error?.response?.data?.message || error.message,
      });
    }
  };

// All orders data for admin panel
const allOrders = async (req, res) => {

    try {
        const orders = await orderModel.find({})
        res.json({success: true, orders})
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
        
    }
    
}

// user Order for data frontend
const userOrders = async (req, res) => {
    try {
        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({ success: true, orders})
    } catch (error) {
        console.log(error);
        res.json({success:false, message: error.message})
    }
    
}

// update order status from admin panel
const updateStatus = async (req, res) => {
    try {
        
        const { orderId, status } = req.body

        await orderModel.findByIdAndUpdate(orderId, { status })
        res.json({success: true, message: 'status updated'})

    } catch (error) {
        console.log(error);
        res.json({success:false, message:error.message})
        
        
    }
    
}

export {verifyStripe, verifyFlutterwave,placeOrder, placeOrderFlutterwave, placeOrderStripe, allOrders, userOrders, updateStatus}
