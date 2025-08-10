const bcrypt = require('bcrypt');
const database = require('../config/database');
const { Product, User } = require('../models');

const sampleProducts = [
  {
    name: "Neural Interface Headset",
    description: "Advanced brain-computer interface for direct neural connectivity",
    price: 2499.99,
    category: "neural-tech",
    icon: "🧠",
    images: JSON.stringify(["/images/neural-headset-1.jpg", "/images/neural-headset-2.jpg"]),
    specifications: JSON.stringify({
      "Bandwidth": "10 Gbps",
      "Latency": "< 1ms",
      "Compatibility": "All major OS",
      "Battery Life": "24 hours"
    }),
    inventory: 15
  },
  {
    name: "Quantum Processor Core",
    description: "Next-generation quantum computing processor for enhanced performance",
    price: 4999.99,
    category: "processors",
    icon: "⚡",
    images: JSON.stringify(["/images/quantum-core-1.jpg", "/images/quantum-core-2.jpg"]),
    specifications: JSON.stringify({
      "Qubits": "128",
      "Clock Speed": "5.2 GHz",
      "Architecture": "Quantum Hybrid",
      "Power Consumption": "95W"
    }),
    inventory: 8
  },
  {
    name: "Holographic Display Matrix",
    description: "3D holographic display system with gesture control",
    price: 1899.99,
    category: "displays",
    icon: "📺",
    images: JSON.stringify(["/images/holo-display-1.jpg", "/images/holo-display-2.jpg"]),
    specifications: JSON.stringify({
      "Resolution": "8K x 4K",
      "Refresh Rate": "120 Hz",
      "Viewing Angle": "360°",
      "Gesture Recognition": "Yes"
    }),
    inventory: 12
  },
  {
    name: "Cybernetic Arm Enhancement",
    description: "Prosthetic arm with enhanced strength and precision control",
    price: 15999.99,
    category: "cybernetics",
    icon: "🦾",
    images: JSON.stringify(["/images/cyber-arm-1.jpg", "/images/cyber-arm-2.jpg"]),
    specifications: JSON.stringify({
      "Strength Multiplier": "10x",
      "Precision": "0.1mm",
      "Battery Life": "72 hours",
      "Material": "Titanium Alloy"
    }),
    inventory: 3
  },
  {
    name: "Data Storage Implant",
    description: "Subcutaneous data storage device with biometric security",
    price: 899.99,
    category: "storage",
    icon: "💾",
    images: JSON.stringify(["/images/data-implant-1.jpg", "/images/data-implant-2.jpg"]),
    specifications: JSON.stringify({
      "Capacity": "10 TB",
      "Transfer Rate": "1 GB/s",
      "Security": "Biometric Lock",
      "Biocompatibility": "Grade A"
    }),
    inventory: 25
  },
  {
    name: "Augmented Reality Contacts",
    description: "Smart contact lenses with AR overlay and eye tracking",
    price: 1299.99,
    category: "ar-vr",
    icon: "👁️",
    images: JSON.stringify(["/images/ar-contacts-1.jpg", "/images/ar-contacts-2.jpg"]),
    specifications: JSON.stringify({
      "Display Resolution": "4K per eye",
      "Field of View": "120°",
      "Battery Life": "16 hours",
      "Eye Tracking": "Yes"
    }),
    inventory: 20
  },
  {
    name: "Neon Pulse Gaming Rig",
    description: "High-performance gaming system with RGB liquid cooling",
    price: 3499.99,
    category: "gaming",
    icon: "🎮",
    images: JSON.stringify(["/images/gaming-rig-1.jpg", "/images/gaming-rig-2.jpg"]),
    specifications: JSON.stringify({
      "CPU": "Intel i9-13900K",
      "GPU": "RTX 4090",
      "RAM": "32GB DDR5",
      "Storage": "2TB NVMe SSD"
    }),
    inventory: 5
  },
  {
    name: "Biometric Security Scanner",
    description: "Advanced multi-modal biometric authentication device",
    price: 799.99,
    category: "security",
    icon: "🔒",
    images: JSON.stringify(["/images/bio-scanner-1.jpg", "/images/bio-scanner-2.jpg"]),
    specifications: JSON.stringify({
      "Scan Types": "Fingerprint, Iris, Voice",
      "Accuracy": "99.9%",
      "Response Time": "< 0.5s",
      "Connectivity": "USB-C, Wireless"
    }),
    inventory: 18
  },
  {
    name: "Plasma Energy Cell",
    description: "Compact fusion-powered energy storage unit",
    price: 2199.99,
    category: "power",
    icon: "⚡",
    images: JSON.stringify(["/images/plasma-cell-1.jpg", "/images/plasma-cell-2.jpg"]),
    specifications: JSON.stringify({
      "Capacity": "50 kWh",
      "Output": "10 kW continuous",
      "Lifespan": "20 years",
      "Safety Rating": "Class A+"
    }),
    inventory: 7
  },
  {
    name: "Synthetic Skin Patch",
    description: "Self-healing synthetic skin with haptic feedback",
    price: 1599.99,
    category: "cybernetics",
    icon: "🧬",
    images: JSON.stringify(["/images/skin-patch-1.jpg", "/images/skin-patch-2.jpg"]),
    specifications: JSON.stringify({
      "Material": "Bio-compatible polymer",
      "Sensitivity": "Human-level touch",
      "Self-repair": "Yes",
      "Integration": "Neural interface ready"
    }),
    inventory: 12
  }
];

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');
    
    // Connect to database
    await database.connect();
    
    // Create admin user using User model
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@cyberpunk-store.com';
    const existingAdmin = await User.findByEmail(adminEmail);
    
    if (!existingAdmin) {
      const adminUser = await User.create({
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || 'admin123',
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true
      });
      console.log('✓ Admin user created:', adminUser.email);
    } else {
      console.log('✓ Admin user already exists:', existingAdmin.email);
    }
    
    // Create a test customer user
    const customerEmail = 'customer@test.com';
    const existingCustomer = await User.findByEmail(customerEmail);
    
    if (!existingCustomer) {
      const customerUser = await User.create({
        email: customerEmail,
        password: 'customer123',
        firstName: 'Test',
        lastName: 'Customer',
        phone: '+1-555-0123',
        isAdmin: false
      });
      console.log('✓ Test customer created:', customerUser.email);
    } else {
      console.log('✓ Test customer already exists:', existingCustomer.email);
    }
    
    // Insert sample products using Product model
    let createdCount = 0;
    let existingCount = 0;
    
    for (const productData of sampleProducts) {
      // Check if product already exists
      const existingProducts = await Product.findAll({ search: productData.name });
      const exists = existingProducts.some(p => p.name === productData.name);
      
      if (!exists) {
        const product = new Product({
          name: productData.name,
          description: productData.description,
          price: productData.price,
          category: productData.category,
          icon: productData.icon,
          images: productData.images,
          specifications: productData.specifications,
          inventory: productData.inventory,
          isActive: true
        });
        
        await product.save();
        createdCount++;
        console.log(`✓ Created product: ${product.name}`);
      } else {
        existingCount++;
        console.log(`- Product already exists: ${productData.name}`);
      }
    }
    
    console.log(`\nSeeding Summary:`);
    console.log(`- Products created: ${createdCount}`);
    console.log(`- Products already existed: ${existingCount}`);
    console.log(`- Total products in catalog: ${createdCount + existingCount}`);
    
    // Display inventory summary
    const allProducts = await Product.findAll({ isActive: true });
    const totalInventory = allProducts.reduce((sum, p) => sum + p.inventory, 0);
    console.log(`- Total inventory items: ${totalInventory}`);
    
    console.log('\nDatabase seeding completed successfully!');
    
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await database.close();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase };