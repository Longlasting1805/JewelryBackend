import express from 'express'
import {placeOrder, placeOrderFlutterwave, placeOrderStripe, allOrders, userOrders, updateStatus, verifyStripe, verifyFlutterwave} from '../controllers/orderController.js' 
import adminAuth from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js'


const orderRouter = express.Router()

// admin features
orderRouter.post('/list', adminAuth, allOrders)
orderRouter.post('/status', adminAuth, updateStatus)

// payment features
orderRouter.post('/place', authUser, placeOrder)
orderRouter.post('/stripe', authUser, placeOrderStripe)
orderRouter.post('/flutterwave', authUser, placeOrderFlutterwave)

// user feature
orderRouter.post('/userorders', authUser, userOrders)

// verify payment
orderRouter.post('/verifyStripe', authUser, verifyStripe)
orderRouter.post('/verifyFlutterwave', authUser, verifyFlutterwave)



export default orderRouter;