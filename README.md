# Techform

Techform - Cyberpunk Ecommerce Platform

A futuristic ecommerce platform specializing in cyberpunk-themed tech gadgets and cybernetic enhancements, featuring a dark, neon-lit aesthetic that immerses users in a dystopian shopping experience.

🎯 Project Overview
Techform (branded as NEXUS TECH) is a complete ecommerce solution with a unique cyberpunk aesthetic. The platform offers a full-featured shopping experience from product browsing to checkout, with a focus on immersive design and seamless user experience.

Target Audience
Tech enthusiasts interested in futuristic gadgets
Cyberpunk culture fans
Gamers and sci-fi enthusiasts
Early adopters of emerging technologies
✨ Features
Complete Ecommerce Platform: Full product catalog, cart, checkout, and order management
Authentication System: JWT-based with complete UI (login/register modals)
Product Catalog: Advanced search, filtering, and detail views
Shopping Cart: Dual storage with real-time synchronization
Enhanced Cart UI: Comprehensive modal with tax calculation, shipping estimates, and sync status
Checkout System: Multi-step checkout with order placement and validation
Order Management: Complete order history, tracking, and status updates
Email Notifications: Order confirmations and status updates with cyberpunk templates
Modular Frontend: ES6 class architecture with event-driven communication
Cyberpunk Theme: Consistent neon styling throughout
Responsive Design: Mobile-first approach with touch-friendly interactions
🛠️ Technology Stack
Backend
Express.js: Lightweight, flexible Node.js web framework
SQLite: Embedded database for development and small-to-medium scale deployment
JWT: Stateless authentication for API-first architecture
bcrypt: Industry standard for password hashing
Frontend
Vanilla HTML/CSS/JS: No framework overhead, direct control over styling
ES6 Classes: Modular component system with event-driven architecture
Custom CSS: Cyberpunk-themed design system with responsive layouts

# Installation
Prerequisites
Node.js (v16.0.0 or higher)
npm (comes with Node.js)

Setup
git clone https://github.com/yourusername/techform.git
cd techform

Install dependencies
git clone https://github.com/yourusername/techform.gitcd techform
npm install

1.
Set up environment variables
cp .env.example .env
# Edit .env with your configuration

1.
Set up the database
npm run db:setup

1.
Start the development server
npm run dev

1.
Visit http://localhost:3000 in your browser

🚀 Usage
Available Scripts
npm start - Start the production server
npm run dev - Start the development server with hot reloading
npm test - Run the test suite
npm run test:watch - Run tests in watch mode
npm run db:migrate - Run database migrations
npm run db:seed - Seed the database with sample data
npm run db:setup - Run migrations and seed data
npm run db:reset - Reset the database
🏗️ Project Structure
PlainText



├── backend/               # Backend code│   ├── config/           # Configuration files│   ├── database/         # Database schema, migrations, seeds│   ├── middleware/       # Express middleware│   ├── models/           # Data models│   ├── routes/           # API route handlers│   ├── tests/            # Backend tests│   ├── utils/            # Utility functions│   └── server.js         # Main application entry├── docs/                 # Documentation├── js/                   # Frontend JavaScript modules│   ├── ApiClient.js      # API communication│   ├── CartManager.js    # Shopping cart operations│   ├── CheckoutManager.js # Checkout process│   ├── EnhancedCartModal.js # Cart UI│   ├── NotificationManager.js # User notifications│   ├── ProductManager.js # Product display and search│   └── UserManager.js    # Authentication and user profile├── tests/                # Frontend tests├── uploads/              # Uploaded files├── index.html           # Main HTML file├── script.js            # Main JavaScript file└── styles.css           # Main CSS file
📊 Database Schema
The application uses SQLite with the following main tables:

users - User accounts and authentication
products - Product catalog with inventory
carts - Shopping carts for users and guests
cart_items - Items in shopping carts
orders - Customer orders with status tracking
order_items - Items in customer orders
🔌 API Endpoints
The application provides a RESTful API with the following main endpoints:

/api/auth - Authentication and user management
/api/products - Product catalog and search
/api/cart - Shopping cart operations
/api/orders - Order processing and history
For detailed API documentation, see API Documentation.

🧪 Testing
The project includes comprehensive test coverage for both backend and frontend:

Bash



Run
# Run all testsnpm test# Run backend tests onlynpm run test:backend# Run frontend tests onlynpm run test:frontend
🤝 Contributing
Contributions are welcome! Please follow these steps:

1.
Fork the repository
2.
Create a feature branch (git checkout -b feature/amazing-feature)
3.
Commit your changes (git commit -m 'Add some amazing feature')
4.
Push to the branch (git push origin feature/amazing-feature)
5.
Open a Pull Request
📝 License
This project is licensed under the MIT License - see the LICENSE file for details.

🔮 Future Development
Upcoming features planned for development:

1.
Admin Dashboard: Comprehensive admin interface
2.
Inventory Management System: Automatic tracking and alerts
3.
Payment Integration: Stripe/PayPal integration
4.
Shipping Integration: Real-time shipping rates and tracking
5.
Advanced Analytics: Sales reporting and customer insights
