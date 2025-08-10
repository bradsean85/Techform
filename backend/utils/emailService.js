/**
 * Email Service for order notifications
 * In a production environment, this would integrate with services like SendGrid, AWS SES, etc.
 */

class EmailService {
  constructor() {
    this.enabled = process.env.EMAIL_ENABLED === 'true';
    this.fromEmail = process.env.FROM_EMAIL || 'noreply@nexustech.com';
  }

  /**
   * Send order confirmation email
   */
  async sendOrderConfirmation(user, order) {
    if (!this.enabled) {
      console.log('Email service disabled - Order confirmation email would be sent to:', user.email);
      return { success: true, message: 'Email service disabled' };
    }

    try {
      const emailContent = this.generateOrderConfirmationEmail(user, order);
      
      // In production, integrate with actual email service
      console.log('Sending order confirmation email to:', user.email);
      console.log('Email content:', emailContent);
      
      // Simulate email sending
      await this.simulateEmailSending();
      
      return { success: true, message: 'Order confirmation email sent' };
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(user, order, previousStatus) {
    if (!this.enabled) {
      console.log('Email service disabled - Order status update email would be sent to:', user.email);
      return { success: true, message: 'Email service disabled' };
    }

    try {
      const emailContent = this.generateOrderStatusUpdateEmail(user, order, previousStatus);
      
      console.log('Sending order status update email to:', user.email);
      console.log('Email content:', emailContent);
      
      await this.simulateEmailSending();
      
      return { success: true, message: 'Order status update email sent' };
    } catch (error) {
      console.error('Failed to send order status update email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Send shipping notification email
   */
  async sendShippingNotification(user, order) {
    if (!this.enabled) {
      console.log('Email service disabled - Shipping notification would be sent to:', user.email);
      return { success: true, message: 'Email service disabled' };
    }

    try {
      const emailContent = this.generateShippingNotificationEmail(user, order);
      
      console.log('Sending shipping notification email to:', user.email);
      console.log('Email content:', emailContent);
      
      await this.simulateEmailSending();
      
      return { success: true, message: 'Shipping notification email sent' };
    } catch (error) {
      console.error('Failed to send shipping notification email:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate order confirmation email content
   */
  generateOrderConfirmationEmail(user, order) {
    const shippingAddress = typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress;

    const itemsList = order.items.map(item => `
      <tr>
        <td>${item.product?.name || 'Product'}</td>
        <td>${item.quantity}</td>
        <td>$${item.price.toFixed(2)}</td>
        <td>$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    return {
      to: user.email,
      from: this.fromEmail,
      subject: `Order Confirmation - NEXUS TECH #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Confirmation</title>
          <style>
            body { font-family: 'Arial', sans-serif; background: #1a1a2e; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(45deg, #00e5ff, #ff6f00); padding: 20px; text-align: center; }
            .content { background: #16213e; padding: 30px; }
            .order-details { background: rgba(0, 229, 255, 0.1); padding: 20px; margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid rgba(0, 229, 255, 0.3); }
            th { background: rgba(0, 229, 255, 0.2); color: #00e5ff; }
            .total { font-size: 1.2em; font-weight: bold; color: #ff6f00; }
            .footer { text-align: center; padding: 20px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 NEXUS TECH</h1>
              <h2>Order Confirmation</h2>
            </div>
            
            <div class="content">
              <p>Hello ${user.firstName},</p>
              
              <p>Thank you for your order! We've received your order and are processing it now.</p>
              
              <div class="order-details">
                <h3>Order Details</h3>
                <p><strong>Order Number:</strong> #${order.id}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${order.status.toUpperCase()}</p>
              </div>
              
              <h3>Items Ordered</h3>
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Price</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsList}
                </tbody>
              </table>
              
              <div class="total">
                <p>Total Amount: $${order.totalAmount.toFixed(2)}</p>
              </div>
              
              <h3>Shipping Address</h3>
              <div class="order-details">
                <p>${shippingAddress.firstName} ${shippingAddress.lastName}</p>
                <p>${shippingAddress.street}</p>
                <p>${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}</p>
                <p>${shippingAddress.country}</p>
              </div>
              
              <p>We'll send you another email when your order ships.</p>
              
              <p>Thanks for choosing NEXUS TECH!</p>
            </div>
            
            <div class="footer">
              <p>NEXUS TECH - Interface with tomorrow's technology today</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Generate order status update email content
   */
  generateOrderStatusUpdateEmail(user, order, previousStatus) {
    const statusMessages = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      processing: 'Your order is currently being processed.',
      shipped: 'Great news! Your order has been shipped.',
      delivered: 'Your order has been delivered. We hope you enjoy your purchase!',
      cancelled: 'Your order has been cancelled.'
    };

    const message = statusMessages[order.status] || 'Your order status has been updated.';

    return {
      to: user.email,
      from: this.fromEmail,
      subject: `Order Update - NEXUS TECH #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Status Update</title>
          <style>
            body { font-family: 'Arial', sans-serif; background: #1a1a2e; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(45deg, #00e5ff, #ff6f00); padding: 20px; text-align: center; }
            .content { background: #16213e; padding: 30px; }
            .status-update { background: rgba(0, 229, 255, 0.1); padding: 20px; margin: 20px 0; text-align: center; }
            .status-badge { display: inline-block; padding: 10px 20px; background: #00e5ff; color: #1a1a2e; font-weight: bold; text-transform: uppercase; }
            .footer { text-align: center; padding: 20px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 NEXUS TECH</h1>
              <h2>Order Status Update</h2>
            </div>
            
            <div class="content">
              <p>Hello ${user.firstName},</p>
              
              <div class="status-update">
                <h3>Order #${order.id}</h3>
                <div class="status-badge">${order.status}</div>
                <p>${message}</p>
                ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
              </div>
              
              <p>You can track your order status anytime by logging into your account.</p>
              
              <p>Thank you for choosing NEXUS TECH!</p>
            </div>
            
            <div class="footer">
              <p>NEXUS TECH - Interface with tomorrow's technology today</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Generate shipping notification email content
   */
  generateShippingNotificationEmail(user, order) {
    return {
      to: user.email,
      from: this.fromEmail,
      subject: `Your Order Has Shipped - NEXUS TECH #${order.id}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Order Shipped</title>
          <style>
            body { font-family: 'Arial', sans-serif; background: #1a1a2e; color: #fff; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(45deg, #00e5ff, #ff6f00); padding: 20px; text-align: center; }
            .content { background: #16213e; padding: 30px; }
            .shipping-info { background: rgba(0, 229, 255, 0.1); padding: 20px; margin: 20px 0; }
            .tracking-number { font-size: 1.2em; font-weight: bold; color: #ff6f00; text-align: center; padding: 15px; background: rgba(255, 111, 0, 0.1); }
            .footer { text-align: center; padding: 20px; color: #888; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🤖 NEXUS TECH</h1>
              <h2>Your Order Has Shipped!</h2>
            </div>
            
            <div class="content">
              <p>Hello ${user.firstName},</p>
              
              <p>Great news! Your order #${order.id} has been shipped and is on its way to you.</p>
              
              ${order.trackingNumber ? `
                <div class="shipping-info">
                  <h3>Tracking Information</h3>
                  <div class="tracking-number">
                    Tracking Number: ${order.trackingNumber}
                  </div>
                  <p>You can use this tracking number to monitor your package's progress.</p>
                </div>
              ` : ''}
              
              <p>Your order should arrive within 3-5 business days.</p>
              
              <p>Thank you for choosing NEXUS TECH!</p>
            </div>
            
            <div class="footer">
              <p>NEXUS TECH - Interface with tomorrow's technology today</p>
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };
  }

  /**
   * Simulate email sending delay
   */
  async simulateEmailSending() {
    return new Promise(resolve => {
      setTimeout(resolve, 100); // Simulate network delay
    });
  }
}

module.exports = EmailService;