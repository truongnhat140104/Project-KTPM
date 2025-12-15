# TOMATO - Food Ordering Website

This repository hosts the source code for TOMATO, a dynamic food ordering website built with the MERN Stack. It offers a user-friendly platform for seamless online food ordering.

## Demo
* User Panel : https://frontend-deploy-8yh2.onrender.com
* Admin Panel : https://admin-deploy-4xtl.onrender.com
* Backend : https://backend-deploy-zk5w.onrender.com

## Features
* User Panel
* Admin Panel
* JWT Authentication
* Password Hashing with Bcrypt
* Stripe Payment Integration
* Login/Signup
* Logout
* Add to Cart
* Place Order
* Order Management
* Products Management
* Filter Food Products
* Login/Signup
* Authenticated APIs
* REST APIs

## Screenshots
* Home Section
![Home Section](https://github.com/user-attachments/assets/1deafee8-01f3-4806-81cf-909cdc7264eb)
*  Login Pupup Section
![Login Section](https://github.com/user-attachments/assets/9180fee4-9899-41f5-9686-b875e3ada08a)
* Cart Section
![Cart Section](https://github.com/user-attachments/assets/c8bc87a3-0a9a-40e6-af94-0ede510486ab)
* Menu Section
![Cart Section](https://github.com/user-attachments/assets/7187179b-ec3a-4543-9260-d3996cb40065)

## Run on Localhost
Clone the project 
```bash
    git clone https://github.com/realtynh/fast_food_delivery_Ecommerce_CI_CD_Three_Tier_System.git
```
Go to the project directory
```bash
    cd Fast_Food_Delivery
```
Install dependencies (frontend)
```bash
    cd frontend
    npm install
```
Install dependencies (admin)
```bash
    cd admin
    npm install
```
Install dependencies (backend)
```bash
    cd backend
    npm install
```
Setup Environment Vaiables
```bash
  JWT_SECRET=YOUR_SECRET_TEXT
  MONGO_URL=YOUR_DATABASE_URL
  STRIPE_SECRET_KEY=YOUR_KEY
```
Setup the Frontend and Backend URL
* App.jsx in Admin folder const url = YOUR_BACKEND_URL
* StoreContext.js in Frontend folder const url = YOUR_BACKEND_URL
* orderController in Backend folder const frontend_url = YOUR_FRONTEND_URL

Start the Backend server
```bash
    nodemon server.js
```
Start the Frontend server
```bash
    npm run dev
```
Start the Backend server
```bash
    npm run dev
```
# Tech Stack
* [React](https://react.dev/)
* [Nodejs](https://nodejs.org/en)
* [ExpressJs](https://expressjs.com/)
* [Mongodb](https://www.mongodb.com/)
* [Stripe](https://stripe.com/)
* [JWT-Authentication](https://www.jwt.io/introduction)
* [Multer](https://www.npmjs.com/package/multer)

# Deployment
The application is deployed on Render.


