/**
 * Notification Service
 * Handles SMS and Email notifications for patients and staff
 */

interface NotificationMessage {
  to: string;
  message: string;
  type: 'sms' | 'email';
  subject?: string;
}

interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

class NotificationService {
  /**
   * Send SMS notification
   */
  async sendSMS(phoneNumber: string, message: string): Promise<NotificationResult> {
    try {
      console.log('📱 Sending SMS to:', phoneNumber);
      console.log('📱 Message:', message);
      
      // TODO: Implement actual SMS service (Twilio, AWS SNS, etc.)
      // For now, we'll log the message
      
      // Example Twilio implementation:
      /*
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const client = require('twilio')(accountSid, authToken);
      
      const result = await client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber
      });
      
      return {
        success: true,
        messageId: result.sid
      };
      */
      
      // Simulated success for now
      return {
        success: true,
        messageId: `sms_${Date.now()}`
      };
      
    } catch (error) {
      console.error('❌ SMS sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'SMS sending failed'
      };
    }
  }

  /**
   * Send email notification
   */
  async sendEmail(email: string, subject: string, message: string): Promise<NotificationResult> {
    try {
      console.log('📧 Sending email to:', email);
      console.log('📧 Subject:', subject);
      console.log('📧 Message:', message);
      
      // TODO: Implement actual email service (SendGrid, AWS SES, etc.)
      
      // Example SendGrid implementation:
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      const msg = {
        to: email,
        from: process.env.FROM_EMAIL,
        subject: subject,
        text: message,
        html: `<p>${message.replace(/\n/g, '<br>')}</p>`
      };
      
      const result = await sgMail.send(msg);
      
      return {
        success: true,
        messageId: result[0].headers['x-message-id']
      };
      */
      
      // Simulated success for now
      return {
        success: true,
        messageId: `email_${Date.now()}`
      };
      
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Email sending failed'
      };
    }
  }

  /**
   * Send shipping notification to patient
   */
  async sendShippingNotification(lead: any, status: string, trackingNumber?: string): Promise<void> {
    try {
      let message = '';
      let subject = '';
      
      switch (status) {
        case 'SHIPPED':
          subject = 'Your Test Kit is On the Way!';
          message = `Hi ${lead.firstName},\n\nYour medical test kit has been shipped and is on its way to you.\n\n`;
          if (trackingNumber) {
            message += `Tracking Number: ${trackingNumber}\n`;
            message += `You can track your package at: https://www.ups.com/track?tracknum=${trackingNumber}\n\n`;
          }
          message += `Please expect delivery within 3-5 business days.\n\nThank you,\nHealthcare Testing Lab`;
          break;
          
        case 'DELIVERED':
          subject = 'Your Test Kit Has Been Delivered';
          message = `Hi ${lead.firstName},\n\nYour medical test kit has been delivered to your address.\n\n`;
          message += `Please complete the test as instructed and return it using the prepaid return label included in the package.\n\n`;
          message += `If you have any questions, please contact our support team.\n\nThank you,\nHealthcare Testing Lab`;
          break;
          
        case 'KIT_RETURNING':
          subject = 'Test Kit Return Received';
          message = `Hi ${lead.firstName},\n\nWe have received your completed test kit and it is being processed by our lab.\n\n`;
          message += `You will receive your results within 5-7 business days.\n\nThank you,\nHealthcare Testing Lab`;
          break;
          
        case 'KIT_COMPLETED':
          subject = 'Test Results Available';
          message = `Hi ${lead.firstName},\n\nYour test results are now available.\n\n`;
          message += `Please contact your healthcare provider to review your results.\n\nThank you,\nHealthcare Testing Lab`;
          break;
          
        default:
          return; // No notification for this status
      }
      
      // Send SMS notification
      const cleanPhone = lead.phone.replace(/\D/g, '');
      if (cleanPhone.length === 10) {
        const formattedPhone = `+1${cleanPhone}`;
        await this.sendSMS(formattedPhone, message);
      }
      
      // Send email notification if email exists
      if (lead.email) {
        await this.sendEmail(lead.email, subject, message);
      }
      
    } catch (error) {
      console.error('❌ Shipping notification failed:', error);
    }
  }

  /**
   * Send staff notification
   */
  async sendStaffNotification(type: string, message: string, staffEmails: string[]): Promise<void> {
    try {
      const subject = `Healthcare CRM: ${type}`;
      
      for (const email of staffEmails) {
        await this.sendEmail(email, subject, message);
      }
      
    } catch (error) {
      console.error('❌ Staff notification failed:', error);
    }
  }

  /**
   * Send exception alert
   */
  async sendExceptionAlert(lead: any, exception: string, trackingNumber: string): Promise<void> {
    try {
      const subject = 'Shipping Exception Alert';
      const message = `SHIPPING EXCEPTION ALERT\n\n` +
        `Patient: ${lead.firstName} ${lead.lastName}\n` +
        `Lead ID: ${lead.id}\n` +
        `Tracking Number: ${trackingNumber}\n` +
        `Exception: ${exception}\n\n` +
        `Please review and take appropriate action.\n\n` +
        `Healthcare CRM System`;
      
      // Send to admin/collections team
      const adminEmails = ['admin@healthcare.com', 'collections@healthcare.com'];
      await this.sendStaffNotification('Shipping Exception', message, adminEmails);
      
    } catch (error) {
      console.error('❌ Exception alert failed:', error);
    }
  }

  /**
   * Validate notification configuration
   */
  async validateConfiguration(): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check if required environment variables are set
      // This would check for SMS/Email service credentials
      console.log('📧 Notification service ready (logging mode)');
      return { valid: true };
      
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Notification configuration validation failed' 
      };
    }
  }
}

export const notificationService = new NotificationService();
export type { NotificationMessage, NotificationResult }; 